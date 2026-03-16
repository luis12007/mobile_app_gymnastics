import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { 
  db,
  Folder, 
  Competition, 
  Gymnast, 
  GymnastImage, 
  WhiteboardTrace,
  createFolder,
  createCompetition,
  createGymnast,
  getFolderById,
  getCompetitionsByFolder,
  getGymnastsByCompetition
} from './database';

// ==================== INTERFACES ====================

export interface ExportData {
  version: string;
  exportDate: string;
  folders: FolderExportData[];
}

export interface FolderExportData {
  folder: Folder;
  subfolders: FolderExportData[]; // Recursivo para jerarquía
  competitions: CompetitionExportData[];
}

export interface CompetitionExportData {
  competition: Competition;
  gymnasts: GymnastExportData[];
}

export interface GymnastExportData {
  gymnast: Gymnast;
  images: ImageExportData[];
  traces: WhiteboardTrace[];
}

export interface ImageExportData {
  image: GymnastImage;
  imageData: string; // Base64 encoded image
}

export interface ImportProgress {
  stage: 'folders' | 'competitions' | 'gymnasts' | 'images' | 'traces' | 'complete';
  current: number;
  total: number;
  message: string;
}

// ==================== NORMALIZACIÓN / RETROCOMPATIBILIDAD ====================

