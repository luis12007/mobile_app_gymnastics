import * as SQLite from 'expo-sqlite';

// Open or create the database
// Using openDatabaseSync for immediate synchronous access
// This is compatible with both sync and async methods in expo-sqlite 16
export const db = SQLite.openDatabaseSync('gym_judge.db');

let initDatabasePromise: Promise<void> | null = null;

// Tipos
export interface Folder {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_creacion: string;
  nivel_profundidad: number;
  parent_folder_id: number | null; // null si es carpeta raíz
}

export interface AppSettings {
  id: number;
  key: string;
  value: string;
}

export interface Gymnast {
  id: number;
  competence_id: number;
  numero: number;
  gymnasta: string;
  evento: string;
  noc: string;
  bib: string;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
  i: number;
  j: number;
  number_of_element: number;
  difficulty_values: number;
  element_group1: number;
  element_group2: number;
  element_group3: number;
  element_group4: number;
  element_group_total: number;
  cv: number;
  bonus: number;
  nd: number;
  sv: number;
  execution: number;
  escore: number;
  myscore: number;
  competition_d: number;
  competition_e: number;
  competition_sb: number;
  competition_nd: number;
  competition_score: number;
  comments: string;
  delta: number;
  percentage: number;
  dedded: number;
  vault: string;
  vault_description: string;
  vault_value: number;
  created_at: string;
}

export interface GymnastImage {
  id: number;
  gymnast_id: number;
  image_uri: string;
  position_x: number;
  position_y: number;
  rotation: number;
  scale: number;
  order_index: number;
}

export interface WhiteboardTrace {
  id: number;
  gymnast_id: number;
  trace_data: string; // JSON array de puntos/paths
  color: string;
  stroke_width: number;
  pen_type: string;
  order_index: number;
}

export interface Competition {
  id: number;
  name: string;
  description: string;
  date: string;
  gender: boolean; // true = masculino, false = femenino
  folder_id: number;
  number_of_participants: number;
  created_at: string;
}

// Configuración global de la app
export const APP_SETTINGS_KEYS = {
  DISCIPLINE: 'discipline',
  DISCIPLINE_SELECTED: 'discipline_selected',
  PEN_COLOR: 'pen_color',
  PEN_STROKE: 'pen_stroke',
  PEN_TYPE: 'pen_type',
} as const;

// Valores por defecto
const DEFAULT_SETTINGS = {
  [APP_SETTINGS_KEYS.DISCIPLINE]: 'WAG',
  [APP_SETTINGS_KEYS.DISCIPLINE_SELECTED]: '0',
  [APP_SETTINGS_KEYS.PEN_COLOR]: '#000000',
  [APP_SETTINGS_KEYS.PEN_STROKE]: '2',
  [APP_SETTINGS_KEYS.PEN_TYPE]: 'normal',
};

/**
 * Resetear la base de datos (eliminar todas las tablas)
 */
export async function resetDatabase() {
  try {
    console.log('Reseteando base de datos...');
    
    await db.execAsync(`
      DROP TABLE IF EXISTS whiteboard_traces;
      DROP TABLE IF EXISTS gymnast_images;
      DROP TABLE IF EXISTS gymnasts;
      DROP TABLE IF EXISTS competitions;
      DROP TABLE IF EXISTS app_settings;
      DROP TABLE IF EXISTS folders;
    `);
    
    console.log('Base de datos reseteada exitosamente');
  } catch (error) {
    console.error('Error al resetear la base de datos:', error);
    throw error;
  }
}

/**
 * Migrar tabla folders para agregar parent_folder_id si no existe
 */
