/**
 * SQLite Database Layer for Gym Judge App
 * 
 * Migración desde AsyncStorage a SQLite para resolver:
 * - CursorWindow overflow en Android
 * - Corrupción de datos que bloquea todo el almacenamiento
 * - Mejor performance con grandes volúmenes de datos
 * - Aislamiento: si 1 registro se corrompe, los demás siguen accesibles
 */

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { Alert } from 'react-native';

// ==================== CONFIGURACIÓN ====================
const DB_NAME = 'gym_judge.db';
const DB_VERSION = 1;

// Directorios para archivos externos (paths grandes, imágenes)
const PATHS_DIR = `${FileSystem.documentDirectory}whiteboard_paths/`;
const PHOTOS_DIR = `${FileSystem.documentDirectory}main_table_photos/`;

// Umbrales para externalización
const LARGE_FIELD_THRESHOLD = 40_000; // ~40KB
const LARGE_IMAGE_INLINE_THRESHOLD = 20_000; // ~20KB

// ==================== INTERFACES ====================
interface User {
  id: number;
  username: string;
  password: string;
  rol: string;
}

interface Folder {
  id: number;
  userId: number;
  name: string;
  description: string;
  type: boolean;
  date: string;
  filled: boolean;
  position?: number;
  parentId?: number | null;
  level?: number;
}

interface Session {
  id: number;
  gender: boolean;
  userId: number;
}

interface Competence {
  id: number;
  name: string;
  description: string;
  date: string;
  type: string;
  gender: boolean;
  sessionId: number;
  folderId: number;
  userId: number;
  numberOfParticipants: number;
}

interface MainTable {
  id: number;
  competenceId: number;
  number: number;
  name: string;
  event: string;
  noc: string;
  bib: string;
  j: number;
  i: number;
  h: number;
  g: number;
  f: number;
  e: number;
  d: number;
  c: number;
  b: number;
  a: number;
  dv: number;
  eg: number;
  sb: number;
  nd: number;
  cv: number;
  sv: number;
  e2: number;
  d3: number;
  e3: number;
  delt: number;
  percentage: number;
  stickBonus: boolean;
  numberOfElements: number;
  difficultyValues: number;
  elementGroups1: number;
  elementGroups2: number;
  elementGroups3: number;
  elementGroups4: number;
  elementGroups5: number;
  execution: number;
  eScore: number;
  myScore: number;
  compD: number;
  compE: number;
  compSd: number;
  compNd: number;
  compScore: number;
  comments: string;
  paths: string;
  ded: number;
  dedexecution: number;
  vaultNumber: string;
  vaultDescription: string;
  startValue: number;
  description: string;
  score: number;
}

interface MainRateGeneral {
  id: number;
  tableId: number;
  stickBonus: boolean;
  numberOfElements: number;
  difficultyValues: number;
  elementGroups1: number;
  elementGroups2: number;
  elementGroups3: number;
  elementGroups4: number;
  elementGroups5: number;
  execution: number;
  eScore: number;
  myScore: number;
  compD: number;
  compE: number;
  compSd: number;
  compNd: number;
  compScore: number;
  comments: string;
  paths: string;
  ded: number;
  dedexecution: number;
  vaultNumber: string;
  vaultDescription: string;
  images?: string;
}

interface MainRateJump {
  id: number;
  tableId: number;
  stickBonus: boolean;
  vaultNumber: number;
  startValue: number;
  description: string;
  execution: number;
  myScore: number;
  compD: number;
  compE: number;
  compSd: number;
  compNd: number;
  score: number;
}

interface ActivatedDevice {
  id: number;
  deviceId: string;
  activationKey: string;
  activatedAt: number;
  createdBy: number | null;
}

export interface MainTablePhotoItem {
  uri: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface MainTablePhotos {
  id: number;
  tableId: number;
  photos: string; // JSON array de MainTablePhotoItem
}

// ==================== DATABASE INITIALIZATION ====================
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Abre o crea la base de datos SQLite
 */
const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log('✅ SQLite Database opened successfully');
    return db;
  } catch (error) {
    console.error('❌ Error opening database:', error);
    throw error;
  }
};

/**
 * Crea todas las tablas de la base de datos
 */