function toNumber(v: any, def = 0): number {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function normalizeImageEntry(entry: any): ImageExportData | null {
  if (!entry) return null;

  const meta = entry.image || entry.meta || entry;
  const imageData = entry.imageData || entry.base64 || entry.data || entry.image_data || '';

  const image: GymnastImage = {
    id: toNumber(meta.id, 0),
    gymnast_id: toNumber(meta.gymnast_id, 0),
    image_uri: meta.image_uri || meta.uri || meta.path || '',
    position_x: toNumber(meta.position_x, 0),
    position_y: toNumber(meta.position_y, 0),
    rotation: toNumber(meta.rotation, 0),
    scale: toNumber(meta.scale, 1),
    order_index: toNumber(meta.order_index ?? meta.order ?? 0, 0)
  };

  if (!imageData) {
    // No base64 data present — cannot reconstruct file during import
    return null;
  }

  return { image, imageData };
}

function normalizeTraceEntry(trace: any): WhiteboardTrace {
  const t: WhiteboardTrace = {
    id: toNumber(trace?.id, 0),
    gymnast_id: toNumber(trace?.gymnast_id, 0),
    trace_data: typeof trace?.trace_data === 'string' ? trace.trace_data : JSON.stringify(trace?.trace_data ?? []),
    color: trace?.color ?? '#000000',
    stroke_width: toNumber(trace?.stroke_width, 2),
    pen_type: trace?.pen_type ?? 'normal',
    order_index: toNumber(trace?.order_index ?? trace?.order ?? 0, 0)
  };
  return t;
}

function normalizeGymnastEntry(item: any): GymnastExportData {
  const gRaw = item?.gymnast || item || {};

  const gymnast: any = {
    id: toNumber(gRaw.id, 0),
    competence_id: toNumber(gRaw.competence_id ?? gRaw.competition_id ?? gRaw.competitionId ?? gRaw.folder_id ?? 0),
    numero: toNumber(gRaw.numero ?? gRaw.number ?? 0),
    gymnasta: gRaw.gymnasta ?? gRaw.name ?? gRaw.nombre ?? '',
    evento: gRaw.evento ?? gRaw.event ?? '',
    noc: gRaw.noc ?? '',
    bib: gRaw.bib ?? '',
    a: toNumber(gRaw.a, 0), b: toNumber(gRaw.b, 0), c: toNumber(gRaw.c, 0), d: toNumber(gRaw.d, 0),
    e: toNumber(gRaw.e, 0), f: toNumber(gRaw.f, 0), g: toNumber(gRaw.g, 0), h: toNumber(gRaw.h, 0),
    i: toNumber(gRaw.i, 0), j: toNumber(gRaw.j, 0),
    number_of_element: toNumber(gRaw.number_of_element ?? gRaw.numberOfElement ?? 0),
    difficulty_values: toNumber(gRaw.difficulty_values ?? gRaw.difficultyValues ?? 0),
    element_group1: toNumber(gRaw.element_group1 ?? 0), element_group2: toNumber(gRaw.element_group2 ?? 0),
    element_group3: toNumber(gRaw.element_group3 ?? 0), element_group4: toNumber(gRaw.element_group4 ?? 0),
    element_group_total: toNumber(gRaw.element_group_total ?? 0),
    cv: toNumber(gRaw.cv, 0), bonus: toNumber(gRaw.bonus, 0), nd: toNumber(gRaw.nd, 0), sv: toNumber(gRaw.sv, 0),
    execution: toNumber(gRaw.execution, 0), escore: toNumber(gRaw.escore, 0), myscore: toNumber(gRaw.myscore, 0),
    competition_d: toNumber(gRaw.competition_d, 0), competition_e: toNumber(gRaw.competition_e, 0),
    competition_sb: toNumber(gRaw.competition_sb, 0), competition_nd: toNumber(gRaw.competition_nd, 0), competition_score: toNumber(gRaw.competition_score, 0),
    comments: gRaw.comments ?? '', delta: toNumber(gRaw.delta, 0), vault: gRaw.vault ?? '',
    vault_description: gRaw.vault_description ?? '', vault_value: toNumber(gRaw.vault_value, 0),
    starred: !!(gRaw.starred === true || gRaw.starred === 1),
    created_at: gRaw.created_at ?? gRaw.createdAt ?? new Date().toISOString()
  } as Gymnast;

  const imagesRaw = item?.images || item?.fotos || item?.imagesData || [];
  const images: ImageExportData[] = [];
  if (Array.isArray(imagesRaw)) {
    for (const imgEntry of imagesRaw) {
      const normalized = normalizeImageEntry(imgEntry);
      if (normalized) images.push(normalized);
    }
  }

  const tracesRaw = item?.traces || item?.trazos || [];
  const traces: WhiteboardTrace[] = [];
  if (Array.isArray(tracesRaw)) {
    for (const t of tracesRaw) traces.push(normalizeTraceEntry(t));
  }

  return {
    gymnast,
    images,
    traces
  };
}

function normalizeCompetitionEntry(item: any): CompetitionExportData {
  const compRaw = item?.competition || item?.competence || item || {};

  const competition: any = {
    id: toNumber(compRaw.id, 0),
    name: compRaw.name ?? compRaw.nombre ?? compRaw.title ?? '',
    description: compRaw.description ?? compRaw.descripcion ?? '',
    date: compRaw.date ?? compRaw.fecha ?? new Date().toISOString(),
    gender: !!(compRaw.gender ?? compRaw.male ?? compRaw.masculino),
    folder_id: toNumber(compRaw.folder_id ?? compRaw.folderId ?? 0),
    number_of_participants: toNumber(compRaw.number_of_participants ?? compRaw.numberOfParticipants ?? 0),
    created_at: compRaw.created_at ?? compRaw.createdAt ?? new Date().toISOString()
  } as Competition;

  const gymnastsRaw = item?.gymnasts || item?.gymnastas || item?.participants || [];
  const gymnasts: GymnastExportData[] = [];
  if (Array.isArray(gymnastsRaw)) {
    for (const g of gymnastsRaw) gymnasts.push(normalizeGymnastEntry(g));
  }

  return { competition, gymnasts };
}

function normalizeFolderEntry(item: any): FolderExportData {
  const folderRaw = item?.folder || item || {};

  const folder: any = {
    id: toNumber(folderRaw.id, 0),
    titulo: folderRaw.titulo ?? folderRaw.title ?? folderRaw.name ?? '',
    descripcion: folderRaw.descripcion ?? folderRaw.description ?? '',
    fecha_creacion: folderRaw.fecha_creacion ?? folderRaw.created_at ?? folderRaw.createdAt ?? new Date().toISOString(),
    nivel_profundidad: toNumber(folderRaw.nivel_profundidad ?? folderRaw.level ?? 0),
    parent_folder_id: folderRaw.parent_folder_id ?? folderRaw.parentId ?? null
  } as Folder;

  const subRaw = item?.subfolders || item?.children || [];
  const subfolders: FolderExportData[] = [];
  if (Array.isArray(subRaw)) {
    for (const sf of subRaw) subfolders.push(normalizeFolderEntry(sf));
  }

  const compsRaw = item?.competitions || item?.competences || item?.competencias || [];
  const competitions: CompetitionExportData[] = [];
  if (Array.isArray(compsRaw)) {
    for (const c of compsRaw) competitions.push(normalizeCompetitionEntry(c));
  }

  return { folder, subfolders, competitions };
}

function normalizeExportData(raw: any): ExportData {
  if (!raw) throw new Error('Empty import data');

  // Determine folders array in many possible legacy shapes
  let foldersRaw: any[] = [];
  if (Array.isArray(raw)) {
    foldersRaw = raw;
  } else if (Array.isArray(raw.folders)) {
    foldersRaw = raw.folders;
  } else if (raw.folder && (raw.subfolders || raw.competitions)) {
    foldersRaw = [raw];
  } else if (raw.folder) {
    foldersRaw = [raw];
  } else if (raw.folders && !Array.isArray(raw.folders)) {
    // sometimes nested one-level
    foldersRaw = [raw.folders];
  } else {
    // Fallback: if object looks like a folder
    if (raw.titulo || raw.title || raw.name) {
      foldersRaw = [raw];
    }
  }

  const folders: FolderExportData[] = [];
  for (const f of foldersRaw) folders.push(normalizeFolderEntry(f));

  return {
    version: raw.version ?? '0.0.0',
    exportDate: raw.exportDate ?? raw.export_date ?? new Date().toISOString(),
    folders
  };
}

// ==================== EXPORTACIÓN ====================

/**
 * Exportar folders seleccionados con toda su estructura jerárquica
 */
export async function exportFolders(
  folderIds: number[],
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  try {
    onProgress?.(0, 'Starting export...');
    
    // Usar la instancia de base de datos ya inicializada
    const exportData: ExportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      folders: []
    };

    let totalItems = 0;
    let processedItems = 0;

    // Contar total de items para progress
    for (const folderId of folderIds) {
      totalItems += await countFolderItems(db, folderId);
    }

    // Exportar cada folder raíz seleccionado
    for (const folderId of folderIds) {
      const folderData = await exportFolderRecursive(
        db, 
        folderId, 
        (items) => {
          processedItems += items;
          const progress = Math.round((processedItems / totalItems) * 90); // 0-90%
          onProgress?.(progress, `Exporting data... ${processedItems}/${totalItems}`);
        }
      );
      exportData.folders.push(folderData);
    }

    onProgress?.(90, 'Generating file...');

    // Generar archivo JSON
    const jsonString = String(JSON.stringify(exportData, null, 2));
    const fileName = `gym_export_${Date.now()}.json`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: 'utf8'
    });

    onProgress?.(95, 'Sharing file...');

    // Compartir archivo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Gymnastics Data',
        UTI: 'public.json'
      });
    }

    onProgress?.(100, 'Export completed!');
    
    return filePath;
  } catch (error) {
    console.error('Error en exportación:', error);
    throw new Error(`Error exporting: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Exportar toda la base de datos (todos los folders raíz) como una sola exportación robusta
 */
export async function exportAllFolders(
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  try {
    // Obtener carpetas raíz
    const roots = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM folders WHERE parent_folder_id IS NULL OR parent_folder_id = 0 ORDER BY IFNULL(display_order, id) ASC'
    );
    let folderIds = roots.map(r => r.id);

    if (folderIds.length === 0) {
      // Fallback: exportar todos los folders si no se encontraron raíces
      const all = await db.getAllAsync<{ id: number }>(
        'SELECT id FROM folders ORDER BY IFNULL(display_order, id) ASC'
      );
      folderIds = all.map(r => r.id);
    }

    if (folderIds.length === 0) {
      throw new Error('No folders to export');
    }

    return await exportFolders(folderIds, onProgress);
  } catch (error) {
    console.error('Error exportando todo:', error);
    throw new Error(`Error exporting all: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Contar total de items en un folder (para progress)
 */
async function countFolderItems(database: SQLite.SQLiteDatabase, folderId: number): Promise<number> {
  // Usar la instancia global de la base de datos
  let count = 1; // El folder mismo

  // Contar competencias
  const competitions = await database.getAllAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM competitions WHERE folder_id = ?',
    [folderId]
  );
  count += competitions[0].count;

  // Contar gimnastas en las competencias de este folder
  const gymnasts = await database.getAllAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM gymnasts 
     WHERE competence_id IN (SELECT id FROM competitions WHERE folder_id = ?)`,
    [folderId]
  );
  count += gymnasts[0].count;

  // Contar subfolders recursivamente
  const subfolders = await database.getAllAsync<{ id: number }>(
    'SELECT id FROM folders WHERE parent_folder_id = ?',
    [folderId]
  );

  for (const subfolder of subfolders) {
    count += await countFolderItems(database, subfolder.id);
  }

  return count;
}

/**
 * Exportar un folder con toda su estructura recursiva
 */
async function exportFolderRecursive(
  database: SQLite.SQLiteDatabase,
  folderId: number,
  onItemProcessed: (itemCount: number) => void
): Promise<FolderExportData> {
  // Obtener folder
  const folders = await database.getAllAsync<Folder>(
    'SELECT * FROM folders WHERE id = ?',
    [folderId]
  );

  if (folders.length === 0) {
    throw new Error(`Folder con ID ${folderId} no encontrado`);
  }

  const folder = folders[0];
  onItemProcessed(1);

  const folderData: FolderExportData = {
    folder,
    subfolders: [],
    competitions: []
  };

  // Exportar subfolders recursivamente (ordered by display_order to preserve order)
  const subfolders = await database.getAllAsync<Folder>(
    'SELECT * FROM folders WHERE parent_folder_id = ? ORDER BY IFNULL(display_order, id) ASC',
    [folderId]
  );

  for (const subfolder of subfolders) {
    const subfolderData = await exportFolderRecursive(database, subfolder.id, onItemProcessed);
    folderData.subfolders.push(subfolderData);
  }

  // Exportar competencias (ordered by display_order to preserve order)
  const competitions = await database.getAllAsync<Competition>(
    'SELECT * FROM competitions WHERE folder_id = ? ORDER BY IFNULL(display_order, id) ASC',
    [folderId]
  );

  for (const competition of competitions) {
    const competitionData = await exportCompetition(database, competition, onItemProcessed);
    folderData.competitions.push(competitionData);
  }

  return folderData;
}

/**
 * Exportar una competencia con todos sus gimnastas
 */
async function exportCompetition(
  database: SQLite.SQLiteDatabase,
  competition: Competition,
  onItemProcessed: (itemCount: number) => void
): Promise<CompetitionExportData> {
  onItemProcessed(1);

  const competitionData: CompetitionExportData = {
    competition,
    gymnasts: []
  };

  // Obtener gimnastas
  const gymnasts = await database.getAllAsync<Gymnast>(
    'SELECT * FROM gymnasts WHERE competence_id = ? ORDER BY numero',
    [competition.id]
  );

  for (const gymnast of gymnasts) {
    const gymnastData = await exportGymnast(database, gymnast);
    competitionData.gymnasts.push(gymnastData);
    onItemProcessed(1);
  }

  return competitionData;
}

/**
 * Exportar un gimnasta con sus imágenes y trazos
 */
async function exportGymnast(
  database: SQLite.SQLiteDatabase,
  gymnast: Gymnast
): Promise<GymnastExportData> {
  const gymnastData: GymnastExportData = {
    gymnast,
    images: [],
    traces: []
  };

  // Exportar imágenes con datos base64
  const images = await database.getAllAsync<GymnastImage>(
    'SELECT * FROM gymnast_images WHERE gymnast_id = ? ORDER BY order_index',
    [gymnast.id]
  );

  for (const image of images) {
    try {
      // Verificar si el archivo existe antes de leerlo
      const fileInfo = await FileSystem.getInfoAsync(image.image_uri);
      if (!fileInfo.exists) {
        console.warn(`Imagen no encontrada: ${image.image_uri}`);
        continue;
      }

      // Leer imagen como base64 usando EncodingType correcto
      const base64 = await FileSystem.readAsStringAsync(image.image_uri, {
        encoding: 'base64'
      });

      gymnastData.images.push({
        image,
        imageData: base64
      });
    } catch (error) {
      console.warn(`No se pudo leer imagen ${image.image_uri}:`, error);
      // Continuar sin esta imagen
    }
  }

  // Exportar trazos de whiteboard
  const traces = await database.getAllAsync<WhiteboardTrace>(
    'SELECT * FROM whiteboard_traces WHERE gymnast_id = ? ORDER BY order_index',
    [gymnast.id]
  );

  gymnastData.traces = traces;

  return gymnastData;
}

// ==================== IMPORTACIÓN ====================

/**
 * Importar folders desde un archivo JSON
 */
export async function importFolders(
  parentFolderId: number | null, // null = raíz, number = dentro de un folder
  onProgress?: (progress: ImportProgress) => void
): Promise<void> {
  try {
    onProgress?.({
      stage: 'folders',
      current: 0,
      total: 1,
      message: 'Selecting file...'
    });

    // Seleccionar archivo
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return; // User canceled, exit silently
    }

    const fileUri = result.assets[0].uri;

    onProgress?.({
      stage: 'folders',
      current: 0,
      total: 1,
      message: 'Reading file...'
    });

    // Leer archivo
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'utf8'
    });

    // Parse y normalizar para soportar formatos antiguos
    const raw = JSON.parse(fileContent);
    let exportData: ExportData;
    try {
      exportData = normalizeExportData(raw);
    } catch (e) {
      throw new Error('Invalid import file');
    }

    // Usar la instancia de base de datos ya inicializada
    // Contar total de items
    let totalFolders = 0;
    let totalCompetitions = 0;
    let totalGymnasts = 0;

    const countItems = (folders: FolderExportData[]) => {
      for (const folderData of folders) {
        totalFolders++;
        totalCompetitions += folderData.competitions.length;
        for (const comp of folderData.competitions) {
          totalGymnasts += comp.gymnasts.length;
        }
        if (folderData.subfolders.length > 0) {
          countItems(folderData.subfolders);
        }
      }
    };

    countItems(exportData.folders);

    let processedFolders = 0;
    let processedCompetitions = 0;
    let processedGymnasts = 0;

    // Importar folders (cada folder en su propia transacción; limpiar archivos si falla)
    for (const folderData of exportData.folders) {
      const createdFiles: string[] = [];
      try {
        await db.execAsync('BEGIN TRANSACTION');

        await importFolderRecursive(
          db,
          folderData,
          parentFolderId,
          {
            onFolderImported: () => {
              processedFolders++;
              onProgress?.({
                stage: 'folders',
                current: processedFolders,
                total: totalFolders,
                message: `Importing folders... ${processedFolders}/${totalFolders}`
              });
            },
            onCompetitionImported: () => {
              processedCompetitions++;
              onProgress?.({
                stage: 'competitions',
                current: processedCompetitions,
                total: totalCompetitions,
                message: `Importing competitions... ${processedCompetitions}/${totalCompetitions}`
              });
            },
            onGymnastImported: () => {
              processedGymnasts++;
              onProgress?.({
                stage: 'gymnasts',
                current: processedGymnasts,
                total: totalGymnasts,
                message: `Importing gymnasts... ${processedGymnasts}/${totalGymnasts}`
              });
            }
          },
          createdFiles
        );

        await db.execAsync('COMMIT');
      } catch (folderErr) {
        try {
          await db.execAsync('ROLLBACK');
        } catch (rbErr) {
          console.warn('Failed to rollback transaction after import error:', rbErr);
        }

        // Try to remove any files that were written during this folder import
        for (const f of createdFiles) {
          try {
            await FileSystem.deleteAsync(f, { idempotent: true });
          } catch (delErr) {
            console.warn('Failed to delete imported file during rollback:', f, delErr);
          }
        }

        // Re-throw to abort the entire import (keeps previous behavior)
        throw folderErr;
      }
    }

    onProgress?.({
      stage: 'complete',
      current: 1,
      total: 1,
      message: 'Import completed successfully!'
    });

  } catch (error) {
    console.error('Error en importación:', error);
    throw new Error(`Error importing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Wrapper para importar todo el archivo en la raíz (alias para compatibilidad)
 */
export async function importAllFolders(
  onProgress?: (progress: ImportProgress) => void
): Promise<void> {
  return importFolders(null, onProgress);
}

interface ImportCallbacks {
  onFolderImported: () => void;
  onCompetitionImported: () => void;
  onGymnastImported: () => void;
}

/**
 * Importar un folder con toda su estructura recursiva
 */
async function importFolderRecursive(
  database: SQLite.SQLiteDatabase,
  folderData: FolderExportData,
  parentFolderId: number | null,
  callbacks: ImportCallbacks,
  createdFiles?: string[]
): Promise<number> {
  // Validar que folderData tenga la estructura correcta
  if (!folderData || !folderData.folder || typeof folderData.folder !== 'object') {
    console.warn('Invalid folder data, skipping');
    return -1;
  }

  // Get the next display_order for folders at this level
  // Use try-catch to handle case where display_order column might not exist yet
  let nextDisplayOrder = 1;
  try {
    if (parentFolderId === null) {
      // Root level folders
      const maxOrder = await database.getFirstAsync<{max_order: number | null}>(
        'SELECT MAX(IFNULL(display_order, id)) as max_order FROM folders WHERE parent_folder_id IS NULL OR parent_folder_id = 0'
      );
      nextDisplayOrder = (maxOrder?.max_order ?? 0) + 1;
    } else {
      // Subfolders
      const maxOrder = await database.getFirstAsync<{max_order: number | null}>(
        'SELECT MAX(IFNULL(display_order, id)) as max_order FROM folders WHERE parent_folder_id = ?',
        [parentFolderId]
      );
      nextDisplayOrder = (maxOrder?.max_order ?? 0) + 1;
    }
  } catch (error) {
    // If display_order doesn't exist, use count + 1
    console.log('display_order column not found, using fallback for folder order');
    if (parentFolderId === null) {
      const count = await database.getFirstAsync<{cnt: number}>('SELECT COUNT(*) as cnt FROM folders WHERE parent_folder_id IS NULL OR parent_folder_id = 0');
      nextDisplayOrder = (count?.cnt ?? 0) + 1;
    } else {
      const count = await database.getFirstAsync<{cnt: number}>('SELECT COUNT(*) as cnt FROM folders WHERE parent_folder_id = ?', [parentFolderId]);
      nextDisplayOrder = (count?.cnt ?? 0) + 1;
    }
  }

  // Crear folder (sin el ID original, with new display_order)
  // Try with display_order first, fallback to without if column doesn't exist
  let newFolderId: number;
  try {
    const result = await database.runAsync(
      `INSERT INTO folders (titulo, descripcion, fecha_creacion, nivel_profundidad, parent_folder_id, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        folderData.folder.titulo,
        folderData.folder.descripcion,
        folderData.folder.fecha_creacion,
        parentFolderId === null ? 0 : (folderData.folder.nivel_profundidad || 0),
        parentFolderId,
        nextDisplayOrder
      ]
    );
    newFolderId = result.lastInsertRowId;
  } catch (insertError) {
    // Fallback: insert without display_order
    console.log('Inserting folder without display_order column');
    const result = await database.runAsync(
      `INSERT INTO folders (titulo, descripcion, fecha_creacion, nivel_profundidad, parent_folder_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        folderData.folder.titulo,
        folderData.folder.descripcion,
        folderData.folder.fecha_creacion,
        parentFolderId === null ? 0 : (folderData.folder.nivel_profundidad || 0),
        parentFolderId
      ]
    );
    newFolderId = result.lastInsertRowId;
  }

  callbacks.onFolderImported();

  // Importar competencias de este folder
  for (const competitionData of folderData.competitions || []) {
    await importCompetition(database, competitionData, newFolderId, callbacks, createdFiles);
  }

  // Importar subfolders recursivamente
  for (const subfolderData of folderData.subfolders || []) {
    await importFolderRecursive(database, subfolderData, newFolderId, callbacks, createdFiles);
  }

  return newFolderId;
}

/**
 * Importar una competencia con todos sus gimnastas
 */
async function importCompetition(
  database: SQLite.SQLiteDatabase,
  competitionData: CompetitionExportData,
  newFolderId: number,
  callbacks: ImportCallbacks,
  createdFiles?: string[]
): Promise<number> {
  const comp = competitionData.competition;

  // Validar que competitionData tenga la estructura correcta
  if (!comp || typeof comp !== 'object') {
    console.warn('Invalid competition data, skipping');
    return -1;
  }

  // Get the next display_order for competitions in this folder
  // Use try-catch to handle case where display_order column might not exist yet
  let nextDisplayOrder = 1;
  try {
    const maxOrder = await database.getFirstAsync<{max_order: number | null}>(
      'SELECT MAX(IFNULL(display_order, id)) as max_order FROM competitions WHERE folder_id = ?',
      [newFolderId]
    );
    nextDisplayOrder = (maxOrder?.max_order ?? 0) + 1;
  } catch (error) {
    // If display_order doesn't exist, use count + 1
    console.log('display_order column not found, using fallback for competition order');
    const count = await database.getFirstAsync<{cnt: number}>('SELECT COUNT(*) as cnt FROM competitions WHERE folder_id = ?', [newFolderId]);
    nextDisplayOrder = (count?.cnt ?? 0) + 1;
  }

  // Crear competencia with new display_order
  // Try with display_order first, fallback to without if column doesn't exist
  let newCompetitionId: number;
  try {
    const result = await database.runAsync(
      `INSERT INTO competitions (name, description, date, gender, folder_id, number_of_participants, created_at, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        comp.name,
        comp.description,
        comp.date,
        comp.gender ? 1 : 0,
        newFolderId,
        comp.number_of_participants,
        comp.created_at,
        nextDisplayOrder
      ]
    );
    newCompetitionId = result.lastInsertRowId;
  } catch (insertError) {
    // Fallback: insert without display_order
    console.log('Inserting competition without display_order column');
    const result = await database.runAsync(
      `INSERT INTO competitions (name, description, date, gender, folder_id, number_of_participants, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        comp.name,
        comp.description,
        comp.date,
        comp.gender ? 1 : 0,
        newFolderId,
        comp.number_of_participants,
        comp.created_at
      ]
    );
    newCompetitionId = result.lastInsertRowId;
  }

  callbacks.onCompetitionImported();

  // Importar gimnastas
  for (const gymnastData of competitionData.gymnasts || []) {
    await importGymnast(database, gymnastData, newCompetitionId, createdFiles);
    callbacks.onGymnastImported();
  }

  return newCompetitionId;
}

/**
 * Importar un gimnasta con sus imágenes y trazos
 */
async function importGymnast(
  database: SQLite.SQLiteDatabase,
  gymnastData: GymnastExportData,
  newCompetitionId: number,
  createdFiles?: string[]
): Promise<number> {
  const g = gymnastData.gymnast;

  // Validar que gymnastData tenga la estructura correcta
  if (!g || typeof g !== 'object') {
    console.warn('Invalid gymnast data, skipping');
    return -1;
  }

  // Crear gimnasta
  // Nota: `starred` puede venir como boolean o como 0/1 según la versión del export.
  const starredValue = (g as any).starred === true || (g as any).starred === 1 ? 1 : 0;

  // Try inserting with `starred` column first; fallback for older DB schema.
  let result: { lastInsertRowId: number };
  try {
    result = await database.runAsync(
      `INSERT INTO gymnasts (
        competence_id, numero, gymnasta, evento, noc, bib,
        a, b, c, d, e, f, g, h, i, j,
        number_of_element, difficulty_values,
        element_group1, element_group2, element_group3, element_group4, element_group_total,
        cv, bonus, nd, sv, execution, escore, myscore,
        competition_d, competition_e, competition_sb, competition_nd, competition_score,
        comments, delta, vault, vault_description, vault_value, starred, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newCompetitionId, g.numero, g.gymnasta, g.evento, g.noc, g.bib,
        g.a, g.b, g.c, g.d, g.e, g.f, g.g, g.h, g.i, g.j,
        g.number_of_element, g.difficulty_values,
        g.element_group1, g.element_group2, g.element_group3, g.element_group4, g.element_group_total,
        g.cv, g.bonus, g.nd, g.sv, g.execution, g.escore, g.myscore,
        g.competition_d, g.competition_e, g.competition_sb, g.competition_nd, g.competition_score,
        g.comments, g.delta, g.vault, g.vault_description, g.vault_value, starredValue, g.created_at
      ]
    );
  } catch (insertError) {
    console.log('Inserting gymnast without starred column');
    result = await database.runAsync(
      `INSERT INTO gymnasts (
        competence_id, numero, gymnasta, evento, noc, bib,
        a, b, c, d, e, f, g, h, i, j,
        number_of_element, difficulty_values,
        element_group1, element_group2, element_group3, element_group4, element_group_total,
        cv, bonus, nd, sv, execution, escore, myscore,
        competition_d, competition_e, competition_sb, competition_nd, competition_score,
        comments, delta, vault, vault_description, vault_value, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newCompetitionId, g.numero, g.gymnasta, g.evento, g.noc, g.bib,
        g.a, g.b, g.c, g.d, g.e, g.f, g.g, g.h, g.i, g.j,
        g.number_of_element, g.difficulty_values,
        g.element_group1, g.element_group2, g.element_group3, g.element_group4, g.element_group_total,
        g.cv, g.bonus, g.nd, g.sv, g.execution, g.escore, g.myscore,
        g.competition_d, g.competition_e, g.competition_sb, g.competition_nd, g.competition_score,
        g.comments, g.delta, g.vault, g.vault_description, g.vault_value, g.created_at
      ]
    );
  }

  const newGymnastId = result.lastInsertRowId;

  // Importar imágenes
  const cacheDir = `${FileSystem.documentDirectory}imported_images/`;
  await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});

  for (const imageData of gymnastData.images || []) {
    // Guardar imagen desde base64
    const fileName = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const newImageUri = `${cacheDir}${fileName}`;

    try {
      // Intenta escribir el archivo; si falla, registrar y continuar
      await FileSystem.writeAsStringAsync(newImageUri, imageData.imageData, {
        encoding: 'base64'
      });
    } catch (writeErr) {
      console.warn('Error writing image file during import, skipping image:', writeErr);
      continue; // skip creating DB record for this image
    }

    // Registrar el archivo creado para poder limpiarlo en caso de rollback
    if (createdFiles) createdFiles.push(newImageUri);

    // Crear registro de imagen en la BD; si falla aquí, dejar que la excepción se propague
    await database.runAsync(
      `INSERT INTO gymnast_images (gymnast_id, image_uri, position_x, position_y, rotation, scale, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        newGymnastId,
        newImageUri,
        imageData.image.position_x,
        imageData.image.position_y,
        imageData.image.rotation,
        imageData.image.scale,
        imageData.image.order_index
      ]
    );
  }

  // Importar trazos de whiteboard
  for (const trace of gymnastData.traces || []) {
    await database.runAsync(
      `INSERT INTO whiteboard_traces (gymnast_id, trace_data, color, stroke_width, pen_type, order_index)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        newGymnastId,
        trace.trace_data,
        trace.color,
        trace.stroke_width,
        trace.pen_type,
        trace.order_index
      ]
    );
  }

  return newGymnastId;
}

/**
 * Validar archivo de importación antes de importar
 */
export async function validateImportFile(fileUri: string): Promise<{
  valid: boolean;
  error?: string;
  summary?: {
    version: string;
    folderCount: number;
    competitionCount: number;
    gymnastCount: number;
  };
}> {
  try {
    const jsonString = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'utf8'
    });

    // Parse y normalizar para soportar formatos antiguos
    const raw = JSON.parse(jsonString);
    let exportData: ExportData;
    try {
      exportData = normalizeExportData(raw);
    } catch (e) {
      return { valid: false, error: 'Invalid file format' };
    }

    // Contar items
    let folderCount = 0;
    let competitionCount = 0;
    let gymnastCount = 0;

    const count = (folders: FolderExportData[]) => {
      for (const folderData of folders) {
        folderCount++;
        competitionCount += folderData.competitions.length;
        for (const comp of folderData.competitions) {
          gymnastCount += comp.gymnasts.length;
        }
        if (folderData.subfolders.length > 0) {
          count(folderData.subfolders);
        }
      }
    };

    count(exportData.folders);

    return {
      valid: true,
      summary: {
        version: exportData.version,
        folderCount,
        competitionCount,
        gymnastCount
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