async function migrateFoldersTable() {
  try {
    // Verificar si la tabla existe
    const tableInfo = await db.getAllAsync<any>(
      "PRAGMA table_info(folders)"
    );
    
    if (tableInfo.length === 0) {
      // La tabla no existe, se creará en initDatabase
      console.log('folders table does not exist, will be created');
      return;
    }
    
    // Verificar columnas que faltan
    const hasParentFolderId = tableInfo.some((col: any) => col.name === 'parent_folder_id');
    const hasNivelProfundidad = tableInfo.some((col: any) => col.name === 'nivel_profundidad');
    const hasFechaCreacion = tableInfo.some((col: any) => col.name === 'fecha_creacion');
    
    let needsMigration = !hasParentFolderId || !hasNivelProfundidad || !hasFechaCreacion;
    
    if (needsMigration) {
      console.log('Migrating folders table: recreating with all required columns...');
      
      try {
        // Intentar guardar datos existentes
        let oldData: any[] = [];
        try {
          // Construir query dinámicamente basado en columnas existentes
          const existingColumns = tableInfo.map((col: any) => col.name);
          const selectColumns = ['id', 'titulo'];
          
          if (existingColumns.includes('descripcion')) selectColumns.push('descripcion');
          if (existingColumns.includes('fecha_creacion')) selectColumns.push('fecha_creacion');
          
          const query = `SELECT ${selectColumns.join(', ')} FROM folders`;
          oldData = await db.getAllAsync<any>(query);
          console.log(`Found ${oldData.length} existing folders to migrate`);
        } catch (readError) {
          console.log('Could not read old data, will start fresh');
        }
        
        // Eliminar tabla antigua
        await db.execAsync('DROP TABLE IF EXISTS folders');
        console.log('Old folders table dropped');
        
        // Crear tabla nueva con estructura completa
        await db.execAsync(`
          CREATE TABLE folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            nivel_profundidad INTEGER NOT NULL DEFAULT 0,
            parent_folder_id INTEGER,
            FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE
          );
          
          CREATE INDEX IF NOT EXISTS idx_parent_folder 
          ON folders(parent_folder_id);
          
          CREATE INDEX IF NOT EXISTS idx_nivel_profundidad 
          ON folders(nivel_profundidad);
        `);
        console.log('New folders table created');
        
        // Restaurar datos si existían
        if (oldData.length > 0) {
          for (const folder of oldData) {
            await db.runAsync(
              `INSERT INTO folders (titulo, descripcion, fecha_creacion, nivel_profundidad, parent_folder_id) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                folder.titulo || 'Unnamed Folder',
                folder.descripcion || '',
                folder.fecha_creacion || new Date().toISOString(),
                0,
                null
              ]
            );
          }
          console.log(`Restored ${oldData.length} folders`);
        }
        
        console.log('folders table migrated successfully');
      } catch (recreateError) {
        console.error('Error recreating folders table:', recreateError);
        throw recreateError;
      }
    } else {
      console.log('folders table already has all required columns');
    }
  } catch (error) {
    console.error('Error migrating folders table:', error);
    // No lanzar error aquí para permitir que initDatabase continúe
  }
}

/**
 * Migrar tabla app_settings si tiene estructura antigua
 */
async function migrateAppSettings() {
  try {
    // Verificar si la tabla existe y su estructura
    const tableInfo = await db.getAllAsync<any>(
      "PRAGMA table_info(app_settings)"
    );
    
    if (tableInfo.length === 0) {
      // La tabla no existe, se creará en initDatabase
      console.log('app_settings table does not exist, will be created');
      return;
    }
    
    // Verificar si tiene la columna 'key'
    const hasKeyColumn = tableInfo.some((col: any) => col.name === 'key');
    
    if (!hasKeyColumn) {
      console.log('Migrating app_settings table from old structure...');
      
      // Guardar datos antiguos si existen
      const oldData = await db.getAllAsync<any>('SELECT * FROM app_settings');
      
      // Eliminar tabla antigua
      await db.execAsync('DROP TABLE IF EXISTS app_settings');
      
      // Crear nueva tabla con estructura correcta
      await db.execAsync(`
        CREATE TABLE app_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL
        );
        
        CREATE UNIQUE INDEX idx_settings_key ON app_settings(key);
      `);
      
      console.log('app_settings table migrated successfully');
    }
  } catch (error) {
    console.error('Error migrating app_settings:', error);
    // No lanzar error aquí, continuar con initDatabase
  }
}

/**
 * Migrar tabla gymnasts para renombrar folder_id a competence_id
 */
async function migrateGymnastsTable() {
  try {
    // Verificar si la tabla existe
    const tableInfo = await db.getAllAsync<any>(
      "PRAGMA table_info(gymnasts)"
    );
    
    if (tableInfo.length === 0) {
      // La tabla no existe, se creará en initDatabase
      console.log('gymnasts table does not exist, will be created');
      return;
    }
    
    // Verificar si tiene folder_id en lugar de competence_id
    const hasFolderId = tableInfo.some((col: any) => col.name === 'folder_id');
    const hasCompetenceId = tableInfo.some((col: any) => col.name === 'competence_id');
    
    if (hasFolderId && !hasCompetenceId) {
      console.log('Migrating gymnasts table: renaming folder_id to competence_id...');
      
      // Renombrar columna usando ALTER TABLE
      await db.execAsync(`
        ALTER TABLE gymnasts RENAME COLUMN folder_id TO competence_id;
      `);
      
      console.log('gymnasts table migrated successfully');
    }
  } catch (error) {
    console.error('Error migrating gymnasts table:', error);
    // Si falla el rename, intentar recrear la tabla
    try {
      console.log('Attempting to recreate gymnasts table...');
      
      // Guardar datos
      const oldData = await db.getAllAsync<any>('SELECT * FROM gymnasts');
      
      // Eliminar tabla antigua
      await db.execAsync('DROP TABLE IF EXISTS gymnasts');
      
      // Crear nueva tabla (se hará en initDatabase)
      console.log('Old gymnasts table dropped, will be recreated');
      
      // Si había datos, advertir que se perdieron
      if (oldData.length > 0) {
        console.warn(`Warning: ${oldData.length} gymnast records existed and will need to be recreated`);
      }
    } catch (recreateError) {
      console.error('Error recreating gymnasts table:', recreateError);
    }
  }
}

/**
 * Migrar tabla gymnasts para agregar columnas percentage y dedded
 */
async function migrateGymnastsAddPercentageAndDedded() {
  try {
    const tableInfo = await db.getAllAsync<any>(
      "PRAGMA table_info(gymnasts)"
    );
    
    if (tableInfo.length === 0) {
      console.log('gymnasts table does not exist, will be created');
      return;
    }
    
    const hasPercentage = tableInfo.some((col: any) => col.name === 'percentage');
    const hasDedded = tableInfo.some((col: any) => col.name === 'dedded');
    
    if (!hasPercentage) {
      console.log('Adding percentage column to gymnasts table...');
      await db.execAsync(`
        ALTER TABLE gymnasts ADD COLUMN percentage REAL DEFAULT 0;
      `);
      console.log('percentage column added successfully');
    }
    
    if (!hasDedded) {
      console.log('Adding dedded column to gymnasts table...');
      await db.execAsync(`
        ALTER TABLE gymnasts ADD COLUMN dedded REAL DEFAULT 0;
      `);
      console.log('dedded column added successfully');
    }
  } catch (error) {
    console.error('Error adding percentage/dedded columns:', error);
  }
}

/**
 * Inicializar la base de datos con todas las tablas
 */
export async function initDatabase() {
  if (initDatabasePromise) return initDatabasePromise;

  initDatabasePromise = (async () => {
    try {
      console.log('Initializing database...');

      // Migrar folders si es necesario
      await migrateFoldersTable();

      // Migrar app_settings si es necesario
      await migrateAppSettings();

      // Migrar gymnasts si es necesario
      await migrateGymnastsTable();

      // Agregar columnas percentage y dedded si es necesario
      await migrateGymnastsAddPercentageAndDedded();

      await db.execAsync(`
      -- Tabla de carpetas
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        nivel_profundidad INTEGER NOT NULL DEFAULT 0,
        parent_folder_id INTEGER,
        FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_parent_folder 
      ON folders(parent_folder_id);
      
      CREATE INDEX IF NOT EXISTS idx_nivel_profundidad 
      ON folders(nivel_profundidad);
      
      -- Tabla de configuración
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key 
      ON app_settings(key);
      
      -- Tabla de competencias
      CREATE TABLE IF NOT EXISTS competitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        gender INTEGER NOT NULL DEFAULT 0,
        folder_id INTEGER NOT NULL,
        number_of_participants INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_competition_folder 
      ON competitions(folder_id);
      
      CREATE INDEX IF NOT EXISTS idx_competition_date 
      ON competitions(date);
      
      -- Tabla de gimnastas
      CREATE TABLE IF NOT EXISTS gymnasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competence_id INTEGER NOT NULL,
        numero INTEGER,
        gymnasta TEXT NOT NULL,
        evento TEXT,
        noc TEXT,
        bib TEXT,
        a REAL DEFAULT 0,
        b REAL DEFAULT 0,
        c REAL DEFAULT 0,
        d REAL DEFAULT 0,
        e REAL DEFAULT 0,
        f REAL DEFAULT 0,
        g REAL DEFAULT 0,
        h REAL DEFAULT 0,
        i REAL DEFAULT 0,
        j REAL DEFAULT 0,
        number_of_element INTEGER DEFAULT 0,
        difficulty_values REAL DEFAULT 0,
        element_group1 REAL DEFAULT 0,
        element_group2 REAL DEFAULT 0,
        element_group3 REAL DEFAULT 0,
        element_group4 REAL DEFAULT 0,
        element_group_total REAL DEFAULT 0,
        cv REAL DEFAULT 0,
        bonus REAL DEFAULT 0,
        nd REAL DEFAULT 0,
        sv REAL DEFAULT 0,
        execution REAL DEFAULT 0,
        escore REAL DEFAULT 0,
        myscore REAL DEFAULT 0,
        competition_d REAL DEFAULT 0,
        competition_e REAL DEFAULT 0,
        competition_sb REAL DEFAULT 0,
        competition_nd REAL DEFAULT 0,
        competition_score REAL DEFAULT 0,
        comments TEXT,
        delta REAL DEFAULT 0,
        percentage REAL DEFAULT 0,
        dedded REAL DEFAULT 0,
        vault TEXT,
        vault_description TEXT,
        vault_value REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competence_id) REFERENCES competitions(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_gymnast_competition 
      ON gymnasts(competence_id);
      
      CREATE INDEX IF NOT EXISTS idx_gymnast_evento 
      ON gymnasts(evento);
      
      -- Tabla de imágenes de gimnastas
      CREATE TABLE IF NOT EXISTS gymnast_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gymnast_id INTEGER NOT NULL,
        image_uri TEXT NOT NULL,
        position_x REAL DEFAULT 0,
        position_y REAL DEFAULT 0,
        rotation REAL DEFAULT 0,
        scale REAL DEFAULT 1,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (gymnast_id) REFERENCES gymnasts(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_image_gymnast 
      ON gymnast_images(gymnast_id);
      
      -- Tabla de trazos del whiteboard
      CREATE TABLE IF NOT EXISTS whiteboard_traces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gymnast_id INTEGER NOT NULL,
        trace_data TEXT NOT NULL,
        color TEXT DEFAULT '#000000',
        stroke_width REAL DEFAULT 2,
        pen_type TEXT DEFAULT 'normal',
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (gymnast_id) REFERENCES gymnasts(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_trace_gymnast 
      ON whiteboard_traces(gymnast_id);
    `);

      // Inicializar valores por defecto si no existen
      await initializeDefaultSettings();

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  })();

  try {
    await initDatabasePromise;
    return;
  } catch (error) {
    // Allow retry on next call if initialization failed.
    initDatabasePromise = null;
    throw error;
  }
}

// ==================== CONFIGURACIÓN GLOBAL ====================

/**
 * Inicializar configuración por defecto
 */
async function initializeDefaultSettings() {
  try {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const exists = await db.getFirstAsync<AppSettings>(
        'SELECT * FROM app_settings WHERE key = ?',
        [key]
      );
      
      if (!exists) {
        await db.runAsync(
          'INSERT INTO app_settings (key, value) VALUES (?, ?)',
          [key, value]
        );
      }
    }
  } catch (error) {
    console.error('Error al inicializar configuración por defecto:', error);
    throw error;
  }
}

/**
 * Obtener valor de configuración
 */
export async function getSetting(key: string): Promise<string | null> {
  try {
    await initDatabase();
    const result = await db.getFirstAsync<AppSettings>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    );
    return result?.value || null;
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    throw error;
  }
}

/**
 * Establecer valor de configuración
 */
export async function setSetting(key: string, value: string): Promise<void> {
  try {
    await initDatabase();
    await db.runAsync(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
    console.log(`Configuración actualizada: ${key} = ${value}`);
  } catch (error) {
    console.error('Error al establecer configuración:', error);
    throw error;
  }
}

/**
 * Obtener todas las configuraciones
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    await initDatabase();
    const settings = await db.getAllAsync<AppSettings>(
      'SELECT key, value FROM app_settings'
    );
    
    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    
    return result;
  } catch (error) {
    console.error('Error al obtener todas las configuraciones:', error);
    throw error;
  }
}

// ==================== HELPERS DE CONFIGURACIÓN ====================

/**
 * Obtener disciplina actual
 */
export async function getDiscipline(): Promise<string> {
  const value = await getSetting(APP_SETTINGS_KEYS.DISCIPLINE);
  return value || DEFAULT_SETTINGS[APP_SETTINGS_KEYS.DISCIPLINE];
}

/**
 * Establecer disciplina
 */
export async function setDiscipline(discipline: string): Promise<void> {
  await setSetting(APP_SETTINGS_KEYS.DISCIPLINE, discipline);
  await setSetting(APP_SETTINGS_KEYS.DISCIPLINE_SELECTED, '1');
}

/**
 * Obtener color del pen
 */
export async function getPenColor(): Promise<string> {
  const value = await getSetting(APP_SETTINGS_KEYS.PEN_COLOR);
  return value || DEFAULT_SETTINGS[APP_SETTINGS_KEYS.PEN_COLOR];
}

/**
 * Establecer color del pen
 */
export async function setPenColor(color: string): Promise<void> {
  await setSetting(APP_SETTINGS_KEYS.PEN_COLOR, color);
}

/**
 * Obtener grosor del pen
 */
export async function getPenStroke(): Promise<number> {
  const value = await getSetting(APP_SETTINGS_KEYS.PEN_STROKE);
  return parseInt(value || DEFAULT_SETTINGS[APP_SETTINGS_KEYS.PEN_STROKE]);
}

/**
 * Establecer grosor del pen
 */
export async function setPenStroke(stroke: number): Promise<void> {
  await setSetting(APP_SETTINGS_KEYS.PEN_STROKE, stroke.toString());
}

/**
 * Obtener tipo del pen
 */
export async function getPenType(): Promise<string> {
  const value = await getSetting(APP_SETTINGS_KEYS.PEN_TYPE);
  return value || DEFAULT_SETTINGS[APP_SETTINGS_KEYS.PEN_TYPE];
}

/**
 * Establecer tipo del pen
 */
export async function setPenType(type: string): Promise<void> {
  await setSetting(APP_SETTINGS_KEYS.PEN_TYPE, type);
}

// ==================== CRUD DE CARPETAS ====================

/**
 * Crear una nueva carpeta
 */
export async function createFolder(
  titulo: string,
  descripcion: string = '',
  parentFolderId: number | null = null
): Promise<number> {
  try {
    // Calcular el nivel de profundidad
    let nivel = 0;
    if (parentFolderId !== null) {
      const parent = await getFolderById(parentFolderId);
      if (parent) {
        nivel = parent.nivel_profundidad + 1;
      }
    }

    const result = await db.runAsync(
      `INSERT INTO folders (titulo, descripcion, nivel_profundidad, parent_folder_id) 
       VALUES (?, ?, ?, ?)`,
      [titulo, descripcion, nivel, parentFolderId]
    );

    console.log(`Carpeta creada: ${titulo} (ID: ${result.lastInsertRowId})`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error al crear carpeta:', error);
    throw error;
  }
}

/**
 * Obtener una carpeta por ID
 */
export async function getFolderById(id: number): Promise<Folder | null> {
  try {
    const result = await db.getFirstAsync<Folder>(
      'SELECT * FROM folders WHERE id = ?',
      [id]
    );
    return result || null;
  } catch (error) {
    console.error('Error al obtener carpeta:', error);
    throw error;
  }
}

/**
 * Obtener todas las carpetas raíz (nivel 0, sin parent)
 */
export async function getRootFolders(): Promise<Folder[]> {
  try {
    const result = await db.getAllAsync<Folder>(
      // Some legacy data may store root as 0 instead of NULL.
      'SELECT * FROM folders WHERE parent_folder_id IS NULL OR parent_folder_id = 0 ORDER BY fecha_creacion DESC'
    );
    return result;
  } catch (error) {
    console.error('Error al obtener carpetas raíz:', error);
    throw error;
  }
}

/**
 * Obtener todas las subcarpetas de una carpeta padre
 */
export async function getSubfolders(parentFolderId: number): Promise<Folder[]> {
  try {
    const result = await db.getAllAsync<Folder>(
      'SELECT * FROM folders WHERE parent_folder_id = ? ORDER BY fecha_creacion DESC',
      [parentFolderId]
    );
    return result;
  } catch (error) {
    console.error('Error al obtener subcarpetas:', error);
    throw error;
  }
}

/**
 * Obtener todas las carpetas
 */
export async function getAllFolders(): Promise<Folder[]> {
  try {
    const result = await db.getAllAsync<Folder>(
      'SELECT * FROM folders ORDER BY nivel_profundidad, fecha_creacion DESC'
    );
    return result;
  } catch (error) {
    console.error('Error al obtener todas las carpetas:', error);
    throw error;
  }
}

/**
 * Actualizar una carpeta
 */
export async function updateFolder(
  id: number,
  titulo: string,
  descripcion: string = ''
): Promise<void> {
  try {
    await db.runAsync(
      'UPDATE folders SET titulo = ?, descripcion = ? WHERE id = ?',
      [titulo, descripcion, id]
    );
    console.log(`Carpeta actualizada: ID ${id}`);
  } catch (error) {
    console.error('Error al actualizar carpeta:', error);
    throw error;
  }
}

/**
 * Mover una carpeta a otro parent (cambiar jerarquía)
 */
export async function moveFolder(
  folderId: number,
  newParentId: number | null
): Promise<void> {
  try {
    // Validar que no se cree un ciclo (carpeta no puede ser su propio ancestro)
    if (newParentId !== null) {
      const isDescendant = await isFolderDescendant(newParentId, folderId);
      if (isDescendant) {
        throw new Error('No se puede mover una carpeta a una de sus subcarpetas');
      }
    }

    // Calcular nuevo nivel
    let newLevel = 0;
    if (newParentId !== null) {
      const parent = await getFolderById(newParentId);
      if (parent) {
        newLevel = parent.nivel_profundidad + 1;
      }
    }

    await db.runAsync(
      'UPDATE folders SET parent_folder_id = ?, nivel_profundidad = ? WHERE id = ?',
      [newParentId, newLevel, folderId]
    );

    // Actualizar niveles de subcarpetas recursivamente
    await updateSubfoldersLevel(folderId, newLevel);

    console.log(`Carpeta movida: ID ${folderId} -> Parent ${newParentId}`);
  } catch (error) {
    console.error('Error al mover carpeta:', error);
    throw error;
  }
}

/**
 * Eliminar una carpeta (y todas sus subcarpetas por CASCADE)
 */
export async function deleteFolder(id: number): Promise<void> {
  try {
    await db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
    console.log(`Carpeta eliminada: ID ${id}`);
  } catch (error) {
    console.error('Error al eliminar carpeta:', error);
    throw error;
  }
}

/**
 * Obtener el path completo de una carpeta (breadcrumb)
 */
export async function getFolderPath(folderId: number): Promise<Folder[]> {
  try {
    const path: Folder[] = [];
    let currentId: number | null = folderId;

    while (currentId !== null) {
      const folder = await getFolderById(currentId);
      if (!folder) break;
      path.unshift(folder); // Agregar al inicio
      currentId = folder.parent_folder_id;
    }

    return path;
  } catch (error) {
    console.error('Error al obtener path de carpeta:', error);
    throw error;
  }
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Verificar si folder1 es descendiente de folder2
 */
async function isFolderDescendant(
  folder1: number,
  folder2: number
): Promise<boolean> {
  let currentId: number | null = folder1;

  while (currentId !== null) {
    if (currentId === folder2) return true;
    const folder = await getFolderById(currentId);
    if (!folder) break;
    currentId = folder.parent_folder_id;
  }

  return false;
}

/**
 * Actualizar niveles de todas las subcarpetas recursivamente
 */
async function updateSubfoldersLevel(
  parentId: number,
  parentLevel: number
): Promise<void> {
  const subfolders = await getSubfolders(parentId);
  const newLevel = parentLevel + 1;

  for (const subfolder of subfolders) {
    await db.runAsync(
      'UPDATE folders SET nivel_profundidad = ? WHERE id = ?',
      [newLevel, subfolder.id]
    );
    // Recursión para subcarpetas
    await updateSubfoldersLevel(subfolder.id, newLevel);
  }
}

// ==================== CRUD DE COMPETENCIAS ====================

/**
 * Crear una nueva competencia
 */
export async function createCompetition(
  name: string,
  description: string,
  date: string,
  gender: boolean,
  folderId: number,
  numberOfParticipants: number = 0
): Promise<number> {
  try {
    const result = await db.runAsync(
      `INSERT INTO competitions (name, description, date, gender, folder_id, number_of_participants) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, date, gender ? 1 : 0, folderId, numberOfParticipants]
    );

    const competitionId = result.lastInsertRowId;
    console.log(`Competencia creada: ${name} (ID: ${competitionId})`);

    // Crear gimnastas vacíos según el número de participantes
    if (numberOfParticipants > 0) {
      for (let i = 1; i <= numberOfParticipants; i++) {
        await db.runAsync(
          `INSERT INTO gymnasts (competence_id, numero, gymnasta, evento, noc, bib, element_group1, element_group2, element_group3, element_group4, element_group_total, sv) 
           VALUES (?, ?, '', '', '', '', 0.5, 0.5, 0.5, 0.5, 2.0, 2.0)`,
          [competitionId, i]
        );
      }
      console.log(`${numberOfParticipants} gimnastas creados para competencia ${competitionId}`);
    }

    return competitionId;
  } catch (error) {
    console.error('Error al crear competencia:', error);
    throw error;
  }
}

/**
 * Obtener una competencia por ID
 */
export async function getCompetitionById(id: number): Promise<Competition | null> {
  try {
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM competitions WHERE id = ?',
      [id]
    );
    
    if (!result) return null;
    
    return {
      ...result,
      gender: result.gender === 1,
    };
  } catch (error) {
    console.error('Error al obtener competencia:', error);
    throw error;
  }
}

/**
 * Obtener todas las competencias de una carpeta
 */
export async function getCompetitionsByFolder(folderId: number): Promise<Competition[]> {
  try {
    const results = await db.getAllAsync<any>(
      'SELECT * FROM competitions WHERE folder_id = ? ORDER BY date DESC',
      [folderId]
    );
    
    return results.map(r => ({
      ...r,
      gender: r.gender === 1,
    }));
  } catch (error) {
    console.error('Error al obtener competencias de carpeta:', error);
    throw error;
  }
}

/**
 * Actualizar una competencia
 */
export async function updateCompetition(
  id: number,
  data: Partial<Omit<Competition, 'id' | 'created_at'>>
): Promise<void> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.gender !== undefined) {
      fields.push('gender = ?');
      values.push(data.gender ? 1 : 0);
    }
    if (data.folder_id !== undefined) {
      fields.push('folder_id = ?');
      values.push(data.folder_id);
    }
    if (data.number_of_participants !== undefined) {
      fields.push('number_of_participants = ?');
      values.push(data.number_of_participants);
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    
    await db.runAsync(
      `UPDATE competitions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    console.log(`Competencia actualizada: ID ${id}`);
  } catch (error) {
    console.error('Error al actualizar competencia:', error);
    throw error;
  }
}

/**
 * Eliminar una competencia
 */
export async function deleteCompetition(id: number): Promise<void> {
  try {
    await db.runAsync('DELETE FROM competitions WHERE id = ?', [id]);
    console.log(`Competencia eliminada: ID ${id}`);
  } catch (error) {
    console.error('Error al eliminar competencia:', error);
    throw error;
  }
}

// ==================== GIMNASTAS ====================

/**
 * Crear un nuevo gimnasta
 */
export async function createGymnast(
  competenceId: number,
  numero: number,
  gymnasta: string,
  evento?: string,
  noc?: string,
  bib?: string
): Promise<number> {
  try {
    const result = await db.runAsync(
      `INSERT INTO gymnasts (competence_id, numero, gymnasta, evento, noc, bib, element_group1, element_group2, element_group3, element_group4, element_group_total) 
       VALUES (?, ?, ?, ?, ?, ?, 0.5, 0.5, 0.5, 0.5, 2.0)`,
      [competenceId, numero, gymnasta, evento || '', noc || '', bib || '']
    );
    
    console.log(`Gimnasta creado: ID ${result.lastInsertRowId}`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error al crear gimnasta:', error);
    throw error;
  }
}

/**
 * Obtener todos los gimnastas de una competencia
 */
export async function getGymnastsByCompetition(competenceId: number): Promise<Gymnast[]> {
  try {
    const results = await db.getAllAsync<Gymnast>(
      'SELECT * FROM gymnasts WHERE competence_id = ? ORDER BY numero ASC',
      [competenceId]
    );
    
    return results;
  } catch (error) {
    console.error('Error al obtener gimnastas:', error);
    throw error;
  }
}

/**
 * Obtener un gimnasta por ID
 */
export async function getGymnastById(id: number): Promise<Gymnast | null> {
  try {
    const result = await db.getFirstAsync<Gymnast>(
      'SELECT * FROM gymnasts WHERE id = ?',
      [id]
    );
    
    return result || null;
  } catch (error) {
    console.error('Error al obtener gimnasta:', error);
    throw error;
  }
}

/**
 * Actualizar un gimnasta
 */
export async function updateGymnast(
  id: number,
  data: Partial<Omit<Gymnast, 'id' | 'created_at'>>
): Promise<void> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    // Basic info
    if (data.numero !== undefined) {
      fields.push('numero = ?');
      values.push(data.numero);
    }
    if (data.gymnasta !== undefined) {
      fields.push('gymnasta = ?');
      values.push(data.gymnasta);
    }
    if (data.evento !== undefined) {
      fields.push('evento = ?');
      values.push(data.evento);
    }
    if (data.noc !== undefined) {
      fields.push('noc = ?');
      values.push(data.noc);
    }
    if (data.bib !== undefined) {
      fields.push('bib = ?');
      values.push(data.bib);
    }
    
    // Difficulty elements (A-J)
    if (data.a !== undefined) {
      fields.push('a = ?');
      values.push(data.a);
    }
    if (data.b !== undefined) {
      fields.push('b = ?');
      values.push(data.b);
    }
    if (data.c !== undefined) {
      fields.push('c = ?');
      values.push(data.c);
    }
    if (data.d !== undefined) {
      fields.push('d = ?');
      values.push(data.d);
    }
    if (data.e !== undefined) {
      fields.push('e = ?');
      values.push(data.e);
    }
    if (data.f !== undefined) {
      fields.push('f = ?');
      values.push(data.f);
    }
    if (data.g !== undefined) {
      fields.push('g = ?');
      values.push(data.g);
    }
    if (data.h !== undefined) {
      fields.push('h = ?');
      values.push(data.h);
    }
    if (data.i !== undefined) {
      fields.push('i = ?');
      values.push(data.i);
    }
    if (data.j !== undefined) {
      fields.push('j = ?');
      values.push(data.j);
    }
    
    // Calculated difficulty values
    if (data.number_of_element !== undefined) {
      fields.push('number_of_element = ?');
      values.push(data.number_of_element);
    }
    if (data.difficulty_values !== undefined) {
      fields.push('difficulty_values = ?');
      values.push(data.difficulty_values);
    }
    
    // Element groups
    if (data.element_group1 !== undefined) {
      fields.push('element_group1 = ?');
      values.push(data.element_group1);
    }
    if (data.element_group2 !== undefined) {
      fields.push('element_group2 = ?');
      values.push(data.element_group2);
    }
    if (data.element_group3 !== undefined) {
      fields.push('element_group3 = ?');
      values.push(data.element_group3);
    }
    if (data.element_group4 !== undefined) {
      fields.push('element_group4 = ?');
      values.push(data.element_group4);
    }
    if (data.element_group_total !== undefined) {
      fields.push('element_group_total = ?');
      values.push(data.element_group_total);
    }
    
    // Scores and deductions
    if (data.cv !== undefined) {
      fields.push('cv = ?');
      values.push(data.cv);
    }
    if (data.bonus !== undefined) {
      fields.push('bonus = ?');
      values.push(data.bonus);
    }
    if (data.nd !== undefined) {
      fields.push('nd = ?');
      values.push(data.nd);
    }
    if (data.sv !== undefined) {
      fields.push('sv = ?');
      values.push(data.sv);
    }
    if (data.execution !== undefined) {
      fields.push('execution = ?');
      values.push(data.execution);
    }
    if (data.escore !== undefined) {
      fields.push('escore = ?');
      values.push(data.escore);
    }
    if (data.myscore !== undefined) {
      fields.push('myscore = ?');
      values.push(data.myscore);
    }
    
    // Competition scores
    if (data.competition_d !== undefined) {
      fields.push('competition_d = ?');
      values.push(data.competition_d);
    }
    if (data.competition_e !== undefined) {
      fields.push('competition_e = ?');
      values.push(data.competition_e);
    }
    if (data.competition_sb !== undefined) {
      fields.push('competition_sb = ?');
      values.push(data.competition_sb);
    }
    if (data.competition_nd !== undefined) {
      fields.push('competition_nd = ?');
      values.push(data.competition_nd);
    }
    if (data.competition_score !== undefined) {
      fields.push('competition_score = ?');
      values.push(data.competition_score);
    }
    
    // Comments and delta
    if (data.comments !== undefined) {
      fields.push('comments = ?');
      values.push(data.comments);
    }
    if (data.delta !== undefined) {
      fields.push('delta = ?');
      values.push(data.delta);
    }
    if (data.percentage !== undefined) {
      fields.push('percentage = ?');
      values.push(data.percentage);
    }
    if (data.dedded !== undefined) {
      fields.push('dedded = ?');
      values.push(data.dedded);
    }
    
    // Vault specific
    if (data.vault !== undefined) {
      fields.push('vault = ?');
      values.push(data.vault);
    }
    if (data.vault_description !== undefined) {
      fields.push('vault_description = ?');
      values.push(data.vault_description);
    }
    if (data.vault_value !== undefined) {
      fields.push('vault_value = ?');
      values.push(data.vault_value);
    }
    
    if (fields.length === 0) {
      console.log('No fields to update for gymnast ID', id);
      return;
    }
    
    values.push(id);
    
    const sql = `UPDATE gymnasts SET ${fields.join(', ')} WHERE id = ?`;
    console.log('Executing SQL:', sql);
    console.log('With values:', values);
    
    await db.runAsync(sql, values);
    
    console.log(`✅ Gimnasta actualizado exitosamente: ID ${id}, ${fields.length} campos actualizados`);
  } catch (error) {
    console.error('❌ Error al actualizar gimnasta:', error);
    throw error;
  }
}

/**
 * Eliminar un gimnasta
 */
export async function deleteGymnast(id: number): Promise<void> {
  try {
    await db.runAsync('DELETE FROM gymnasts WHERE id = ?', [id]);
    console.log(`Gimnasta eliminado: ID ${id}`);
  } catch (error) {
    console.error('Error al eliminar gimnasta:', error);
    throw error;
  }
}

// ==================== CRUD DE IMAGES Y TRACES ====================

/**
 * Obtener todas las imágenes de un gimnasta
 */
export async function getGymnastImages(gymnastId: number): Promise<GymnastImage[]> {
  try {
    const results = await db.getAllAsync<GymnastImage>(
      'SELECT * FROM gymnast_images WHERE gymnast_id = ? ORDER BY order_index',
      [gymnastId]
    );
    return results || [];
  } catch (error) {
    console.error('Error al obtener imágenes de gimnasta:', error);
    return [];
  }
}

/**
 * Obtener todos los trazos del whiteboard de un gimnasta
 */
export async function getGymnastTraces(gymnastId: number): Promise<WhiteboardTrace[]> {
  try {
    const results = await db.getAllAsync<WhiteboardTrace>(
      'SELECT * FROM whiteboard_traces WHERE gymnast_id = ? ORDER BY order_index',
      [gymnastId]
    );
    return results || [];
  } catch (error) {
    console.error('Error al obtener trazos de gimnasta:', error);
    return [];
  }
}

/**
 * Obtener los trazos del whiteboard como string JSON consolidado
 */
export async function getGymnastTracesAsJSON(gymnastId: number): Promise<string> {
  try {
    const traces = await getGymnastTraces(gymnastId);
    if (!traces || traces.length === 0) return '';
    
    // Convertir trazos al formato esperado por el whiteboard
    const pathsData = traces.map(trace => {
      try {
        const traceData = JSON.parse(trace.trace_data);
        return {
          path: traceData.path || traceData,
          color: trace.color,
          strokeWidth: trace.stroke_width,
          penType: trace.pen_type
        };
      } catch (e) {
        console.warn('Error parsing trace data:', e);
        return null;
      }
    }).filter(Boolean);
    
    return JSON.stringify(pathsData);
  } catch (error) {
    console.error('Error al obtener trazos como JSON:', error);
    return '';
  }
}