const createTables = async (): Promise<void> => {
  const database = await openDatabase();
  
  try {
    // Usar transacción para crear todas las tablas
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      
      -- Tabla de usuarios
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        rol TEXT NOT NULL DEFAULT 'user'
      );
      
      -- Tabla de dispositivos activados
      CREATE TABLE IF NOT EXISTS activated_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deviceId TEXT NOT NULL UNIQUE,
        activationKey TEXT NOT NULL,
        activatedAt INTEGER NOT NULL,
        createdBy INTEGER,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
      );
      
      -- Tabla de carpetas
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type INTEGER NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        filled INTEGER NOT NULL DEFAULT 0,
        position INTEGER DEFAULT 0,
        parentId INTEGER,
        level INTEGER DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parentId) REFERENCES folders(id) ON DELETE CASCADE
      );
      
      -- Tabla de sesiones
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gender INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
      
      -- Tabla de competencias
      CREATE TABLE IF NOT EXISTS competences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        gender INTEGER NOT NULL,
        sessionId INTEGER NOT NULL,
        folderId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        numberOfParticipants INTEGER DEFAULT 0,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
      
      -- Tabla principal de tablas
      CREATE TABLE IF NOT EXISTS main_tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competenceId INTEGER NOT NULL,
        number INTEGER DEFAULT 0,
        name TEXT,
        event TEXT,
        noc TEXT,
        bib TEXT,
        j REAL DEFAULT 0,
        i REAL DEFAULT 0,
        h REAL DEFAULT 0,
        g REAL DEFAULT 0,
        f REAL DEFAULT 0,
        e REAL DEFAULT 0,
        d REAL DEFAULT 0,
        c REAL DEFAULT 0,
        b REAL DEFAULT 0,
        a REAL DEFAULT 0,
        dv REAL DEFAULT 0,
        eg REAL DEFAULT 0,
        sb REAL DEFAULT 0,
        nd REAL DEFAULT 0,
        cv REAL DEFAULT 0,
        sv REAL DEFAULT 0,
        e2 REAL DEFAULT 0,
        d3 REAL DEFAULT 0,
        e3 REAL DEFAULT 0,
        delt REAL DEFAULT 0,
        percentage REAL DEFAULT 0,
        stickBonus INTEGER DEFAULT 0,
        numberOfElements REAL DEFAULT 0,
        difficultyValues REAL DEFAULT 0,
        elementGroups1 REAL DEFAULT 0,
        elementGroups2 REAL DEFAULT 0,
        elementGroups3 REAL DEFAULT 0,
        elementGroups4 REAL DEFAULT 0,
        elementGroups5 REAL DEFAULT 0,
        execution REAL DEFAULT 0,
        eScore REAL DEFAULT 0,
        myScore REAL DEFAULT 0,
        compD REAL DEFAULT 0,
        compE REAL DEFAULT 0,
        compSd REAL DEFAULT 0,
        compNd REAL DEFAULT 0,
        compScore REAL DEFAULT 0,
        comments TEXT,
        paths TEXT,
        ded REAL DEFAULT 0,
        dedexecution REAL DEFAULT 0,
        vaultNumber TEXT,
        vaultDescription TEXT,
        startValue REAL DEFAULT 0,
        description TEXT,
        score REAL DEFAULT 0,
        FOREIGN KEY (competenceId) REFERENCES competences(id) ON DELETE CASCADE
      );
      
      -- Tabla de calificaciones generales
      CREATE TABLE IF NOT EXISTS rate_general (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tableId INTEGER NOT NULL,
        stickBonus INTEGER DEFAULT 0,
        numberOfElements REAL DEFAULT 0,
        difficultyValues REAL DEFAULT 0,
        elementGroups1 REAL DEFAULT 0,
        elementGroups2 REAL DEFAULT 0,
        elementGroups3 REAL DEFAULT 0,
        elementGroups4 REAL DEFAULT 0,
        elementGroups5 REAL DEFAULT 0,
        execution REAL DEFAULT 0,
        eScore REAL DEFAULT 0,
        myScore REAL DEFAULT 0,
        compD REAL DEFAULT 0,
        compE REAL DEFAULT 0,
        compSd REAL DEFAULT 0,
        compNd REAL DEFAULT 0,
        compScore REAL DEFAULT 0,
        comments TEXT,
        paths TEXT,
        ded REAL DEFAULT 0,
        dedexecution REAL DEFAULT 0,
        vaultNumber TEXT,
        vaultDescription TEXT,
        images TEXT,
        FOREIGN KEY (tableId) REFERENCES main_tables(id) ON DELETE CASCADE
      );
      
      -- Tabla de calificaciones de salto
      CREATE TABLE IF NOT EXISTS rate_jump (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tableId INTEGER NOT NULL,
        stickBonus INTEGER DEFAULT 0,
        vaultNumber REAL DEFAULT 0,
        startValue REAL DEFAULT 0,
        description TEXT,
        execution REAL DEFAULT 0,
        myScore REAL DEFAULT 0,
        compD REAL DEFAULT 0,
        compE REAL DEFAULT 0,
        compSd REAL DEFAULT 0,
        compNd REAL DEFAULT 0,
        score REAL DEFAULT 0,
        FOREIGN KEY (tableId) REFERENCES main_tables(id) ON DELETE CASCADE
      );
      
      -- Tabla de fotos de main_table
      CREATE TABLE IF NOT EXISTS main_table_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tableId INTEGER NOT NULL,
        photos TEXT NOT NULL,
        FOREIGN KEY (tableId) REFERENCES main_tables(id) ON DELETE CASCADE
      );
      
      -- Tabla de configuración de la app
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        defaultDiscipline INTEGER,
        lastUpdated INTEGER NOT NULL
      );
      
      -- Índices para mejorar performance
      CREATE INDEX IF NOT EXISTS idx_folders_userId ON folders(userId);
      CREATE INDEX IF NOT EXISTS idx_folders_parentId ON folders(parentId);
      CREATE INDEX IF NOT EXISTS idx_competences_folderId ON competences(folderId);
      CREATE INDEX IF NOT EXISTS idx_competences_userId ON competences(userId);
      CREATE INDEX IF NOT EXISTS idx_main_tables_competenceId ON main_tables(competenceId);
      CREATE INDEX IF NOT EXISTS idx_rate_general_tableId ON rate_general(tableId);
      CREATE INDEX IF NOT EXISTS idx_rate_jump_tableId ON rate_jump(tableId);
      CREATE INDEX IF NOT EXISTS idx_main_table_photos_tableId ON main_table_photos(tableId);
    `);
    
    console.log('✅ All tables created successfully with indexes');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

// ==================== UTILIDADES DE ARCHIVOS ====================
const ensureDirAsync = async (dirUri: string) => {
  try {
    const info = await FileSystem.getInfoAsync(dirUri);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    }
  } catch (e) {
    console.warn('ensureDirAsync error:', e);
  }
};

const isFileRef = (value?: string | null): boolean => {
  if (!value) return false;
  return value.startsWith('file://') || value.startsWith('content://');
};

const makePathsFileUri = (tableId: number) => 
  `${PATHS_DIR}main_${tableId}_paths_${Date.now()}.json`;

const writeStringToFile = async (uri: string, content: string): Promise<string> => {
  await ensureDirAsync(PATHS_DIR);
  await FileSystem.writeAsStringAsync(uri, content);
  return uri;
};

const readStringFromFile = async (uri: string): Promise<string> => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return '[]';
    return await FileSystem.readAsStringAsync(uri);
  } catch (e) {
    console.warn('readStringFromFile error:', e);
    return '[]';
  }
};

const deleteFileIfExists = async (uri: string): Promise<void> => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    // ignore
  }
};

// ==================== MANEJO ROBUSTO DE ERRORES ====================
/**
 * Ejecuta una query SQL con manejo de errores robusto
 * Si falla, retorna array vacío en lugar de lanzar error
 */
const safeQuery = async <T>(
  query: string,
  params: any[] = []
): Promise<T[]> => {
  try {
    const database = await openDatabase();
    const result = await database.getAllAsync<T>(query, params);
    return result || [];
  } catch (error) {
    console.error('❌ Safe query error:', query, error);
    return [];
  }
};

/**
 * Ejecuta un comando SQL con manejo de errores
 */
const safeExecute = async (
  query: string,
  params: any[] = []
): Promise<boolean> => {
  try {
    const database = await openDatabase();
    await database.runAsync(query, params);
    return true;
  } catch (error) {
    console.error('❌ Safe execute error:', query, error);
    return false;
  }
};

/**
 * Ejecuta múltiples comandos en una transacción
 * Si uno falla, se hace rollback automáticamente
 */
const safeTransaction = async (
  callback: (db: SQLite.SQLiteDatabase) => Promise<void>
): Promise<boolean> => {
  const database = await openDatabase();
  
  try {
    await database.withTransactionAsync(async () => {
      await callback(database);
    });
    return true;
  } catch (error) {
    console.error('❌ Transaction error:', error);
    return false;
  }
};

// ==================== USER FUNCTIONS ====================
export const getUsers = async (): Promise<User[]> => {
  return safeQuery<User>('SELECT * FROM users ORDER BY id');
};

export const getUserById = async (userId: number): Promise<User | null> => {
  const users = await safeQuery<User>('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  return users[0] || null;
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const users = await safeQuery<User>(
    'SELECT * FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  return users[0] || null;
};

export const insertUser = async (
  username: string,
  password: string,
  activationKey?: string,
  deviceId?: string,
  rol: string = 'user'
): Promise<number | false> => {
  try {
    if (!username || !password) {
      console.error('Username and password are required');
      return false;
    }

    // Verificar si el usuario existe
    const existing = await getUserByUsername(username);
    if (existing) {
      console.error('User already exists');
      return false;
    }

    // Validar activación si se proporciona
    if (deviceId && activationKey) {
      const isValid = await validateActivationKey(activationKey, deviceId);
      if (!isValid) {
        console.error('Invalid activation key');
        return false;
      }

      const alreadyActivated = await isDeviceActivated(deviceId);
      if (alreadyActivated) {
        console.error('Device already activated');
        return false;
      }
    }

    const database = await openDatabase();
    const result = await database.runAsync(
      'INSERT INTO users (username, password, rol) VALUES (?, ?, ?)',
      [username, password, rol]
    );

    const userId = result.lastInsertRowId;
    console.log('✅ User inserted with ID:', userId);

    // Registrar dispositivo si se proporcionó
    if (deviceId && activationKey && userId) {
      await registerActivatedDevice(deviceId, activationKey, userId);
    }

    return userId;
  } catch (error) {
    console.error('❌ Error inserting user:', error);
    return false;
  }
};

export const insertUserWithoutValidation = async (
  username: string,
  password: string,
  rol: string = 'user'
): Promise<number | false> => {
  try {
    if (!username || !password) return false;

    const existing = await getUserByUsername(username);
    if (existing) {
      console.error('User already exists');
      return false;
    }

    const database = await openDatabase();
    const result = await database.runAsync(
      'INSERT INTO users (username, password, rol) VALUES (?, ?, ?)',
      [username, password, rol]
    );

    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Error inserting user without validation:', error);
    return false;
  }
};

export const validateUser = async (
  username: string,
  password: string
): Promise<number | false> => {
  try {
    const users = await safeQuery<User>(
      'SELECT * FROM users WHERE username = ? AND password = ? LIMIT 1',
      [username, password]
    );

    if (users.length > 0) {
      console.log('✅ User validated:', users[0].username);
      return users[0].id;
    }

    return false;
  } catch (error) {
    console.error('❌ Error validating user:', error);
    return false;
  }
};

export const updateUser = async (
  userId: number,
  userData: Partial<User>
): Promise<boolean> => {
  try {
    const fields = Object.keys(userData)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    if (!fields) return false;

    const values = Object.entries(userData)
      .filter(([key]) => key !== 'id')
      .map(([, value]) => value);

    const database = await openDatabase();
    await database.runAsync(
      `UPDATE users SET ${fields} WHERE id = ?`,
      [...values, userId]
    );

    console.log('✅ User updated:', userId);
    return true;
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return false;
  }
};

export const deleteUser = async (userId: number): Promise<boolean> => {
  return safeExecute('DELETE FROM users WHERE id = ?', [userId]);
};

export const checkUserExists = async (username: string): Promise<boolean> => {
  const user = await getUserByUsername(username);
  return user !== null;
};

export const fixExistingUsers = async (): Promise<boolean> => {
  // En SQLite con AUTOINCREMENT, no es necesario fix IDs
  return true;
};

// ==================== ACTIVATED DEVICES ====================
export const setupActivatedDevicesTable = async (): Promise<void> => {
  // Ya se crea en createTables()
  console.log('✅ Activated devices table ready');
};

export const isDeviceActivated = async (deviceId: string): Promise<boolean> => {
  const devices = await safeQuery<ActivatedDevice>(
    'SELECT * FROM activated_devices WHERE deviceId = ? LIMIT 1',
    [deviceId]
  );
  return devices.length > 0;
};

export const getActivatedDevices = async (): Promise<ActivatedDevice[]> => {
  return safeQuery<ActivatedDevice>('SELECT * FROM activated_devices ORDER BY id');
};

export const registerActivatedDevice = async (
  deviceId: string,
  activationKey: string,
  userId: number | null = null
): Promise<boolean> => {
  try {
    const isActivated = await isDeviceActivated(deviceId);
    if (isActivated) {
      console.log('Device already activated');
      return false;
    }

    const database = await openDatabase();
    await database.runAsync(
      'INSERT INTO activated_devices (deviceId, activationKey, activatedAt, createdBy) VALUES (?, ?, ?, ?)',
      [deviceId, activationKey, Date.now(), userId]
    );

    console.log('✅ Device registered');
    return true;
  } catch (error) {
    console.error('❌ Error registering device:', error);
    return false;
  }
};

export const validateActivationKey = async (
  key: string,
  deviceId: string
): Promise<boolean> => {
  try {
    const parts = key.split('-');
    if (parts.length !== 3 || parts[0] !== 'GYM') {
      return false;
    }

    const APP_SECRET = 'GymJudge2023SecretKey';

    const validationString = deviceId + APP_SECRET;
    const expectedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      validationString
    );

    const expectedShortHash = expectedHash.substring(0, 8);
    const keyHash = parts[1];

    return keyHash === expectedShortHash;
  } catch (error) {
    console.error('❌ Error validating activation key:', error);
    return false;
  }
};

// ==================== FOLDER FUNCTIONS ====================
export const getFolders = async (): Promise<Folder[]> => {
  const rows = await safeQuery<any>('SELECT * FROM folders ORDER BY position');
  return rows.map(row => ({
    ...row,
    type: row.type === 1,
    filled: row.filled === 1,
  }));
};

export const getFoldersByUserId = async (userId: number): Promise<Folder[]> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM folders WHERE userId = ? ORDER BY position',
    [userId]
  );
  return rows.map(row => ({
    ...row,
    type: row.type === 1,
    filled: row.filled === 1,
  }));
};

export const getFoldersByUserIdSorted = async (userId: number): Promise<Folder[]> => {
  return getFoldersByUserId(userId);
};

export const getFolderById = async (folderId: number): Promise<Folder | null> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM folders WHERE id = ? LIMIT 1',
    [folderId]
  );
  
  if (rows.length === 0) return null;
  
  return {
    ...rows[0],
    type: rows[0].type === 1,
    filled: rows[0].filled === 1,
  };
};

export const insertFolder = async (folderData: Omit<Folder, 'id'>): Promise<number | false> => {
  try {
    const database = await openDatabase();
    
    // Si no hay posición, obtener la máxima + 1
    let position = folderData.position;
    if (position === undefined) {
      const maxPos = await safeQuery<{ maxPos: number }>(
        'SELECT COALESCE(MAX(position), -1) + 1 as maxPos FROM folders'
      );
      position = maxPos[0]?.maxPos || 0;
    }

    const result = await database.runAsync(
      `INSERT INTO folders (userId, name, description, type, date, filled, position, parentId, level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        folderData.userId,
        folderData.name,
        folderData.description || '',
        folderData.type ? 1 : 0,
        folderData.date,
        folderData.filled ? 1 : 0,
        position,
        folderData.parentId || null,
        folderData.level || 0,
      ]
    );

    console.log('✅ Folder inserted with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Error inserting folder:', error);
    return false;
  }
};

