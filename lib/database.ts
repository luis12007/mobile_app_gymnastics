import * as SQLite from 'expo-sqlite';

// Open or create the database
export const db = SQLite.openDatabaseSync('gym_judge.db');

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
  PEN_COLOR: 'pen_color',
  PEN_STROKE: 'pen_stroke',
  PEN_TYPE: 'pen_type',
} as const;

// Valores por defecto
const DEFAULT_SETTINGS = {
  [APP_SETTINGS_KEYS.DISCIPLINE]: 'WAG',
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
 * Inicializar la base de datos con todas las tablas
 */
export async function initDatabase() {
  try {
    console.log('Initializing database...');
    
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
        folder_id INTEGER NOT NULL,
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
        vault TEXT,
        vault_description TEXT,
        vault_value REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_gymnast_folder 
      ON gymnasts(folder_id);
      
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
      'SELECT * FROM folders WHERE parent_folder_id IS NULL ORDER BY fecha_creacion DESC'
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
          `INSERT INTO gymnasts (folder_id, numero, gymnasta, evento, noc, bib) 
           VALUES (?, ?, '', '', '', '')`,
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
      `INSERT INTO gymnasts (folder_id, numero, gymnasta, evento, noc, bib) 
       VALUES (?, ?, ?, ?, ?, ?)`,
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
      'SELECT * FROM gymnasts WHERE folder_id = ? ORDER BY numero ASC',
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
    
    if (fields.length === 0) return;
    
    values.push(id);
    
    await db.runAsync(
      `UPDATE gymnasts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    console.log(`Gimnasta actualizado: ID ${id}`);
  } catch (error) {
    console.error('Error al actualizar gimnasta:', error);
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
