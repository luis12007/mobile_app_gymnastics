import { importFoldersFromUri } from './folderImportExport';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
// Zip library (native). Use require to avoid runtime errors if not installed in plain JS env
const zipLib: any = (() => {
  try { return require('react-native-zip-archive'); } catch (e) { return null; }
})();
const rnZip: ((source: string, target: string) => Promise<string>) | null = zipLib ? zipLib.zip : null;
const rnUnzip: ((source: string, target: string) => Promise<string>) | null = zipLib ? zipLib.unzip : null;

import { db, Folder, Competition, Gymnast, GymnastImage, WhiteboardTrace, normalizeDisplayOrderInFolder } from './database';

// Lightweight types for progress reporting
export type ProgressCallback = (pct: number, message: string) => void;

function stripFileProtocol(p: string): string {
  if (!p) return p;
  return p.startsWith('file://') ? p.replace(/^file:\/\//, '') : p;
}

function ensureFsUri(p: string): string {
  if (!p) return p;
  return p.startsWith('file://') ? p : `file://${p}`;
}

async function ensureDir(dir: string) {
  try { await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); } catch (e) { /* ignore */ }
}

// ------------------ Streaming / incremental JSON helpers (from legacy) ------------------
function* parseObjectsArrayString(arrStr: string): Generator<any> {
  const len = arrStr.length;
  let i = 0;
  while (i < len) {
    while (i < len) {
      const ch = arrStr[i];
      if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t' || ch === ',') i++;
      else break;
    }
    if (i >= len) break;

    if (arrStr[i] !== '{') {
      const next = arrStr.indexOf('{', i);
      if (next === -1) break;
      i = next;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    let j = i;
    for (; j < len; j++) {
      const c = arrStr[j];
      if (inString) {
        if (escaped) { escaped = false; }
        else if (c === '\\') { escaped = true; }
        else if (c === '"') { inString = false; }
      } else {
        if (c === '"') { inString = true; }
        else if (c === '{') { depth++; }
        else if (c === '}') {
          depth--;
          if (depth === 0) { j++; break; }
        }
      }
    }

    if (j > i) {
      const objStr = arrStr.slice(i, j);
      try {
        const parsed = JSON.parse(objStr);
        yield parsed;
      } catch (e) {
        throw e;
      }
      i = j;
    } else break;
  }
}

function* iterateTopLevelFolderObjects(fileContent: string): IterableIterator<any> {
  const s = fileContent.trim();

  // NDJSON heuristic
  if (!s.startsWith('{') && s.indexOf('\n') !== -1 && s.split('\n').every(line => line.trim() === '' || line.trim().startsWith('{'))) {
    for (const line of s.split(/\r?\n/)) {
      const t = line.trim(); if (!t) continue; yield JSON.parse(t);
    }
    return;
  }

  if (s.startsWith('[')) {
    const inner = s.slice(1, s.length - 1);
    yield* parseObjectsArrayString(inner);
    return;
  }

  if (s.startsWith('{')) {
    const foldersKey = '"folders"';
    const idx = s.indexOf(foldersKey);
    if (idx !== -1) {
      const bracketIdx = s.indexOf('[', idx);
      if (bracketIdx !== -1) {
        let depth = 0; let inString = false; let escaped = false; let j = bracketIdx;
        for (; j < s.length; j++) {
          const c = s[j];
          if (inString) {
            if (escaped) { escaped = false; }
            else if (c === '\\') { escaped = true; }
            else if (c === '"') { inString = false; }
          } else {
            if (c === '"') { inString = true; }
            else if (c === '[') { depth++; }
            else if (c === ']') { depth--; if (depth === 0) { break; } }
          }
        }
        if (j > bracketIdx) {
          const arrStr = s.slice(bracketIdx + 1, j);
          yield* parseObjectsArrayString(arrStr);
          return;
        }
      }
    }

    // fallback: parse first object
    let depth2 = 0; let inString2 = false; let escaped2 = false; let k = 0;
    for (; k < s.length; k++) {
      const c = s[k];
      if (inString2) {
        if (escaped2) { escaped2 = false; }
        else if (c === '\\') { escaped2 = true; }
        else if (c === '"') { inString2 = false; }
      } else {
        if (c === '"') { inString2 = true; }
        else if (c === '{') { depth2++; }
        else if (c === '}') { depth2--; if (depth2 === 0) { k++; break; } }
      }
    }
    if (k > 0) { const objStr = s.slice(0, k); yield JSON.parse(objStr); return; }
  }

  const parsed = JSON.parse(s);
  if (Array.isArray(parsed)) { for (const it of parsed) yield it; return; }
  if (parsed && parsed.folders && Array.isArray(parsed.folders)) { for (const f of parsed.folders) yield f; return; }
  yield parsed;
}

async function createMetadataFromJson(fileUri: string, tmpDir: string): Promise<void> {
  // create metadata/ and write per-folder files by streaming folder objects
  const metadataDir = `${tmpDir}metadata/`;
  await ensureDir(metadataDir);
  const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' } as any);

  let autoCounter = 0;

  async function processFolderObject(rawFolderObj: any, parentOriginalId: number | null) {
    // determine an id-like token for folder
    const folderId = rawFolderObj?.folder?.id ?? rawFolderObj?.id ?? Date.now() + (autoCounter++);
    const folderDir = `${metadataDir}folder_${folderId}/`;
    await ensureDir(folderDir);

    // create normalized folder metadata with parent_original_id to help importer
    const folderMeta = {
      original_id: folderId,
      parent_original_id: parentOriginalId,
      folder: rawFolderObj?.folder ?? rawFolderObj
    };
    await FileSystem.writeAsStringAsync(`${folderDir}folder.json`, JSON.stringify(folderMeta), { encoding: 'utf8' } as any);

    const comps = rawFolderObj?.competitions || rawFolderObj?.competences || rawFolderObj?.competencias || rawFolderObj?.competitions || [];
    let compIndex = 0;
    if (Array.isArray(comps)) {
      for (const comp of comps) {
        const compId = comp?.id ?? comp?.competition_id ?? comp?.competence_id ?? (Date.now() + compIndex);
        await FileSystem.writeAsStringAsync(`${folderDir}competition_${compId}.json`, JSON.stringify(comp), { encoding: 'utf8' } as any);

        const gymnasts = comp?.gymnasts || comp?.gymnastas || comp?.participants || [];
        let gIndex = 0;
        if (Array.isArray(gymnasts)) {
          for (const g of gymnasts) {
            const gid = g?.gymnast?.id ?? g?.id ?? (Date.now() + gIndex);
            const gymnastObj = { gymnast: g, images: g?.images || [], traces: g?.traces || [] };
            await FileSystem.writeAsStringAsync(`${folderDir}gymnast_${gid}.json`, JSON.stringify(gymnastObj), { encoding: 'utf8' } as any);
            gIndex++;
          }
        }

        compIndex++;
      }
    }

    // recursively process subfolders if present
    const subs = rawFolderObj?.subfolders || rawFolderObj?.children || rawFolderObj?.folders || [];
    if (Array.isArray(subs) && subs.length > 0) {
      for (const sf of subs) {
        await processFolderObject(sf, folderId);
      }
    }
  }

  for (const rawFolderObj of iterateTopLevelFolderObjects(fileContent)) {
    await processFolderObject(rawFolderObj, null);
  }

  // write index with folders array (V2-compatible)
  const exportedFolders: Array<{ original_id: number; folder_path: string }> = [];
  const dirs = await FileSystem.readDirectoryAsync(metadataDir);
  for (const d of dirs) {
    const idNum = Number(d.replace(/^folder_/, '').replace(/\/$/, ''));
    exportedFolders.push({ original_id: idNum, folder_path: `metadata/${d}/` });
  }
  const index = { version: 'legacy-import', exportDate: new Date().toISOString(), folders: exportedFolders };
  await FileSystem.writeAsStringAsync(`${tmpDir}metadata.json`, JSON.stringify(index, null, 2), { encoding: 'utf8' } as any);
}

/**
 * Nuevo exportador/importador V2 (package-based, files per-item).
 * - No serializa todo en memoria
 * - Copia imágenes a /images
 * - Crea metadata/folder_<id>/folder.json, competition_<id>.json, gymnast_<id>.json
 */

async function countPackageItems(folderIds: number[]) {
  let folders = 0, competitions = 0, gymnasts = 0;

  async function walk(fid: number) {
    folders++;
    const comps = await db.getAllAsync<{ id: number }>('SELECT id FROM competitions WHERE folder_id = ?', [fid]);
    competitions += comps.length;
    for (const c of comps) {
      const gs = await db.getAllAsync<{ id: number }>('SELECT id FROM gymnasts WHERE competence_id = ?', [c.id]);
      gymnasts += gs.length;
    }
    const subs = await db.getAllAsync<{ id: number }>('SELECT id FROM folders WHERE parent_folder_id = ? ORDER BY IFNULL(display_order, id) ASC', [fid]);
    for (const s of subs) await walk(s.id);
  }

  for (const fid of folderIds) await walk(fid);
  return { folders, competitions, gymnasts };
}

export async function exportPackageV2(
  folderIds: number[],
  onProgress?: ProgressCallback,
  includeImages = true
): Promise<string> {
  if (!rnZip) throw new Error('Zip library not available — build with native plugin');

  onProgress?.(2, 'Counting items...');
  const totals = await countPackageItems(folderIds);
  const totalUnits = Math.max(1, totals.folders + totals.competitions + totals.gymnasts);

  const tmpDir = `${FileSystem.cacheDirectory}gym_export_v2_${Date.now()}/`;
  const imagesDir = `${tmpDir}images/`;
  const metadataDir = `${tmpDir}metadata/`;
  await ensureDir(tmpDir);
  await ensureDir(imagesDir);
  await ensureDir(metadataDir);

  const copiedMap = new Map<string, string>();
  let imgCounter = 0;
  let processedUnits = 0;
  const exportedFolders: { original_id: number; folder_path: string; title?: string }[] = [];
  const exportedFolderSet = new Set<number>();

  async function writeFolderRecursive(fid: number, metaBaseDir: string) {
    // read folder row
    const folders = await db.getAllAsync<Folder>('SELECT * FROM folders WHERE id = ?', [fid]);
    if (folders.length === 0) return;
    const folder = folders[0];

    const folderDir = `${metaBaseDir}folder_${folder.id}/`;
    await ensureDir(folderDir);

    // write folder.json (lightweight - no heavy arrays)
    const folderMeta = { original_id: folder.id, parent_original_id: folder.parent_folder_id ?? null, folder };
    await FileSystem.writeAsStringAsync(`${folderDir}folder.json`, JSON.stringify(folderMeta), { encoding: 'utf8' } as any);
    // record folder in index list (all folders, not only roots)
    if (!exportedFolderSet.has(folder.id)) {
      exportedFolderSet.add(folder.id);
      exportedFolders.push({ original_id: folder.id, folder_path: `metadata/folder_${folder.id}/`, title: folder.titulo });
    }
    processedUnits++; onProgress?.(Math.round((processedUnits/totalUnits)*60), `Wrote metadata for folder ${folder.id}`);

    // competitions
    const competitions = await db.getAllAsync<Competition>(
      'SELECT * FROM competitions WHERE folder_id = ? ORDER BY IFNULL(display_order, id) ASC',
      [fid]
    );

    for (const comp of competitions) {
      const compPath = `${folderDir}competition_${comp.id}.json`;
      await FileSystem.writeAsStringAsync(compPath, JSON.stringify(comp), { encoding: 'utf8' } as any);
      processedUnits++; onProgress?.(Math.round((processedUnits/totalUnits)*70), `Wrote competition ${comp.id}`);

      // gymnasts for competition
      const gymnasts = await db.getAllAsync<Gymnast>('SELECT * FROM gymnasts WHERE competence_id = ? ORDER BY numero', [comp.id]);
      for (const g of gymnasts) {
        // read traces
        const traces = await db.getAllAsync<WhiteboardTrace>('SELECT * FROM whiteboard_traces WHERE gymnast_id = ? ORDER BY order_index', [g.id]);

        // images metadata and copy
        const imgs = await db.getAllAsync<GymnastImage>('SELECT * FROM gymnast_images WHERE gymnast_id = ? ORDER BY order_index', [g.id]);
        const imagesOut: any[] = [];
        if (includeImages) {
          for (const im of imgs) {
            const orig = (im as any).image_uri || '';
            if (!orig) { imagesOut.push({ meta: im, package_uri: '' }); continue; }
            if (copiedMap.has(orig)) {
              imagesOut.push({ meta: im, package_uri: copiedMap.get(orig) });
              continue;
            }

            try {
              const info = await FileSystem.getInfoAsync(ensureFsUri(orig));
              if (!info.exists) { imagesOut.push({ meta: im, package_uri: '' }); continue; }

              const extMatch = (orig || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
              const ext = extMatch ? `.${extMatch[1]}` : '.jpg';
              const fname = `img_${Date.now()}_${imgCounter++}${ext}`;
              const dest = `${imagesDir}${fname}`;
              await FileSystem.copyAsync({ from: ensureFsUri(orig), to: ensureFsUri(dest) });
              const rel = `images/${fname}`;
              copiedMap.set(orig, rel);
              imagesOut.push({ meta: im, package_uri: rel });
            } catch (e) {
              imagesOut.push({ meta: im, package_uri: '' });
            }
          }
        } else {
          for (const im of imgs) imagesOut.push({ meta: im, package_uri: '' });
        }

        const gymnastObj = { gymnast: g, images: imagesOut, traces };
        await FileSystem.writeAsStringAsync(`${folderDir}gymnast_${g.id}.json`, JSON.stringify(gymnastObj), { encoding: 'utf8' } as any);
        processedUnits++; onProgress?.(Math.round((processedUnits/totalUnits)*80), `Wrote gymnast ${g.id}`);
      }
    }

    // subfolders
    const subs = await db.getAllAsync<Folder>('SELECT id FROM folders WHERE parent_folder_id = ? ORDER BY IFNULL(display_order, id) ASC', [fid]);
    for (const s of subs) await writeFolderRecursive(s.id, metaBaseDir);
  }

  // Export each requested root folder (recursively creates folder_<id> dirs)
  for (const fid of folderIds) {
    await writeFolderRecursive(fid, metadataDir);
  }

  // Ensure exportedFolders is deterministic: sort by original_id
  exportedFolders.sort((a, b) => a.original_id - b.original_id);

  // write index file (small)
  const index = {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    folders: exportedFolders
  };
  await FileSystem.writeAsStringAsync(`${tmpDir}metadata.json`, JSON.stringify(index), { encoding: 'utf8' } as any);

  // Build friendly filename: date + first folder title (or 'all') + random id
  function sanitizeName(n: string) {
    return (n || '').replace(/[^a-zA-Z0-9\- ]+/g, '').replace(/\s+/g, '-').slice(0, 40);
  }

  const now = new Date();
  const pad = (v: number) => String(v).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  // Determine friendly filename based on selected root folders
  let firstTitle = 'export';
  try {
    if (folderIds && folderIds.length > 0) {
      const rows = await db.getAllAsync<Folder>('SELECT titulo FROM folders WHERE id = ?', [folderIds[0]]);
      firstTitle = rows && rows[0] && rows[0].titulo ? sanitizeName(rows[0].titulo) : 'export';
    }
  } catch (e) { /* ignore */ }
  const countSuffix = folderIds && folderIds.length > 1 ? `_x${folderIds.length}` : '';
  const rnd = Math.floor(Math.random() * 9000) + 1000;
  const fileName = `${dateStr}_${firstTitle}${countSuffix}_${rnd}.zip`;

  onProgress?.(90, 'Compressing package...');
  const zipPath = `${FileSystem.cacheDirectory}${fileName}`;
  try {
    await rnZip(stripFileProtocol(tmpDir), stripFileProtocol(zipPath));
  } catch (zipErr) {
    throw new Error(`Zip failed: ${zipErr}`);
  }

  onProgress?.(95, 'Sharing package...');
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(ensureFsUri(zipPath), { mimeType: 'application/zip', dialogTitle: 'Export Package' });
    }
  } catch (sErr) {
    // ignore share errors
  }

  // Cleanup tmp dir if desired (keep zip)
  try { await FileSystem.deleteAsync(tmpDir, { idempotent: true }); } catch (e) {}

  onProgress?.(100, 'Export completed');
  return zipPath;
}