export const updateFolder = async (
  folderId: number,
  folderData: Partial<Folder>
): Promise<boolean> => {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    // Lista de columnas válidas en la tabla folders (excluir propiedades calculadas como hasSubfolders, children)
    const validColumns = ['userId', 'name', 'description', 'type', 'date', 'filled', 'position', 'parentId', 'level'];

    Object.entries(folderData).forEach(([key, value]) => {
      if (key === 'id') return;
      
      // Solo actualizar columnas que existen en la tabla
      if (!validColumns.includes(key)) {
        console.log(`⚠️ Skipping non-column field: ${key}`);
        return;
      }
      
      updates.push(`${key} = ?`);
      
      if (key === 'type' || key === 'filled') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    });

    if (updates.length === 0) return false;

    const database = await openDatabase();
    await database.runAsync(
      `UPDATE folders SET ${updates.join(', ')} WHERE id = ?`,
      [...values, folderId]
    );

    console.log('✅ Folder updated:', folderId);
    return true;
  } catch (error) {
    console.error('❌ Error updating folder:', error);
    return false;
  }
};

export const deleteFolder = async (folderId: number): Promise<boolean> => {
  // CASCADE delete eliminará competencias y subcarpetas automáticamente
  return safeExecute('DELETE FROM folders WHERE id = ?', [folderId]);
};

export const reorderFolders = async (
  userId: number,
  fromIndex: number,
  toIndex: number
): Promise<boolean> => {
  try {
    const folders = await getFoldersByUserId(userId);
    
    if (fromIndex < 0 || fromIndex >= folders.length || 
        toIndex < 0 || toIndex >= folders.length) {
      return false;
    }

    const [movedFolder] = folders.splice(fromIndex, 1);
    folders.splice(toIndex, 0, movedFolder);

    // Actualizar posiciones en transacción
    return await safeTransaction(async (db) => {
      for (let i = 0; i < folders.length; i++) {
        await db.runAsync(
          'UPDATE folders SET position = ? WHERE id = ?',
          [i, folders[i].id]
        );
      }
    });
  } catch (error) {
    console.error('❌ Error reordering folders:', error);
    return false;
  }
};

export const updateFolderPosition = async (
  folderId: number,
  newPosition: number
): Promise<boolean> => {
  return safeExecute(
    'UPDATE folders SET position = ? WHERE id = ?',
    [newPosition, folderId]
  );
};

export const getFoldersByUserIdAndParent = async (
  userId: number,
  parentId: number | null = null
): Promise<Folder[]> => {
  const query = parentId === null
    ? 'SELECT * FROM folders WHERE userId = ? AND parentId IS NULL ORDER BY position'
    : 'SELECT * FROM folders WHERE userId = ? AND parentId = ? ORDER BY position';
  
  const params = parentId === null ? [userId] : [userId, parentId];
  const rows = await safeQuery<any>(query, params);
  
  return rows.map(row => ({
    ...row,
    type: row.type === 1,
    filled: row.filled === 1,
  }));
};

export const getRootFoldersByUserId = async (userId: number): Promise<Folder[]> => {
  return getFoldersByUserIdAndParent(userId, null);
};

export const getSubfolders = async (parentId: number): Promise<Folder[]> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM folders WHERE parentId = ? ORDER BY position',
    [parentId]
  );
  
  return rows.map(row => ({
    ...row,
    type: row.type === 1,
    filled: row.filled === 1,
  }));
};

export const getFolderPath = async (folderId: number): Promise<Folder[]> => {
  const path: Folder[] = [];
  let currentId: number | null = folderId;

  while (currentId !== null) {
    const folder = await getFolderById(currentId);
    if (!folder) break;
    
    path.unshift(folder);
    currentId = folder.parentId || null;
  }

  return path;
};

export const canMoveFolder = async (
  folderId: number,
  targetParentId: number | null
): Promise<boolean> => {
  if (folderId === targetParentId) return false;
  if (targetParentId === null) return true;

  const targetPath = await getFolderPath(targetParentId);
  return !targetPath.some(folder => folder.id === folderId);
};

export const getFolderTree = async (
  userId: number,
  parentId: number | null = null,
  level: number = 0
): Promise<any[]> => {
  const folders = await getFoldersByUserIdAndParent(userId, parentId);
  
  const tree = [];
  for (const folder of folders) {
    const children = await getFolderTree(userId, folder.id, level + 1);
    tree.push({
      ...folder,
      level,
      hasSubfolders: children.length > 0,
      children,
    });
  }
  
  return tree;
};

export const countSubfolders = async (parentId: number): Promise<number> => {
  const result = await safeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM folders WHERE parentId = ?',
    [parentId]
  );
  return result[0]?.count || 0;
};

export const hasSubfolders = async (folderId: number): Promise<boolean> => {
  const count = await countSubfolders(folderId);
  return count > 0;
};

export const getMaxFolderDepth = async (userId: number): Promise<number> => {
  const result = await safeQuery<{ maxDepth: number }>(
    'SELECT COALESCE(MAX(level), 0) as maxDepth FROM folders WHERE userId = ?',
    [userId]
  );
  return result[0]?.maxDepth || 0;
};

export const deleteFolderRecursively = async (folderId: number): Promise<boolean> => {
  // SQLite con CASCADE hace esto automáticamente
  return deleteFolder(folderId);
};

