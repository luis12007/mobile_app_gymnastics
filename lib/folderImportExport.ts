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
    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `gym_export_${Date.now()}.json`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType.UTF8
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
        encoding: FileSystem.EncodingType.Base64
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
      throw new Error('Import canceled');
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
      encoding: 'utf8' as any
    });

    const exportData: ExportData = JSON.parse(fileContent);

    // Validar versión
    if (!exportData.version || !exportData.folders) {
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

    // Importar folders
    for (const folderData of exportData.folders) {
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
        }
      );
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
  callbacks: ImportCallbacks
): Promise<number> {
  try {
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
    try {
      await importCompetition(database, competitionData, newFolderId, callbacks);
    } catch (compError) {
      console.warn('Error importing competition, continuing with others:', compError);
    }
  }

  // Importar subfolders recursivamente
  for (const subfolderData of folderData.subfolders || []) {
    try {
      await importFolderRecursive(database, subfolderData, newFolderId, callbacks);
    } catch (subfolderError) {
      console.warn('Error importing subfolder, continuing with others:', subfolderError);
    }
  }

  return newFolderId;
  } catch (error) {
    console.error('Error importing folder:', error);
    // Return -1 to indicate failure but don't crash the app
    return -1;
  }
}

/**
 * Importar una competencia con todos sus gimnastas
 */
async function importCompetition(
  database: SQLite.SQLiteDatabase,
  competitionData: CompetitionExportData,
  newFolderId: number,
  callbacks: ImportCallbacks
): Promise<number> {
  try {
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
    try {
      await importGymnast(db, gymnastData, newCompetitionId);
      callbacks.onGymnastImported();
    } catch (gymnastError) {
      console.warn('Error importing gymnast, continuing with others:', gymnastError);
      callbacks.onGymnastImported(); // Still count as processed
    }
  }

  return newCompetitionId;
  } catch (error) {
    console.error('Error importing competition:', error);
    // Return -1 to indicate failure but don't crash the app
    return -1;
  }
}

/**
 * Importar un gimnasta con sus imágenes y trazos
 */
async function importGymnast(
  database: SQLite.SQLiteDatabase,
  gymnastData: GymnastExportData,
  newCompetitionId: number
): Promise<number> {
  try {
    const g = gymnastData.gymnast;

    // Validar que gymnastData tenga la estructura correcta
    if (!g || typeof g !== 'object') {
      console.warn('Invalid gymnast data, skipping');
      return -1;
    }

    // Crear gimnasta
    const result = await database.runAsync(
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

  const newGymnastId = result.lastInsertRowId;

  // Importar imágenes
  const cacheDir = `${FileSystem.documentDirectory}imported_images/`;
  await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});

  for (const imageData of gymnastData.images || []) {
    try {
      // Guardar imagen desde base64
      const fileName = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const newImageUri = `${cacheDir}${fileName}`;

      // Usar EncodingType correcto para escribir archivo base64
      await FileSystem.writeAsStringAsync(newImageUri, imageData.imageData, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Crear registro de imagen
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
    } catch (error) {
      console.warn('Error importando imagen:', error);
      // Continuar con las demás imágenes
    }
  }

  // Importar trazos de whiteboard
  for (const trace of gymnastData.traces || []) {
    try {
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
    } catch (traceError) {
      console.warn('Error importing trace:', traceError);
      // Continue with other traces
    }
  }

  return newGymnastId;
  } catch (error) {
    console.error('Error importing gymnast:', error);
    // Return -1 to indicate failure but don't crash
    return -1;
  }
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
      encoding: FileSystem.EncodingType.UTF8
    });

    const exportData: ExportData = JSON.parse(jsonString);

    if (!exportData.version || !exportData.folders) {
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