export async function validatePackageV2(fileUri: string) {
  if (!rnUnzip) return { valid: false, error: 'Unzip not available' };
  const tmp = `${FileSystem.cacheDirectory}import_pkg_v2_validate_${Date.now()}/`;
  await ensureDir(tmp);
  try {
    await rnUnzip(stripFileProtocol(fileUri), stripFileProtocol(tmp));
  } catch (e) {
    return { valid: false, error: `Failed to unzip: ${e}` };
  }

  try {
    const idxPath = `${tmp}metadata.json`;
    const metaInfo = await FileSystem.getInfoAsync(ensureFsUri(idxPath)).catch(() => ({ exists: false } as any));
    let folders = 0, competitions = 0, gymnasts = 0;
    if (metaInfo && metaInfo.exists) {
      const txt = await FileSystem.readAsStringAsync(ensureFsUri(idxPath), { encoding: 'utf8' } as any);
      const idx = JSON.parse(txt);
      if (Array.isArray(idx.folders)) {
        for (const f of idx.folders) {
          folders++;
          const folderDir = `${tmp}${f.folder_path.replace(/metadata\//, 'metadata/')}`;
          try {
            const files = await FileSystem.readDirectoryAsync(folderDir);
            for (const ff of files) {
              if (ff.startsWith('competition_') && ff.endsWith('.json')) competitions++;
              if (ff.startsWith('gymnast_') && ff.endsWith('.json')) gymnasts++;
            }
          } catch (e) {}
        }
      }
    } else {
      // fallback: scan metadata/ dir
      const metaDir = `${tmp}metadata/`;
      const di = await FileSystem.getInfoAsync(ensureFsUri(metaDir)).catch(() => ({ exists: false } as any));
      if (!di || !di.exists) return { valid: false, error: 'No metadata found' };
      const foldersList = await FileSystem.readDirectoryAsync(metaDir);
      for (const fd of foldersList) {
        const folderDir = `${metaDir}${fd}/`;
        try {
          const files = await FileSystem.readDirectoryAsync(folderDir);
          folders++;
          for (const ff of files) { if (ff.startsWith('competition_') && ff.endsWith('.json')) competitions++; if (ff.startsWith('gymnast_') && ff.endsWith('.json')) gymnasts++; }
        } catch (e) {}
      }
    }

    return { valid: true, summary: { folders, competitions, gymnasts } };
  } finally {
    try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch (e) {}
  }
}