export const getAllFoldersByParent = async (parentId: number | null = null): Promise<Folder[]> => {
  const query = parentId === null
    ? 'SELECT * FROM folders WHERE parentId IS NULL ORDER BY position'
    : 'SELECT * FROM folders WHERE parentId = ? ORDER BY position';
  
  const params = parentId === null ? [] : [parentId];
  const rows = await safeQuery<any>(query, params);
  
  return rows.map(row => ({
    ...row,
    type: row.type === 1,
    filled: row.filled === 1,
  }));
};

export const getAllRootFolders = async (): Promise<Folder[]> => {
  return getAllFoldersByParent(null);
};

export const getAllSubfolders = async (parentId: number): Promise<Folder[]> => {
  return getAllFoldersByParent(parentId);
};

export const getAllFoldersOrderedByPosition = async (): Promise<Folder[]> => {
  const rows = await safeQuery<any>('SELECT * FROM folders ORDER BY position');
  return rows.map(row => ({
    ...row,
    type: row.type === 1,
    filled: row.filled === 1,
  }));
};

export const updateFolderPositions = async (
  folderPositions: { id: number; position: number }[]
): Promise<boolean> => {
  return await safeTransaction(async (db) => {
    for (const { id, position } of folderPositions) {
      await db.runAsync(
        'UPDATE folders SET position = ? WHERE id = ?',
        [position, id]
      );
    }
  });
};

export const getFoldersOrderedByPosition = async (): Promise<Folder[]> => {
  return getAllFoldersOrderedByPosition();
};

export const deleteCompetencesByFolderId = async (folderId: number): Promise<void> => {
  // CASCADE delete lo hace automáticamente
  await safeExecute('DELETE FROM competences WHERE folderId = ?', [folderId]);
};

// ==================== SESSION FUNCTIONS ====================
export const getSessions = async (): Promise<Session[]> => {
  const rows = await safeQuery<any>('SELECT * FROM sessions ORDER BY id');
  return rows.map(row => ({
    ...row,
    gender: row.gender === 1,
  }));
};

export const getSessionsByUserId = async (userId: number): Promise<Session[]> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM sessions WHERE userId = ? ORDER BY id',
    [userId]
  );
  return rows.map(row => ({
    ...row,
    gender: row.gender === 1,
  }));
};

export const insertSession = async (
  sessionData: Omit<Session, 'id'>
): Promise<number | false> => {
  try {
    const database = await openDatabase();
    const result = await database.runAsync(
      'INSERT INTO sessions (gender, userId) VALUES (?, ?)',
      [sessionData.gender ? 1 : 0, sessionData.userId]
    );

    console.log('✅ Session inserted with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Error inserting session:', error);
    return false;
  }
};

export const updateSession = async (
  sessionId: number,
  sessionData: Partial<Session>
): Promise<boolean> => {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    // Lista de columnas válidas en la tabla sessions
    const validColumns = ['gender', 'userId'];

    Object.entries(sessionData).forEach(([key, value]) => {
      if (key === 'id') return;
      
      // Solo actualizar columnas que existen en la tabla
      if (!validColumns.includes(key)) {
        console.log(`⚠️ Skipping non-column field in session: ${key}`);
        return;
      }
      
      updates.push(`${key} = ?`);
      values.push(key === 'gender' ? (value ? 1 : 0) : value);
    });

    if (updates.length === 0) return false;

    const database = await openDatabase();
    await database.runAsync(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`,
      [...values, sessionId]
    );

    return true;
  } catch (error) {
    console.error('❌ Error updating session:', error);
    return false;
  }
};

export const deleteSession = async (sessionId: number): Promise<boolean> => {
  return safeExecute('DELETE FROM sessions WHERE id = ?', [sessionId]);
};

// ==================== COMPETENCE FUNCTIONS ====================
export const getCompetences = async (): Promise<Competence[]> => {
  const rows = await safeQuery<any>('SELECT * FROM competences ORDER BY id');
  return rows.map(row => ({
    ...row,
    gender: row.gender === 1,
  }));
};

export const getAllCompetences = async (): Promise<Competence[]> => {
  return getCompetences();
};

export const getCompetencesByFolderId = async (folderId: number): Promise<Competence[]> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM competences WHERE folderId = ? ORDER BY id',
    [folderId]
  );
  return rows.map(row => ({
    ...row,
    gender: row.gender === 1,
  }));
};

export const getCompetenceById = async (competenceId: number): Promise<Competence | null> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM competences WHERE id = ? LIMIT 1',
    [competenceId]
  );
  
  if (rows.length === 0) return null;
  
  return {
    ...rows[0],
    gender: rows[0].gender === 1,
  };
};

export const insertCompetence = async (
  competenceData: Omit<Competence, 'id'>
): Promise<number | false> => {
  try {
    const database = await openDatabase();
    const result = await database.runAsync(
      `INSERT INTO competences (name, description, date, type, gender, sessionId, folderId, userId, numberOfParticipants)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        competenceData.name,
        competenceData.description || '',
        competenceData.date,
        competenceData.type,
        competenceData.gender ? 1 : 0,
        competenceData.sessionId,
        competenceData.folderId,
        competenceData.userId,
        competenceData.numberOfParticipants || 0,
      ]
    );

    console.log('✅ Competence inserted with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Error inserting competence:', error);
    return false;
  }
};

export const updateCompetence = async (
  competenceId: number,
  competenceData: Partial<Competence>
): Promise<boolean> => {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    // Lista de columnas válidas en la tabla competences (excluir propiedades calculadas)
    const validColumns = ['name', 'description', 'date', 'type', 'gender', 'sessionId', 'folderId', 'userId', 'numberOfParticipants'];

    Object.entries(competenceData).forEach(([key, value]) => {
      if (key === 'id') return;
      
      // Solo actualizar columnas que existen en la tabla
      if (!validColumns.includes(key)) {
        console.log(`⚠️ Skipping non-column field in competence: ${key}`);
        return;
      }
      
      updates.push(`${key} = ?`);
      values.push(key === 'gender' ? (value ? 1 : 0) : value);
    });

    if (updates.length === 0) return false;

    const database = await openDatabase();
    await database.runAsync(
      `UPDATE competences SET ${updates.join(', ')} WHERE id = ?`,
      [...values, competenceId]
    );

    return true;
  } catch (error) {
    console.error('❌ Error updating competence:', error);
    return false;
  }
};

export const deleteCompetence = async (competenceId: number): Promise<boolean> => {
  // CASCADE delete eliminará main_tables automáticamente
  return safeExecute('DELETE FROM competences WHERE id = ?', [competenceId]);
};

// ==================== MAIN TABLE FUNCTIONS ====================
export const getMainTables = async (): Promise<MainTable[]> => {
  const rows = await safeQuery<any>('SELECT * FROM main_tables ORDER BY id');
  return rows.map(row => ({
    ...row,
    stickBonus: row.stickBonus === 1,
  }));
};

export const getMainTablesByCompetenceId = async (competenceId: number): Promise<MainTable[]> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM main_tables WHERE competenceId = ? ORDER BY number',
    [competenceId]
  );
  return rows.map(row => ({
    ...row,
    stickBonus: row.stickBonus === 1,
  }));
};

export const getMainTableByCompetenceId = async (competenceId: number): Promise<MainTable[]> => {
  return getMainTablesByCompetenceId(competenceId);
};

export const getMainTableById = async (tableId: number): Promise<MainTable | null> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM main_tables WHERE id = ? LIMIT 1',
    [tableId]
  );
  
  if (rows.length === 0) return null;
  
  return {
    ...rows[0],
    stickBonus: rows[0].stickBonus === 1,
  };
};

export const getMainTablePaths = async (tableId: number): Promise<string> => {
  try {
    const table = await getMainTableById(tableId);
    if (!table || !table.paths) return '[]';
    
    const value = table.paths;
    if (isFileRef(value)) {
      return await readStringFromFile(value);
    }
    return value;
  } catch (e) {
    console.warn('getMainTablePaths error:', e);
    return '[]';
  }
};

