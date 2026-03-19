import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
// Zip library (native). Use require to avoid runtime errors if not installed in plain JS env
const zipLib: any = (() => {
  try { return require('react-native-zip-archive'); } catch (e) { return null; }
})();
const rnZip: ((source: string, target: string) => Promise<string>) | null = zipLib ? zipLib.zip : null;
const rnUnzip: ((source: string, target: string) => Promise<string>) | null = zipLib ? zipLib.unzip : null;

import { db, Folder, Competition, Gymnast, GymnastImage, WhiteboardTrace, normalizeDisplayOrderInFolder, initDatabase } from './database';

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

function toNumber(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const percentageTableDisciplineTrue = [
  [100, 75, 65, 55, 45, 35, 25, 15, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  [100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0],
  [100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0, 0],
  [100, 100, 94, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0],
  [100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0],
  [100, 100, 100, 96, 88, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0],
  [100, 100, 100, 100, 93, 87, 80, 70, 60, 50, 40, 30, 20, 0, 0, 0, 0],
];

const percentageTableDisciplineFalse = [
  [100, 100, 75, 65, 55, 45, 35, 25, 15, 5, 0, 0, 0, 0, 0, 0],
  [100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0],
  [100, 100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0],
  [100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0],
  [100, 100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0],
  [100, 100, 100, 100, 95, 85, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0],
  [100, 100, 100, 100, 100, 95, 85, 80, 70, 60, 50, 40, 30, 20, 10, 0],
];

const percentageTableWagVault = [
  [100, 100, 75, 65, 55, 45, 35, 25, 15, 5, 0, 0, 0, 0, 0, 0],
  [100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0],
  [100, 100, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0],
  [100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0, 0],
  [100, 100, 100, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 0],
  [100, 100, 100, 100, 95, 85, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0],
  [100, 100, 100, 100, 100, 95, 85, 80, 70, 60, 50, 40, 30, 20, 10, 0],
];

const deltStepsFloor = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
const deltStepsVault = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5];

function getDeductionIntervalFloor(newded: number): number {
  const rounded = Math.round(newded * 100) / 100;
  if (rounded >= 0.0 && rounded <= 0.4) return 1;
  if (rounded > 0.4 && rounded <= 0.6) return 2;
  if (rounded > 0.6 && rounded <= 1.0) return 3;
  if (rounded > 1.0 && rounded <= 1.5) return 4;
  if (rounded > 1.5 && rounded <= 2.0) return 5;
  if (rounded > 2.0 && rounded <= 2.5) return 6;
  if (rounded > 2.5 && rounded <= 10.0) return 7;
  return 0;
}

function getDeductionIntervalVault(newded: number): number {
  if (newded >= 0.0 && newded <= 0.4) return 1;
  if (newded > 0.4 && newded <= 0.6) return 2;
  if (newded > 0.6 && newded <= 1.0) return 3;
  if (newded > 1.0 && newded <= 1.5) return 4;
  if (newded > 1.5 && newded <= 2.0) return 5;
  if (newded > 2.0 && newded <= 2.5) return 6;
  if (newded > 2.5 && newded <= 10.0) return 7;
  return 0;
}

function getPercentageFromFloorTable(dedInterval: number, delt: number, discipline: boolean): number {
  const percentageTable = discipline ? percentageTableDisciplineTrue : percentageTableDisciplineFalse;
  if (delt > 1.4) return 0;
  if (dedInterval < 1 || dedInterval > 7) return 0;

  const deltRounded = Math.round((delt + Number.EPSILON) * 10) / 10;
  let deltIndex = deltStepsFloor.findIndex((step) => Math.abs(step - deltRounded) < 1e-9);

  if (deltIndex < 0) {
    deltIndex = deltStepsFloor.reduce((bestIdx, step, idx) => {
      return Math.abs(step - deltRounded) < Math.abs(deltStepsFloor[bestIdx] - deltRounded) ? idx : bestIdx;
    }, 0);
  }

  return percentageTable[dedInterval - 1][deltIndex] || 0;
}

function getPercentageFromVaultTable(dedInterval: number, delt: number, discipline: boolean, evento: string): number {
  const isWagVault = !discipline && evento.toUpperCase() === 'VT';
  const percentageTable = discipline
    ? percentageTableDisciplineTrue
    : (isWagVault ? percentageTableWagVault : percentageTableDisciplineFalse);

  if (delt > 1.4) return 0;
  if (dedInterval < 1 || dedInterval > 7) return 0;

  let deltIndex = 0;
  if (isWagVault) {
    const idx = deltStepsVault.findIndex((step) => delt <= step);
    deltIndex = idx === -1 ? deltStepsVault.length - 1 : idx;
  } else {
    const idx = deltStepsVault.findIndex((step) => step > delt);
    if (idx === -1) deltIndex = deltStepsVault.length - 1;
    else if (idx === 0) deltIndex = 0;
    else deltIndex = idx - 1;
  }

  if (deltIndex < 0) deltIndex = 0;
  if (deltIndex >= deltStepsVault.length) deltIndex = deltStepsVault.length - 1;

  return percentageTable[dedInterval - 1][deltIndex] || 0;
}

function recalculatePercentageForImportedJson(g: any, discipline: boolean): number {
  const compE = toNumber(g?.competition_e, 0);
  const eScore = toNumber(g?.escore, 0);
  const delt = Math.abs(Math.round((eScore - compE) * 1000) / 1000);
  const newded = 10 - compE;
  const evento = String(g?.evento ?? '').toUpperCase();

  if (evento === 'VT') {
    const dedInterval = getDeductionIntervalVault(newded);
    return getPercentageFromVaultTable(dedInterval, delt, discipline, evento);
  }

  const dedInterval = getDeductionIntervalFloor(newded);
  return getPercentageFromFloorTable(dedInterval, delt, discipline);
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

    const comps = rawFolderObj?.competitions || rawFolderObj?.competences || rawFolderObj?.competencias || [];
    let compIndex = 0;
    if (Array.isArray(comps)) {
      for (const compRaw of comps) {
        // compRaw might be a wrapper like { competition: {...}, gymnasts: [...] }
        const comp = compRaw?.competition ?? compRaw;
        const compId = comp?.id ?? comp?.competition_id ?? comp?.competence_id ?? (Date.now() + compIndex);
        // write the inner competition object (importer expects competition fields at root)
        await FileSystem.writeAsStringAsync(`${folderDir}competition_${compId}.json`, JSON.stringify(comp), { encoding: 'utf8' } as any);

        // gymnasts list can be on the wrapper or on the inner comp
        const gymnastsRaw = compRaw?.gymnasts ?? comp?.gymnasts ?? compRaw?.gymnastas ?? [];
        let gIndex = 0;
        if (Array.isArray(gymnastsRaw)) {
          for (const gRaw of gymnastsRaw) {
            // gRaw might be { gymnast: {...}, images: [], traces: [] } or just the gymnast object
            const innerGymnast = gRaw?.gymnast ?? gRaw;
            const gid = innerGymnast?.id ?? innerGymnast?.gymnast_id ?? (Date.now() + gIndex);
            const images = gRaw?.images ?? innerGymnast?.images ?? [];
            const traces = gRaw?.traces ?? innerGymnast?.traces ?? [];
            const gymnastObj = { gymnast: innerGymnast, images, traces };
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

  // Ensure DB schema is fully migrated before reading/exporting fields like `percentage`.
  await initDatabase();

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
  // Ensure DB schema is ready before inserting fields like `percentage`.
  await initDatabase();

  // Pick file
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets || res.assets.length === 0) return;
  const fileUri = res.assets[0].uri;
  const fileName = (res.assets[0].name || fileUri || '').toLowerCase();
  const isZip = fileName.endsWith('.zip') || (fileUri || '').toLowerCase().endsWith('.zip');
  const preserveImagePosition = isZip;

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
            const compDiscipline = typeof comp.gender === 'boolean' ? comp.gender : toNumber(comp.gender, 0) === 1;
            const insComp = await db.runAsync(
              `INSERT INTO competitions (name, description, date, gender, folder_id, number_of_participants, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [comp.name, comp.description, comp.date, compDiscipline ? 1 : 0, newFolderId, comp.number_of_participants ?? 0, comp.created_at ?? new Date().toISOString()]
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
                const rawPercentageVal = toNumber((g as any).percentage, 0);
                const percentageVal = (!isZip && rawPercentageVal === 0)
                  ? recalculatePercentageForImportedJson(g, compDiscipline)
                  : rawPercentageVal;
                
                // Insert with full fields - use defaults for any missing values
                let insertG: any;
                try {
                  insertG = await db.runAsync(
                    `INSERT INTO gymnasts (
                      competence_id, numero, gymnasta, evento, noc, bib,
                      a, b, c, d, e, f, g, h, i, j,
                      number_of_element, difficulty_values,
                      element_group1, element_group2, element_group3, element_group4, element_group_total,
                      cv, bonus, nd, sv, execution, escore, myscore,
                      competition_d, competition_e, competition_sb, competition_nd, competition_score,
                      comments, delta, percentage, dedded, vault, vault_description, vault_value, starred, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      newCompId, g.numero || 0, g.gymnasta || '', g.evento || '', g.noc || '', g.bib || '',
                      g.a || 0, g.b || 0, g.c || 0, g.d || 0, g.e || 0, g.f || 0, g.g || 0, g.h || 0, g.i || 0, g.j || 0,
                      g.number_of_element || 0, g.difficulty_values || 0,
                      g.element_group1 || 0, g.element_group2 || 0, g.element_group3 || 0, g.element_group4 || 0, g.element_group_total || 0,
                      g.cv || 0, g.bonus || 0, g.nd || 0, g.sv || 0, g.execution || 0, g.escore || 0, g.myscore || 0,
                      g.competition_d || 0, g.competition_e || 0, g.competition_sb || 0, g.competition_nd || 0, g.competition_score || 0,
                      g.comments || '', g.delta || 0, percentageVal, g.dedded || 0, g.vault || null, g.vault_description || null, g.vault_value || 0, starredVal, g.created_at || new Date().toISOString()
                    ]
                  );
                } catch (fullInsertError) {
                  // Fallback: insert without starred column (for older DB schema)
                  insertG = await db.runAsync(
                    `INSERT INTO gymnasts (
                      competence_id, numero, gymnasta, evento, noc, bib,
                      a, b, c, d, e, f, g, h, i, j,
                      number_of_element, difficulty_values,
                      element_group1, element_group2, element_group3, element_group4, element_group_total,
                      cv, bonus, nd, sv, execution, escore, myscore,
                      competition_d, competition_e, competition_sb, competition_nd, competition_score,
                      comments, delta, percentage, dedded, vault, vault_description, vault_value, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      newCompId, g.numero || 0, g.gymnasta || '', g.evento || '', g.noc || '', g.bib || '',
                      g.a || 0, g.b || 0, g.c || 0, g.d || 0, g.e || 0, g.f || 0, g.g || 0, g.h || 0, g.i || 0, g.j || 0,
                      g.number_of_element || 0, g.difficulty_values || 0,
                      g.element_group1 || 0, g.element_group2 || 0, g.element_group3 || 0, g.element_group4 || 0, g.element_group_total || 0,
                      g.cv || 0, g.bonus || 0, g.nd || 0, g.sv || 0, g.execution || 0, g.escore || 0, g.myscore || 0,
                      g.competition_d || 0, g.competition_e || 0, g.competition_sb || 0, g.competition_nd || 0, g.competition_score || 0,
                      g.comments || '', g.delta || 0, percentageVal, g.dedded || 0, g.vault || null, g.vault_description || null, g.vault_value || 0, g.created_at || new Date().toISOString()
                    ]
                  );
                }
                const newGid = insertG.lastInsertRowId;

                // images: support package-relative files AND embedded base64/dataURIs
                for (const im of (gObj.images || [])) {
                  const base64Data = im.base64 || im.imageData || im.data || im.meta?.imageData || im.meta?.base64 || '';
                  // Prefer package_uri when present. For legacy JSON, prefer base64 payload over stale local image_uri paths.
                  const pkgRel = im.package_uri || im.meta?.package_uri || (!base64Data ? (im.meta?.image_uri || im.image?.image_uri || '') : '');
                  const posX = im.position_x ?? im.meta?.position_x ?? im.image?.position_x ?? 0;
                  const posY = im.position_y ?? im.meta?.position_y ?? im.image?.position_y ?? 0;
                  const rot = im.rotation ?? im.meta?.rotation ?? im.image?.rotation ?? 0;
                  const scl = im.scale ?? im.meta?.scale ?? im.image?.scale ?? 1;
                  const ord = im.order_index ?? im.meta?.order_index ?? im.image?.order_index ?? 0;
                  const imgPosX = preserveImagePosition ? toNumber(posX, 0) : 0;
                  const imgPosY = preserveImagePosition ? toNumber(posY, 0) : 0;
                  const imgRot = preserveImagePosition ? toNumber(rot, 0) : 0;
                  const imgScl = preserveImagePosition ? toNumber(scl, 1) : 1;
                  const imgOrd = toNumber(ord, 0);
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
                        [newGid, destPath, imgPosX, imgPosY, imgRot, imgScl, imgOrd]
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
                        [newGid, destPath, imgPosX, imgPosY, imgRot, imgScl, imgOrd]
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