export async function importPackageV2(
  parentFolderId: number | null,
  onProgress?: (stage: string, current: number, total: number, message: string) => void
): Promise<void> {
  // Pick file
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets || res.assets.length === 0) return;
  const fileUri = res.assets[0].uri;
  const fileName = (res.assets[0].name || fileUri || '').toLowerCase();
  const isZip = fileName.endsWith('.zip') || (fileUri || '').toLowerCase().endsWith('.zip');

  const tmp = `${FileSystem.cacheDirectory}import_pkg_v2_${Date.now()}/`;
  await ensureDir(tmp);

    if (isZip) {
      if (!rnUnzip) throw new Error('Unzip not available');
      try {
        await rnUnzip(stripFileProtocol(fileUri), stripFileProtocol(tmp));
      } catch (e) { throw new Error(`Failed to unzip package: ${e}`); }
    } else {
      // Convert legacy JSON export into V2 metadata/ structure and continue
      try {
        await createMetadataFromJson(fileUri, tmp);
      } catch (e) {
        throw new Error(`Failed to parse legacy JSON import: ${e}`);
      }
    }

  // Read index or metadata dir
  const idxPath = `${tmp}metadata.json`;
  const idxInfo = await FileSystem.getInfoAsync(ensureFsUri(idxPath)).catch(() => ({ exists: false } as any));
  let folderMetaPaths: { original_id: number; path: string }[] = [];

  if (idxInfo && idxInfo.exists) {
    const idxTxt = await FileSystem.readAsStringAsync(ensureFsUri(idxPath), { encoding: 'utf8' } as any);
    const idx = JSON.parse(idxTxt);
    if (Array.isArray(idx.folders)) {
      for (const f of idx.folders) folderMetaPaths.push({ original_id: f.original_id ?? 0, path: `${tmp}${f.folder_path}` });
    }
  } else {
    const metaDir = `${tmp}metadata/`;
    const di = await FileSystem.getInfoAsync(ensureFsUri(metaDir)).catch(() => ({ exists: false } as any));
    if (!di || !di.exists) throw new Error('Package missing metadata');
    const folderDirs = await FileSystem.readDirectoryAsync(metaDir);
    for (const fd of folderDirs) folderMetaPaths.push({ original_id: Number(fd.replace(/^folder_/, '').replace(/\/$/, '')), path: `${metaDir}${fd}/` });
  }

  // Load folder.json for each to get parent mapping without loading full content
  const folderIndex: Map<number, { path: string; parent_original_id: number | null }> = new Map();
  for (const fm of folderMetaPaths) {
    try {
      const txt = await FileSystem.readAsStringAsync(`${fm.path}folder.json`, { encoding: 'utf8' } as any);
      const parsed = JSON.parse(txt);
      const origRaw = parsed?.original_id ?? parsed?.folder?.id ?? fm.original_id;
      const origNum = Number(origRaw ?? fm.original_id);
      const parentRaw = parsed?.parent_original_id ?? parsed?.folder?.parent_folder_id ?? null;
      const parentNum = parentRaw !== null && parentRaw !== undefined ? Number(parentRaw) : null;
      folderIndex.set(origNum, { path: fm.path, parent_original_id: parentNum });
    } catch (e) { /* skip invalid */ }
  }

  // Import folders in topo order (parents first)
  const origToNew = new Map<number, number>();
  const pending = new Set<number>(Array.from(folderIndex.keys()));
  let iterations = 0;
  const parentsToNormalize = new Set<number>();
  while (pending.size > 0) {
    if (++iterations > 10000) throw new Error('Too many iterations importing folders');
    let progressed = false;
    for (const orig of Array.from(pending)) {
      const info = folderIndex.get(orig)!;
      const parentOrig = info.parent_original_id;
      // determine parent in DB
      let parentNew: number | null = parentFolderId;
      if (parentOrig !== null && parentOrig !== undefined) {
        if (origToNew.has(parentOrig)) parentNew = origToNew.get(parentOrig)!;
        else continue; // parent not created yet
      }

      // read folder.json fully
      const folderTxt = await FileSystem.readAsStringAsync(`${info.path}folder.json`, { encoding: 'utf8' } as any);
      const parsed = JSON.parse(folderTxt);
      const folderRow = parsed.folder ?? parsed;

      // insert folder row
      let newFolderId: number;
      try {
        const resInsert = await db.runAsync(
          `INSERT INTO folders (titulo, descripcion, fecha_creacion, nivel_profundidad, parent_folder_id) VALUES (?, ?, ?, ?, ?)`,
          [folderRow.titulo, folderRow.descripcion, folderRow.fecha_creacion, folderRow.nivel_profundidad ?? 0, parentNew]
        );
        newFolderId = resInsert.lastInsertRowId;
      } catch (e) {
        throw e;
      }

      origToNew.set(orig, newFolderId);
      if (parentNew !== null) parentsToNormalize.add(parentNew);
      pending.delete(orig);
      progressed = true;

      // import competitions and gymnasts inside folder
      try {
        const files = await FileSystem.readDirectoryAsync(info.path);
        // competitions
        for (const f of files) {
          if (!f.startsWith('competition_') || !f.endsWith('.json')) continue;
          try {
            const compTxt = await FileSystem.readAsStringAsync(`${info.path}${f}`, { encoding: 'utf8' } as any);
            const comp = JSON.parse(compTxt);
            const insComp = await db.runAsync(
              `INSERT INTO competitions (name, description, date, gender, folder_id, number_of_participants, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [comp.name, comp.description, comp.date, comp.gender ? 1 : 0, newFolderId, comp.number_of_participants ?? 0, comp.created_at ?? new Date().toISOString()]
            );
            const newCompId = insComp.lastInsertRowId;

            // import gymnasts for this competition
            // we scan gymnast files and try to import only those that belong to this competition when possible
            const originalCompId = comp.id ?? comp.competition_id ?? comp.competence_id ?? null;
            for (const gf of files) {
              if (!gf.startsWith('gymnast_') || !gf.endsWith('.json')) continue;
              try {
                const gTxt = await FileSystem.readAsStringAsync(`${info.path}${gf}`, { encoding: 'utf8' } as any);
                const gObj = JSON.parse(gTxt);
                const g = gObj.gymnast ?? gObj;

                // determine original competition id for the gymnast (if present)
                const gOriginalComp = (g as any).competition_id ?? (g as any).competence_id ?? (g as any).competition ?? (g as any).competencia ?? null;
                if (originalCompId !== null && gOriginalComp !== null && Number(gOriginalComp) !== Number(originalCompId)) {
                  // gymnast belongs to a different original competition; skip
                  continue;
                }

                const starredVal = (g as any).starred === true || (g as any).starred === 1 ? 1 : 0;
                const insertG = await db.runAsync(
                  `INSERT INTO gymnasts (competence_id, numero, gymnasta, evento, noc, bib, created_at, starred) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [newCompId, g.numero ?? 0, g.gymnasta ?? g.name ?? '', g.evento ?? '', g.noc ?? '', g.bib ?? '', g.created_at ?? new Date().toISOString(), starredVal]
                );
                const newGid = insertG.lastInsertRowId;

                // images: support package-relative files AND embedded base64/dataURIs
                for (const im of (gObj.images || [])) {
                  const pkgRel = im.package_uri || im.meta?.package_uri || im.meta?.image_uri || '';
                  const base64Data = im.base64 || im.imageData || im.data || im.meta?.imageData || im.meta?.base64 || '';
                  const destDir = `${FileSystem.documentDirectory}imported_images/`;
                  await ensureDir(destDir);

                  if (pkgRel) {
                    const src = pkgRel.startsWith('file://') || pkgRel.startsWith('/') ? pkgRel : `${tmp}${pkgRel}`;
                    const destName = `img_import_${Date.now()}_${Math.random().toString(36).slice(2,9)}${pkgRel.match(/\.[a-zA-Z0-9]+(?:\?|$)/)?.[0] ?? '.jpg'}`;
                    const destPath = `${destDir}${destName}`;
                    try {
                      await FileSystem.copyAsync({ from: ensureFsUri(src), to: ensureFsUri(destPath) });
                      await db.runAsync(
                        `INSERT INTO gymnast_images (gymnast_id, image_uri, position_x, position_y, rotation, scale, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [newGid, destPath, im.meta?.position_x ?? 0, im.meta?.position_y ?? 0, im.meta?.rotation ?? 0, im.meta?.scale ?? 1, im.meta?.order_index ?? 0]
                      );
                    } catch (e) { /* skip missing images */ }
                  } else if (base64Data) {
                    try {
                      let b64 = base64Data as string;
                      let ext = '.jpg';
                      // handle data URI
                      const m = b64.match(/^data:([^;]+);base64,(.*)$/);
                      if (m) {
                        const mime = m[1];
                        b64 = m[2];
                        if (mime === 'image/png') ext = '.png';
                        else if (mime === 'image/webp') ext = '.webp';
                        else if (mime === 'image/jpeg' || mime === 'image/jpg') ext = '.jpg';
                        else if (mime === 'image/svg+xml') ext = '.svg';
                      }

                      const destName = `img_import_${Date.now()}_${Math.random().toString(36).slice(2,9)}${ext}`;
                      const destPath = `${destDir}${destName}`;
                      await FileSystem.writeAsStringAsync(destPath, b64, { encoding: 'base64' } as any);
                      await db.runAsync(
                        `INSERT INTO gymnast_images (gymnast_id, image_uri, position_x, position_y, rotation, scale, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [newGid, destPath, im.meta?.position_x ?? 0, im.meta?.position_y ?? 0, im.meta?.rotation ?? 0, im.meta?.scale ?? 1, im.meta?.order_index ?? 0]
                      );
                    } catch (e) { /* skip invalid base64 */ }
                  }
                }

                // traces
                for (const t of (gObj.traces || [])) {
                  await db.runAsync(
                    `INSERT INTO whiteboard_traces (gymnast_id, trace_data, color, stroke_width, pen_type, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
                    [newGid, t.trace_data, t.color ?? '#000000', t.stroke_width ?? 2, t.pen_type ?? 'normal', t.order_index ?? 0]
                  );
                }
              } catch (eg) { /* skip gymnast parse errors */ }
            }
          } catch (ec) { /* skip competition parse errors */ }
        }
      } catch (e) { /* continue */ }
    }

    if (!progressed) throw new Error('Cannot resolve folder parent relationships — incomplete package');
  }

  // Normalize display_order for affected parents so imported folders appear correctly
  try {
    for (const p of parentsToNormalize) {
      try { await normalizeDisplayOrderInFolder(p); } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }

  // cleanup
  try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch (e) {}
}

export default {
  exportPackageV2,
  importPackageV2,
  validatePackageV2
};