export const insertMainTable = async (tableData: Omit<MainTable, 'id'>): Promise<number | false> => {
  try {
    let pathsField = tableData.paths || '[]';
    const database = await openDatabase();
    
    // ID temporal para el archivo
    const tempId = Date.now();
    
    // Externalizar paths grandes
    if (typeof pathsField === 'string' && 
        !isFileRef(pathsField) && 
        pathsField.length > LARGE_FIELD_THRESHOLD) {
      try {
        const uri = makePathsFileUri(tempId);
        await writeStringToFile(uri, pathsField);
        pathsField = uri;
        console.log('📁 Paths externalized to file:', uri);
      } catch (e) {
        console.warn('Failed to externalize paths, keeping inline:', e);
      }
    }

    const result = await database.runAsync(
      `INSERT INTO main_tables (
        competenceId, number, name, event, noc, bib,
        j, i, h, g, f, e, d, c, b, a,
        dv, eg, sb, nd, cv, sv, e2, d3, e3, delt,
        percentage, stickBonus, numberOfElements, difficultyValues,
        elementGroups1, elementGroups2, elementGroups3, elementGroups4, elementGroups5,
        execution, eScore, myScore,
        compD, compE, compSd, compNd, compScore,
        comments, paths, ded, dedexecution,
        vaultNumber, vaultDescription, startValue, description, score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tableData.competenceId,
        tableData.number || 0,
        tableData.name || '',
        tableData.event || '',
        tableData.noc || '',
        tableData.bib || '',
        tableData.j || 0,
        tableData.i || 0,
        tableData.h || 0,
        tableData.g || 0,
        tableData.f || 0,
        tableData.e || 0,
        tableData.d || 0,
        tableData.c || 0,
        tableData.b || 0,
        tableData.a || 0,
        tableData.dv || 0,
        tableData.eg || 0,
        tableData.sb || 0,
        tableData.nd || 0,
        tableData.cv || 0,
        tableData.sv || 0,
        tableData.e2 || 0,
        tableData.d3 || 0,
        tableData.e3 || 0,
        tableData.delt || 0,
        tableData.percentage || 0,
        tableData.stickBonus ? 1 : 0,
        tableData.numberOfElements || 0,
        tableData.difficultyValues || 0,
        tableData.elementGroups1 || 0,
        tableData.elementGroups2 || 0,
        tableData.elementGroups3 || 0,
        tableData.elementGroups4 || 0,
        tableData.elementGroups5 || 0,
        tableData.execution || 0,
        tableData.eScore || 0,
        tableData.myScore || 0,
        tableData.compD || 0,
        tableData.compE || 0,
        tableData.compSd || 0,
        tableData.compNd || 0,
        tableData.compScore || 0,
        tableData.comments || '',
        pathsField,
        tableData.ded || 0,
        tableData.dedexecution || 0,
        tableData.vaultNumber || '',
        tableData.vaultDescription || '',
        tableData.startValue || 0,
        tableData.description || '',
        tableData.score || 0,
      ]
    );

    console.log('✅ MainTable inserted with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Error inserting main table:', error);
    return false;
  }
};

export const updateMainTable = async (
  tableId: number,
  tableData: Partial<MainTable>
): Promise<boolean> => {
  try {
    const current = await getMainTableById(tableId);
    if (!current) {
      console.error('Main table not found');
      return false;
    }

    // Manejar paths si se está actualizando
    let pathsField = tableData.paths;
    if (pathsField && typeof pathsField === 'string' && 
        !isFileRef(pathsField) && 
        pathsField.length > LARGE_FIELD_THRESHOLD) {
      try {
        // Eliminar archivo anterior si existe
        if (current.paths && isFileRef(current.paths)) {
          await deleteFileIfExists(current.paths);
        }
        
        const uri = makePathsFileUri(tableId);
        await writeStringToFile(uri, pathsField);
        pathsField = uri;
        console.log('📁 Paths updated and externalized:', uri);
      } catch (e) {
        console.warn('Failed to externalize paths on update:', e);
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    // Lista de columnas válidas en la tabla main_tables
    const validColumns = [
      'competenceId', 'number', 'name', 'event', 'noc', 'bib',
      'j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a',
      'dv', 'eg', 'sb', 'nd', 'cv', 'sv', 'e2', 'd3', 'e3', 'delt',
      'percentage', 'stickBonus', 'numberOfElements', 'difficultyValues',
      'elementGroups1', 'elementGroups2', 'elementGroups3', 'elementGroups4', 'elementGroups5',
      'execution', 'eScore', 'myScore', 'compD', 'compE', 'compSd', 'compNd', 'compScore',
      'comments', 'paths', 'ded', 'dedexecution', 'vaultNumber', 'vaultDescription',
      'startValue', 'description', 'score'
    ];

    Object.entries(tableData).forEach(([key, value]) => {
      if (key === 'id') return;
      
      // Solo actualizar columnas que existen en la tabla
      if (!validColumns.includes(key)) {
        console.log(`⚠️ Skipping non-column field in main_table: ${key}`);
        return;
      }
      
      updates.push(`${key} = ?`);
      
      if (key === 'stickBonus') {
        values.push(value ? 1 : 0);
      } else if (key === 'paths' && pathsField) {
        values.push(pathsField);
      } else {
        values.push(value);
      }
    });

    if (updates.length === 0) return false;

    const database = await openDatabase();
    await database.runAsync(
      `UPDATE main_tables SET ${updates.join(', ')} WHERE id = ?`,
      [...values, tableId]
    );

    console.log('✅ MainTable updated:', tableId);
    return true;
  } catch (error) {
    console.error('❌ Error updating main table:', error);
    return false;
  }
};

export const deleteMainTable = async (tableId: number): Promise<boolean> => {
  try {
    // Eliminar archivo de paths si existe
    const table = await getMainTableById(tableId);
    if (table && table.paths && isFileRef(table.paths)) {
      await deleteFileIfExists(table.paths);
    }

    // Eliminar fotos asociadas
    await clearPhotosForMainTable(tableId);

    // CASCADE delete eliminará rate_general y rate_jump
    return safeExecute('DELETE FROM main_tables WHERE id = ?', [tableId]);
  } catch (error) {
    console.error('❌ Error deleting main table:', error);
    return false;
  }
};

export const deleteMainTableByCompetenceId = async (competenceId: number): Promise<void> => {
  // Obtener todas las tablas para limpiar archivos
  const tables = await getMainTablesByCompetenceId(competenceId);
  
  for (const table of tables) {
    if (table.paths && isFileRef(table.paths)) {
      await deleteFileIfExists(table.paths);
    }
    await clearPhotosForMainTable(table.id);
  }

  await safeExecute('DELETE FROM main_tables WHERE competenceId = ?', [competenceId]);
};

export const deleteMainTableentries = async (
  competenceId: number,
  number: number
): Promise<boolean> => {
  return safeExecute(
    'DELETE FROM main_tables WHERE competenceId = ? AND number = ?',
    [competenceId, number]
  );
};

// ==================== MAIN TABLE PHOTOS ====================
const MAX_PHOTOS_PER_MAIN_TABLE = 5;

const makePhotoFileUri = (tableId: number, slot: number, ext: string) => 
  `${PHOTOS_DIR}mt_${tableId}_${Date.now()}_${slot}.${ext}`;

const isDataUrlImage = (value: string) => 
  /^data:image\/(png|jpeg|jpg);base64,/i.test(value);

const extractImageExt = (dataUrl: string): string => {
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,/i);
  if (!m) return 'jpg';
  const raw = m[1].toLowerCase();
  return raw === 'jpeg' ? 'jpg' : raw;
};

const decodeAndPersistDataUrl = async (
  tableId: number,
  slot: number,
  dataUrl: string
): Promise<string> => {
  try {
    const ext = extractImageExt(dataUrl);
    const base64Data = dataUrl.split(',')[1];
    await ensureDirAsync(PHOTOS_DIR);
    const uri = makePhotoFileUri(tableId, slot, ext);
    await FileSystem.writeAsStringAsync(uri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  } catch (e) {
    console.warn('decodeAndPersistDataUrl error:', e);
    return dataUrl;
  }
};

export const getPhotosForMainTable = async (tableId: number): Promise<string[]> => {
  const items = await getPhotoItemsForMainTable(tableId);
  return items.map(item => item.uri);
};

export const getPhotoItemsForMainTable = async (
  tableId: number
): Promise<MainTablePhotoItem[]> => {
  const rows = await safeQuery<{ photos: string }>(
    'SELECT photos FROM main_table_photos WHERE tableId = ? LIMIT 1',
    [tableId]
  );

  if (rows.length === 0) return [];

  try {
    const parsed = JSON.parse(rows[0].photos);
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map(p => {
      if (typeof p === 'string') {
        return { uri: p, x: 40, y: 40, scale: 1, rotation: 0 };
      }
      return {
        uri: p.uri || '',
        x: Number.isFinite(p.x) ? p.x : 40,
        y: Number.isFinite(p.y) ? p.y : 40,
        scale: Number.isFinite(p.scale) ? p.scale : 1,
        rotation: Number.isFinite(p.rotation) ? p.rotation : 0,
      };
    });
  } catch (e) {
    console.warn('Error parsing photos JSON:', e);
    return [];
  }
};

export const addPhotoToMainTable = async (
  tableId: number,
  image: string
): Promise<boolean> => {
  try {
    let currentPhotos = await getPhotoItemsForMainTable(tableId);
    
    if (currentPhotos.length >= MAX_PHOTOS_PER_MAIN_TABLE) {
      Alert.alert('Límite alcanzado', 'Máximo 5 fotos por gimnasta.');
      return false;
    }

    let finalUri = image;

    // Externalizar si es data URL grande
    if (isDataUrlImage(image)) {
      finalUri = await decodeAndPersistDataUrl(tableId, currentPhotos.length, image);
    } else if (!isFileRef(image) && 
               image.length > LARGE_IMAGE_INLINE_THRESHOLD && 
               !/^https?:\/\//i.test(image)) {
      try {
        await ensureDirAsync(PHOTOS_DIR);
        const uri = makePhotoFileUri(tableId, currentPhotos.length, 'jpg');
        await FileSystem.writeAsStringAsync(uri, image, {
          encoding: FileSystem.EncodingType.Base64,
        });
        finalUri = uri;
      } catch (e) {
        console.warn('Photo externalization failed:', e);
      }
    }

    const photoItem: MainTablePhotoItem = {
      uri: finalUri,
      x: 40 + (currentPhotos.length * 60),
      y: 40,
      scale: 1,
      rotation: 0,
    };

    currentPhotos.push(photoItem);

    const database = await openDatabase();
    const photosJson = JSON.stringify(currentPhotos);

    // Verificar si ya existe un registro
    const existing = await safeQuery<{ id: number }>(
      'SELECT id FROM main_table_photos WHERE tableId = ? LIMIT 1',
      [tableId]
    );

    if (existing.length > 0) {
      await database.runAsync(
        'UPDATE main_table_photos SET photos = ? WHERE tableId = ?',
        [photosJson, tableId]
      );
    } else {
      await database.runAsync(
        'INSERT INTO main_table_photos (tableId, photos) VALUES (?, ?)',
        [tableId, photosJson]
      );
    }

    console.log('✅ Photo added to MainTable:', tableId);
    return true;
  } catch (error) {
    console.error('❌ Error adding photo:', error);
    return false;
  }
};

export const removePhotoFromMainTable = async (
  tableId: number,
  index: number
): Promise<boolean> => {
  try {
    const currentPhotos = await getPhotoItemsForMainTable(tableId);
    
    if (index < 0 || index >= currentPhotos.length) return false;

    // Eliminar archivo si es una referencia
    const photoToRemove = currentPhotos[index];
    if (isFileRef(photoToRemove.uri)) {
      await deleteFileIfExists(photoToRemove.uri);
    }

    currentPhotos.splice(index, 1);

    const database = await openDatabase();
    await database.runAsync(
      'UPDATE main_table_photos SET photos = ? WHERE tableId = ?',
      [JSON.stringify(currentPhotos), tableId]
    );

    console.log('✅ Photo removed from MainTable:', tableId);
    return true;
  } catch (error) {
    console.error('❌ Error removing photo:', error);
    return false;
  }
};

export const clearPhotosForMainTable = async (tableId: number): Promise<boolean> => {
  try {
    const currentPhotos = await getPhotoItemsForMainTable(tableId);
    
    // Eliminar archivos
    for (const photo of currentPhotos) {
      if (isFileRef(photo.uri)) {
        await deleteFileIfExists(photo.uri);
      }
    }

    return safeExecute('DELETE FROM main_table_photos WHERE tableId = ?', [tableId]);
  } catch (error) {
    console.error('❌ Error clearing photos:', error);
    return false;
  }
};

export const setPhotosForMainTable = async (
  tableId: number,
  images: string[]
): Promise<boolean> => {
  try {
    await clearPhotosForMainTable(tableId);

    for (const image of images.slice(0, MAX_PHOTOS_PER_MAIN_TABLE)) {
      await addPhotoToMainTable(tableId, image);
    }

    return true;
  } catch (error) {
    console.error('❌ Error setting photos:', error);
    return false;
  }
};

export const updatePhotoTransformForMainTable = async (
  tableId: number,
  uri: string,
  transform: Partial<Pick<MainTablePhotoItem, 'x' | 'y' | 'scale' | 'rotation'>>
): Promise<boolean> => {
  try {
    const currentPhotos = await getPhotoItemsForMainTable(tableId);
    const index = currentPhotos.findIndex(p => p.uri === uri);
    
    if (index === -1) return false;

    currentPhotos[index] = { ...currentPhotos[index], ...transform };

    const database = await openDatabase();
    await database.runAsync(
      'UPDATE main_table_photos SET photos = ? WHERE tableId = ?',
      [JSON.stringify(currentPhotos), tableId]
    );

    return true;
  } catch (error) {
    console.error('❌ Error updating photo transform:', error);
    return false;
  }
};

// ==================== RATE GENERAL FUNCTIONS ====================
export const getRateGeneralTables = async (): Promise<MainRateGeneral[]> => {
  const rows = await safeQuery<any>('SELECT * FROM rate_general ORDER BY id');
  return rows.map(row => ({
    ...row,
    stickBonus: row.stickBonus === 1,
  }));
};

export const getRateGeneralByTableId = async (
  tableId: number
): Promise<MainRateGeneral | null> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM rate_general WHERE tableId = ? LIMIT 1',
    [tableId]
  );
  
  if (rows.length === 0) return null;
  
  return {
    ...rows[0],
    stickBonus: rows[0].stickBonus === 1,
  };
};

export const insertRateGeneral = async (
  rateData: Omit<MainRateGeneral, 'id'>
): Promise<number | false> => {
  try {
    const database = await openDatabase();
    const result = await database.runAsync(
      `INSERT INTO rate_general (
        tableId, stickBonus, numberOfElements, difficultyValues,
        elementGroups1, elementGroups2, elementGroups3, elementGroups4, elementGroups5,
        execution, eScore, myScore, compD, compE, compSd, compNd, compScore,
        comments, paths, ded, dedexecution, vaultNumber, vaultDescription, images
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rateData.tableId,
        rateData.stickBonus ? 1 : 0,
        rateData.numberOfElements || 0,
        rateData.difficultyValues || 0,
        rateData.elementGroups1 || 0,
        rateData.elementGroups2 || 0,
        rateData.elementGroups3 || 0,
        rateData.elementGroups4 || 0,
        rateData.elementGroups5 || 0,
        rateData.execution || 0,
        rateData.eScore || 0,
        rateData.myScore || 0,
        rateData.compD || 0,
        rateData.compE || 0,
        rateData.compSd || 0,
        rateData.compNd || 0,
        rateData.compScore || 0,
        rateData.comments || '',
        rateData.paths || '[]',
        rateData.ded || 0,
        rateData.dedexecution || 0,
        rateData.vaultNumber || '',
        rateData.vaultDescription || '',
        rateData.images || '[]',
      ]
    );

    console.log('✅ RateGeneral inserted with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Error inserting rate general:', error);
    return false;
  }
};

export const updateRateGeneral = async (
  rateId: number,
  rateData: Partial<MainRateGeneral>
): Promise<boolean> => {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    // Lista de columnas válidas en la tabla rate_general
    const validColumns = [
      'tableId', 'stickBonus', 'numberOfElements', 'difficultyValues',
      'elementGroups1', 'elementGroups2', 'elementGroups3', 'elementGroups4', 'elementGroups5',
      'execution', 'eScore', 'myScore', 'compD', 'compE', 'compSd', 'compNd', 'compScore',
      'comments', 'paths', 'ded', 'dedexecution', 'vaultNumber', 'vaultDescription', 'images'
    ];

    Object.entries(rateData).forEach(([key, value]) => {
      if (key === 'id') return;
      
      // Solo actualizar columnas que existen en la tabla
      if (!validColumns.includes(key)) {
        console.log(`⚠️ Skipping non-column field in rate_general: ${key}`);
        return;
      }
      
      updates.push(`${key} = ?`);
      values.push(key === 'stickBonus' ? (value ? 1 : 0) : value);
    });

    if (updates.length === 0) return false;

    const database = await openDatabase();
    await database.runAsync(
      `UPDATE rate_general SET ${updates.join(', ')} WHERE id = ?`,
      [...values, rateId]
    );

    return true;
  } catch (error) {
    console.error('❌ Error updating rate general:', error);
    return false;
  }
};

export const deleteRateGeneral = async (rateId: number): Promise<boolean> => {
  return safeExecute('DELETE FROM rate_general WHERE id = ?', [rateId]);
};

export const deleteRateGeneralByTableId = async (tableId: number): Promise<void> => {
  await safeExecute('DELETE FROM rate_general WHERE tableId = ?', [tableId]);
};

export const updateElementGroup = async (
  rateId: number,
  elementGroupKey: keyof MainRateGeneral,
  value: number
): Promise<void> => {
  await updateRateGeneral(rateId, { [elementGroupKey]: value } as any);
};

// ==================== RATE JUMP FUNCTIONS ====================
export const getRateJumpTables = async (): Promise<MainRateJump[]> => {
  const rows = await safeQuery<any>('SELECT * FROM rate_jump ORDER BY id');
  return rows.map(row => ({
    ...row,
    stickBonus: row.stickBonus === 1,
  }));
};

export const getRateJumpByTableId = async (
  tableId: number
): Promise<MainRateJump | null> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM rate_jump WHERE tableId = ? LIMIT 1',
    [tableId]
  );
  
  if (rows.length === 0) return null;
  
  return {
    ...rows[0],
    stickBonus: rows[0].stickBonus === 1,
  };
};

export const insertRateJump = async (
  rateData: Omit<MainRateJump, 'id'>
): Promise<number | false> => {
  try {
    const database = await openDatabase();
    const result = await database.runAsync(
      `INSERT INTO rate_jump (
        tableId, stickBonus, vaultNumber, startValue, description,
        execution, myScore, compD, compE, compSd, compNd, score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rateData.tableId,
        rateData.stickBonus ? 1 : 0,
        rateData.vaultNumber || 0,
        rateData.startValue || 0,
        rateData.description || '',
        rateData.execution || 0,
        rateData.myScore || 0,
        rateData.compD || 0,
        rateData.compE || 0,
        rateData.compSd || 0,
        rateData.compNd || 0,
        rateData.score || 0,
      ]
    );

    console.log('✅ RateJump inserted with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Error inserting rate jump:', error);
    return false;
  }
};

export const updateRateJump = async (
  rateId: number,
  rateData: Partial<MainRateJump>
): Promise<boolean> => {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    // Lista de columnas válidas en la tabla rate_jump
    const validColumns = [
      'tableId', 'stickBonus', 'vaultNumber', 'startValue', 'description',
      'execution', 'myScore', 'compD', 'compE', 'compSd', 'compNd', 'score'
    ];

    Object.entries(rateData).forEach(([key, value]) => {
      if (key === 'id') return;
      
      // Solo actualizar columnas que existen en la tabla
      if (!validColumns.includes(key)) {
        console.log(`⚠️ Skipping non-column field in rate_jump: ${key}`);
        return;
      }
      
      updates.push(`${key} = ?`);
      values.push(key === 'stickBonus' ? (value ? 1 : 0) : value);
    });

    if (updates.length === 0) return false;

    const database = await openDatabase();
    await database.runAsync(
      `UPDATE rate_jump SET ${updates.join(', ')} WHERE id = ?`,
      [...values, rateId]
    );

    return true;
  } catch (error) {
    console.error('❌ Error updating rate jump:', error);
    return false;
  }
};

export const deleteRateJump = async (rateId: number): Promise<boolean> => {
  return safeExecute('DELETE FROM rate_jump WHERE id = ?', [rateId]);
};

export const deleteRateJumpByTableId = async (tableId: number): Promise<void> => {
  await safeExecute('DELETE FROM rate_jump WHERE tableId = ?', [tableId]);
};

// ==================== UTILITY FUNCTIONS ====================
export const cleanupData = async (): Promise<void> => {
  console.log('🧹 Cleanup data - not needed with SQLite CASCADE');
};

export const migrateLargeInlinePaths = async (): Promise<void> => {
  console.log('🔄 Checking for large inline paths to externalize...');
  
  const tables = await getMainTables();
  let migratedCount = 0;

  for (const table of tables) {
    if (table.paths && 
        typeof table.paths === 'string' && 
        !isFileRef(table.paths) && 
        table.paths.length > LARGE_FIELD_THRESHOLD) {
      
      try {
        const uri = makePathsFileUri(table.id);
        await writeStringToFile(uri, table.paths);
        await updateMainTable(table.id, { paths: uri });
        migratedCount++;
        console.log(`✅ Migrated paths for table ${table.id}`);
      } catch (e) {
        console.warn(`Failed to migrate paths for table ${table.id}:`, e);
      }
    }
  }

  console.log(`✅ Migration complete. ${migratedCount} paths externalized.`);
};

// ==================== EXPORT/IMPORT FUNCTIONS ====================
export const exportFolderData = async (
  folderId: number,
  progressCallback?: (message: string, progress: number) => void
): Promise<string | null> => {
  try {
    progressCallback?.('Obteniendo carpeta...', 0);
    const folder = await getFolderById(folderId);
    if (!folder) return null;

    progressCallback?.('Obteniendo competencias...', 20);
    const competences = await getCompetencesByFolderId(folderId);

    const competencesData = [];
    for (let i = 0; i < competences.length; i++) {
      const comp = competences[i];
      progressCallback?.(
        `Procesando competencia ${i + 1}/${competences.length}...`,
        20 + (i / competences.length) * 60
      );

      const mainTables = await getMainTablesByCompetenceId(comp.id);
      competencesData.push({
        ...comp,
        mainTables,
      });
    }

    const exportData = {
      folder,
      competences: competencesData,
      exportDate: new Date().toISOString(),
      version: 1,
    };

    progressCallback?.('Generando JSON...', 90);
    const jsonString = JSON.stringify(exportData, null, 2);

    progressCallback?.('Completado', 100);
    return jsonString;
  } catch (error) {
    console.error('❌ Error exporting folder:', error);
    return null;
  }
};

export const importFolderData = async (
  importDataString: string,
  targetParentId: number,
  progressCallback?: (message: string, progress: number) => void
): Promise<boolean> => {
  try {
    progressCallback?.('Parseando datos...', 0);
    const importData = JSON.parse(importDataString);

    const { folder, competences } = importData;

    progressCallback?.('Creando carpeta...', 10);
    const newFolderId = await insertFolder({
      ...folder,
      id: undefined as any,
      parentId: targetParentId,
    });

    if (!newFolderId) return false;

    for (let i = 0; i < competences.length; i++) {
      const comp = competences[i];
      progressCallback?.(
        `Importando competencia ${i + 1}/${competences.length}...`,
        10 + (i / competences.length) * 80
      );

      const newCompId = await insertCompetence({
        ...comp,
        id: undefined as any,
        folderId: newFolderId,
      });

      if (newCompId && comp.mainTables) {
        for (const table of comp.mainTables) {
          await insertMainTable({
            ...table,
            id: undefined as any,
            competenceId: newCompId,
          });
        }
      }
    }

    progressCallback?.('Completado', 100);
    return true;
  } catch (error) {
    console.error('❌ Error importing folder:', error);
    return false;
  }
};

// Funciones de compatibilidad adicionales
export const getFolderWithCompetences = async (folderId: number): Promise<any> => {
  const folder = await getFolderById(folderId);
  if (!folder) return null;

  const competences = await getCompetencesByFolderId(folderId);
  return { ...folder, competences };
};

export const getCompetenceWithTables = async (competenceId: number): Promise<any> => {
  const competence = await getCompetenceById(competenceId);
  if (!competence) return null;

  const mainTables = await getMainTablesByCompetenceId(competenceId);
  return { ...competence, mainTables };
};

export const getUserWithAllData = async (userId: number): Promise<any> => {
  const user = await getUserById(userId);
  if (!user) return null;

  const folders = await getFoldersByUserId(userId);
  const sessions = await getSessionsByUserId(userId);

  return { ...user, folders, sessions };
};

export const exportAllData = async (): Promise<any> => {
  const users = await getUsers();
  const folders = await getFolders();
  const sessions = await getSessions();
  const competences = await getCompetences();
  const mainTables = await getMainTables();

  return {
    users,
    folders,
    sessions,
    competences,
    mainTables,
    exportDate: new Date().toISOString(),
    version: 1,
  };
};

export const importAllData = async (data: any): Promise<boolean> => {
  // No implementado - requiere manejo cuidadoso de IDs
  console.warn('importAllData not implemented for SQLite');
  return false;
};

export const clearAllData = async (): Promise<boolean> => {
  try {
    const database = await openDatabase();
    
    await database.execAsync(`
      DELETE FROM main_table_photos;
      DELETE FROM rate_jump;
      DELETE FROM rate_general;
      DELETE FROM main_tables;
      DELETE FROM competences;
      DELETE FROM sessions;
      DELETE FROM folders;
      DELETE FROM activated_devices;
      DELETE FROM users;
    `);

    console.log('✅ All data cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    return false;
  }
};

export const getUserCompetitions = async (userId: number): Promise<Competence[]> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM competences WHERE userId = ? ORDER BY date DESC',
    [userId]
  );
  return rows.map(row => ({
    ...row,
    gender: row.gender === 1,
  }));
};

export const getRecentCompetitions = async (userId: number): Promise<Competence[]> => {
  const rows = await safeQuery<any>(
    'SELECT * FROM competences WHERE userId = ? ORDER BY date DESC LIMIT 10',
    [userId]
  );
  return rows.map(row => ({
    ...row,
    gender: row.gender === 1,
  }));
};

export const searchFolders = async (
  userId: number,
  searchTerm: string
): Promise<Folder[]> => {
  const rows = await safeQuery<any>(
    `SELECT * FROM folders 
     WHERE userId = ? AND (name LIKE ? OR description LIKE ?)
     ORDER BY position`,
    [userId, `%${searchTerm}%`, `%${searchTerm}%`]
  );
  return rows.map(row => ({
    ...row,
    type: row.type === 1,
    filled: row.filled === 1,
  }));
};

export const searchCompetitions = async (
  userId: number,
  searchTerm: string
): Promise<Competence[]> => {
  const rows = await safeQuery<any>(
    `SELECT * FROM competences 
     WHERE userId = ? AND (name LIKE ? OR description LIKE ?)
     ORDER BY date DESC`,
    [userId, `%${searchTerm}%`, `%${searchTerm}%`]
  );
  return rows.map(row => ({
    ...row,
    gender: row.gender === 1,
  }));
};

export const getUserStatistics = async (userId: number): Promise<any> => {
  const foldersCount = await safeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM folders WHERE userId = ?',
    [userId]
  );

  const competencesCount = await safeQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM competences WHERE userId = ?',
    [userId]
  );

  const mainTablesCount = await safeQuery<{ count: number }>(
    `SELECT COUNT(*) as count FROM main_tables mt
     JOIN competences c ON mt.competenceId = c.id
     WHERE c.userId = ?`,
    [userId]
  );

  return {
    totalFolders: foldersCount[0]?.count || 0,
    totalCompetences: competencesCount[0]?.count || 0,
    totalTables: mainTablesCount[0]?.count || 0,
  };
};

// Función especial para insertar tabla corrupta con manejo de errores
export const insertCorruptMainTable = async (raw: any): Promise<number | false> => {
  try {
    // Intentar sanitizar y insertar
    const sanitized: any = {};
    
    // Campos numéricos con defaults
    const numFields = ['competenceId', 'number', 'j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a', 'dv', 'eg', 'sb', 'nd', 'cv', 'sv', 'e2', 'd3', 'e3', 'delt', 'percentage', 'numberOfElements', 'difficultyValues', 'elementGroups1', 'elementGroups2', 'elementGroups3', 'elementGroups4', 'elementGroups5', 'execution', 'eScore', 'myScore', 'compD', 'compE', 'compSd', 'compNd', 'compScore', 'ded', 'dedexecution', 'startValue', 'score'];
    
    numFields.forEach(field => {
      const value = raw[field];
      sanitized[field] = typeof value === 'number' && !isNaN(value) ? value : 0;
    });

    // Campos string
    ['name', 'event', 'noc', 'bib', 'vaultNumber', 'vaultDescription', 'description', 'comments'].forEach(field => {
      sanitized[field] = raw[field] ? String(raw[field]) : '';
    });

    // Paths
    sanitized.paths = raw.paths || '[]';

    // Boolean
    sanitized.stickBonus = !!raw.stickBonus;

    return await insertMainTable(sanitized as Omit<MainTable, 'id'>);
  } catch (error) {
    console.error('❌ Error inserting corrupt main table:', error);
    return false;
  }
};

// ==================== INITIALIZATION ====================

/**
 * Inicializa la base de datos SQLite
 */
export const initDatabase = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing SQLite database...');
    await createTables();
    
    const database = await openDatabase();
    
    // Crear usuario por defecto con ID = 0 si no existe
    const existingUser = await database.getFirstAsync<User>(
      'SELECT * FROM users WHERE id = 0'
    );
    
    if (!existingUser) {
      await database.runAsync(
        `INSERT INTO users (id, username, password, rol) VALUES (?, ?, ?, ?)`,
        [0, 'default', 'default', 'user']
      );
      console.log('✅ Default user created (id=0)');
    } else {
      console.log('ℹ️ Default user already exists (id=0)');
    }
    
    // Crear sesión por defecto con ID = 1 si no existe (para MAG)
    const existingSessionMAG = await database.getFirstAsync<Session>(
      'SELECT * FROM sessions WHERE id = 1'
    );
    
    if (!existingSessionMAG) {
      await database.runAsync(
        `INSERT INTO sessions (id, gender, userId) VALUES (?, ?, ?)`,
        [1, 1, 0] // id=1, gender=true (MAG), userId=0
      );
      console.log('✅ Default session created for MAG (id=1)');
    } else {
      console.log('ℹ️ Default session for MAG already exists (id=1)');
    }
    
    // Crear sesión por defecto con ID = 2 si no existe (para WAG)
    const existingSessionWAG = await database.getFirstAsync<Session>(
      'SELECT * FROM sessions WHERE id = 2'
    );
    
    if (!existingSessionWAG) {
      await database.runAsync(
        `INSERT INTO sessions (id, gender, userId) VALUES (?, ?, ?)`,
        [2, 0, 0] // id=2, gender=false (WAG), userId=0
      );
      console.log('✅ Default session created for WAG (id=2)');
    } else {
      console.log('ℹ️ Default session for WAG already exists (id=2)');
    }
    
    await migrateLargeInlinePaths();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export const initializeApp = async (): Promise<void> => {
  await initDatabase();
};

// ==================== APP SETTINGS FUNCTIONS ====================
/**
 * Obtiene la disciplina por defecto guardada
 * @returns true = MAG, false = WAG, null = sin disciplina por defecto
 */
export const getDefaultDiscipline = async (): Promise<boolean | null> => {
  try {
    const database = await openDatabase();
    const result = await database.getFirstAsync<{ defaultDiscipline: number | null }>(
      'SELECT defaultDiscipline FROM app_settings WHERE id = 1'
    );
    
    console.log('📖 Query result from app_settings:', result);
    
    if (!result || result.defaultDiscipline === null) {
      console.log('📖 No default discipline found in database');
      return null;
    }
    
    const discipline = result.defaultDiscipline === 1;
    console.log('📖 Default discipline loaded from DB:', discipline, '(', result.defaultDiscipline, ')');
    return discipline;
  } catch (error) {
    console.error('❌ Error getting default discipline:', error);
    return null;
  }
};

/**
 * Guarda la disciplina por defecto
 * @param discipline true = MAG, false = WAG, null = sin disciplina por defecto
 */
export const saveDefaultDiscipline = async (discipline: boolean | null): Promise<boolean> => {
  try {
    const database = await openDatabase();
    const disciplineValue = discipline === null ? null : (discipline ? 1 : 0);
    const timestamp = Date.now();
    
    console.log('💾 Saving default discipline:', discipline, '→ DB value:', disciplineValue);
    
    // Verificar si ya existe un registro
    const existing = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM app_settings WHERE id = 1'
    );
    
    if (existing) {
      // Actualizar
      console.log('💾 Updating existing record...');
      await database.runAsync(
        'UPDATE app_settings SET defaultDiscipline = ?, lastUpdated = ? WHERE id = 1',
        [disciplineValue, timestamp]
      );
    } else {
      // Insertar
      console.log('💾 Inserting new record...');
      await database.runAsync(
        'INSERT INTO app_settings (id, defaultDiscipline, lastUpdated) VALUES (?, ?, ?)',
        [1, disciplineValue, timestamp]
      );
    }
    
    console.log('✅ Default discipline saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error saving default discipline:', error);
    return false;
  }
};

// Exportar tipo para migraciones
export const exportFolderZip = async (
  folderId: number,
  progressCallback?: (message: string, progress: number) => void
): Promise<Uint8Array | null> => {
  console.warn('exportFolderZip not fully implemented for SQLite');
  return null;
};

export const importFolderZip = async (
  zipData: Uint8Array,
  targetParentId: number,
  progressCallback?: (message: string, progress: number) => void
): Promise<boolean> => {
  console.warn('importFolderZip not fully implemented for SQLite');
  return false;
};

export const addTestData = async () => {
  console.warn('addTestData not implemented for SQLite');
};

