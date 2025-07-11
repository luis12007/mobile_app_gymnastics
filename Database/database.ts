import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys for all tables
const USERS_KEY = "users";
const FOLDERS_KEY = "folders";
const SESSIONS_KEY = "sessions";
const COMPETENCES_KEY = "competences";
const MAIN_TABLES_KEY = "main_tables";
const RATE_GENERAL_KEY = "rate_general";
const RATE_JUMP_KEY = "rate_jump";

// Table interfaces
interface User {
  id: number;
  username: string;
  password: string;
  rol: string; // "admin" or "user"
}

interface Folder {
  id: number;
  userId: number;
  name: string;
  description: string;
  type: boolean; // true for training, false for competence
  date: string; // ISO date string
  filled: boolean;
  position?: number; // Para el orden de las carpetas
}

interface Session {
  id: number;
  gender: boolean; // true for male, false for female
  userId: number;
}

interface Competence {
  id: number;
  name: string;
  description: string;
  date: string; // ISO date string
  type: string; // "Floor", "Jump", etc.
  gender: boolean; // mag and wag
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

// Constante para tabla de dispositivos activados
const ACTIVATED_DEVICES_KEY = "activated_devices";

// Interfaz para dispositivos activados
interface ActivatedDevice {
  id: number;
  deviceId: string;
  activationKey: string;
  activatedAt: number;
  createdBy: number | null;
}

// Insertar usuario sin validar clave de activación (para uso interno/admin)
export const insertUserWithoutValidation = async (
  username: string, 
  password: string,
  rol: string = "user" // Default role is "user"
): Promise<number | false> => {
  try {
    if (!username || !password) {
      console.error("Username and password are required");
      return false;
    }
    
    const users = await getUsers();
    
    // Check if user exists
    const userExists = users.some(user => user.username === username);
    if (userExists) {
      console.error("User already exists.");
      return false;
    }

    // Find max ID
    let nextId = 1;
    if (users.length > 0) {
      // Filter out any users without an ID
      const usersWithId = users.filter(user => typeof user.id === 'number');
      if (usersWithId.length > 0) {
        nextId = Math.max(...usersWithId.map(user => user.id)) + 1;
      }
    }
    
    // Add new user with ID and role
    const newUser: User = { id: nextId, username, password, rol };
    users.push(newUser);
    
    // Save updated users
    await saveItems(USERS_KEY, users);
    console.log("User added successfully without validation. ID:", nextId);
    
    return nextId;
  } catch (error) {
    console.error("Error inserting user without validation:", error);
    return false;
  }
};

// Configurar la tabla de dispositivos activados
export const setupActivatedDevicesTable = async (): Promise<void> => {
  try {
    // En AsyncStorage solo necesitamos verificar que la clave existe
    const devices = await AsyncStorage.getItem(ACTIVATED_DEVICES_KEY);
    if (!devices) {
      await AsyncStorage.setItem(ACTIVATED_DEVICES_KEY, JSON.stringify([]));
    }
    console.log("Activated devices table is ready");
  } catch (error) {
    console.error("Error setting up activated devices table:", error);
  }
};

// Verificar si un dispositivo ya está activado
export const isDeviceActivated = async (deviceId: string): Promise<boolean> => {
  try {
    const devices = await getActivatedDevices();
    return devices.some(device => device.deviceId === deviceId);
  } catch (error) {
    console.error("Error checking if device is activated:", error);
    return false;
  }
};

// Obtener todos los dispositivos activados
export const getActivatedDevices = async (): Promise<ActivatedDevice[]> => {
  return getItems<ActivatedDevice>(ACTIVATED_DEVICES_KEY);
};

// Registrar un dispositivo activado
export const registerActivatedDevice = async (
  deviceId: string, 
  activationKey: string, 
  userId: number | null = null
): Promise<boolean> => {
  try {
    // Verificar si ya está activado
    const isActivated = await isDeviceActivated(deviceId);
    if (isActivated) {
      console.log("Device is already activated");
      return false;
    }
    
    const devices = await getActivatedDevices();
    const id = await getNextId(ACTIVATED_DEVICES_KEY);
    
    const newDevice: ActivatedDevice = {
      id,
      deviceId,
      activationKey,
      activatedAt: Date.now(),
      createdBy: userId
    };
    
    devices.push(newDevice);
    await saveItems(ACTIVATED_DEVICES_KEY, devices);
    console.log("Device registered successfully", newDevice);
    return true;
  } catch (error) {
    console.error("Error registering activated device:", error);
    return false;
  }
};
// Verificar si un usuario ya existe
export const checkUserExists = async (username: string): Promise<boolean> => {
  try {
    const users = await getUsers();
    return users.some(user => user.username === username);
  } catch (error) {
    console.error("Error checking if user exists:", error);
    return false; // En caso de error, asumimos que no existe
  }
};


// Validar una clave de activación para un dispositivo específico
export const validateActivationKey = async (
  key: string, 
  deviceId: string
): Promise<boolean> => {
  try {
    // Verificar formato de la clave
    const parts = key.split('-');
    if (parts.length !== 3 || parts[0] !== 'GYM') {
      return false;
    }
    
    // Recrear el hash para validación
    const APP_SECRET = 'GymJudge2023SecretKey'; // Debería estar almacenado más seguramente
    const crypto = await import('expo-crypto');
    
    const validationString = deviceId + APP_SECRET;
    const expectedHash = await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      validationString
    );
    
    // Comparar solo los primeros 8 caracteres
    const expectedShortHash = expectedHash.substring(0, 8);
    const keyHash = parts[1];
    
    console.log("Validating key", key, "for device", deviceId);
    console.log("Expected hash:", expectedShortHash, "Key hash:", keyHash);
    
    return keyHash === expectedShortHash;
  } catch (error) {
    console.error("Error validating activation key:", error);
    return false;
  }
};

export const deleteRateJumpByTableId = async (tableId: number): Promise<void> => {
  try {
    const rateJumpTables = await getRateJumpTables();
    const filteredRateJumpTables = rateJumpTables.filter(rate => rate.tableId !== tableId);

    if (filteredRateJumpTables.length === rateJumpTables.length) {
      console.log(`No RateJump entries found for tableId: ${tableId}`);
      return;
    }

    await saveItems(RATE_JUMP_KEY, filteredRateJumpTables);
    console.log(`Deleted RateJump entries for tableId: ${tableId}`);
  } catch (error) {
    console.error(`Error deleting RateJump entries for tableId: ${tableId}`, error);
  }
};


// Helper function to validate objects in storage
const validateItems = async <T>(key: string, validator: (item: any) => boolean): Promise<T[]> => {
  try {
    const itemsString = await AsyncStorage.getItem(key);
    if (!itemsString) return [];
    
    const allItems = JSON.parse(itemsString);
    if (!Array.isArray(allItems)) return [];
    
    // Filter out invalid items
    const validItems = allItems.filter(item => validator(item));
    
    // If we had to filter some items, save the valid ones back
    if (validItems.length !== allItems.length) {
      console.log(`Removed ${allItems.length - validItems.length} invalid items from ${key}`);
      await AsyncStorage.setItem(key, JSON.stringify(validItems));
    }
    
    return validItems as T[];
  } catch (error) {
    console.error(`Error validating items from ${key}:`, error);
    return [];
  }
};

// Fix existing data to ensure all users have an ID
export const fixExistingUsers = async (): Promise<boolean> => {
  try {
    const usersString = await AsyncStorage.getItem(USERS_KEY);
    let users = usersString ? JSON.parse(usersString) : [];
    
    console.log("Before fixing, users:", users);
    
    // Filter out invalid entries
    users = users.filter((user: any) => 
      user && typeof user === 'object' && user.username && user.password
    );
    
    // Add IDs to users that don't have them
    let modified = false;
    users.forEach((user: any, index: number) => {
      if (typeof user.id !== 'number' || isNaN(user.id) || user.id <= 0) {
        user.id = index + 1;
        modified = true;
      }
    });
    
    if (modified) {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      console.log("After fixing, users:", users);
    }
    
    return true;
  } catch (error) {
    console.error("Error fixing existing users:", error);
    return false;
  }
};



// Helper functions to get the next ID for each table
const getNextId = async (key: string): Promise<number> => {
  try {
    const items = await getItems(key);
    if (items.length === 0) {
      return 1;
    }
    // Find the maximum ID and add 1
    const maxId = Math.max(...items.map((item: any) => 
      typeof item.id === 'number' ? item.id : 0
    ));
    return maxId + 1;
  } catch (error) {
    console.error(`Error getting next ID for ${key}:`, error);
    return 1; // Default to 1 if there's an error
  }
};

// Generic function to get all items from a specific table
const getItems = async <T>(key: string): Promise<T[]> => {
  try {
    const itemsString = await AsyncStorage.getItem(key);
    return itemsString ? JSON.parse(itemsString) : [];
  } catch (error) {
    console.error(`Error retrieving items from ${key}:`, error);
    return [];
  }
};

// Generic function to save items to a specific table
const saveItems = async <T>(key: string, items: T[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error(`Error saving items to ${key}:`, error);
    return false;
  }
};

// USER FUNCTIONS
export const getUsers = async (): Promise<User[]> => {
  // Validate user objects
  return validateItems<User>(USERS_KEY, (item) => {
    return item && 
           typeof item === 'object' && 
           (typeof item.id === 'number' || item.username) && // Allow either id or username
           typeof item.username === 'string' && 
           typeof item.password === 'string';
  });
};

export const getUserById = async (userId: number): Promise<User | null> => {
  try {
    const users = await getUsers();
    const user = users.find(user => user.id === userId);
    return user || null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const users = await getUsers();
    const user = users.find(user => user.username === username);
    return user || null;
  } catch (error) {
    console.error("Error getting user by username:", error);
    return null;
  }
};

export const insertUser = async (
  username: string, 
  password: string,
  activationKey?: string,
  deviceId?: string,
  rol: string = "user" // Default role is "user"
): Promise<number | false> => {
  try {
    if (!username || !password) {
      console.error("Username and password are required");
      return false;
    }
    
    const users = await getUsers();
    
    // Check if user exists
    const userExists = users.some(user => user.username === username);
    if (userExists) {
      console.error("User already exists.");
      return false;
    }
    
    // Si se proporciona deviceId y activationKey, verificar que sean válidos
    if (deviceId && activationKey) {
      const isValid = await validateActivationKey(activationKey, deviceId);
      if (!isValid) {
        console.error("Invalid activation key for device");
        return false;
      }
      
      // Verificar si el dispositivo ya está activado
      const alreadyActivated = await isDeviceActivated(deviceId);
      if (alreadyActivated) {
        console.error("Device is already activated");
        return false;
      }
    }

    // Find max ID
    let nextId = 1;
    if (users.length > 0) {
      // Filter out any users without an ID
      const usersWithId = users.filter(user => typeof user.id === 'number');
      if (usersWithId.length > 0) {
        nextId = Math.max(...usersWithId.map(user => user.id)) + 1;
      }
    }
    
    // Add new user with ID and role
    const newUser: User = { id: nextId, username, password, rol };
    users.push(newUser);
    
    // Save updated users
    await saveItems(USERS_KEY, users);
    console.log("User added successfully. ID:", nextId);
    
    // Si se proporcionaron datos de activación, registrar el dispositivo
    if (deviceId && activationKey) {
      await registerActivatedDevice(deviceId, activationKey, nextId);
    }
    
    return nextId;
  } catch (error) {
    console.error("Error inserting user:", error);
    return false;
  }
};

export const initDatabase = async (): Promise<void> => {
  try {
    // Asegurar que todas las tablas estén configuradas
    await setupActivatedDevicesTable();
    
    // Migración/limpieza de datos si es necesario
    await cleanupData();
    
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

// Fixed validateUser function
export const validateUser = async (
  username: string,
  password: string
): Promise<number | false> => {
  try {
    console.log("Validating user:", username);
    const users = await getUsers();
    
    // Add IDs to any users without them
    let usersUpdated = false;
    users.forEach((user, index) => {
      if (typeof user.id !== 'number') {
        user.id = index + 1;
        usersUpdated = true;
      }
    });
    
    // Save updated users if needed
    if (usersUpdated) {
      await saveItems(USERS_KEY, users);
      console.log("Added IDs to users without them");
    }
    
    // Find the user
    const user = users.find(
      user => user.username === username && user.password === password
    );
    
    if (user) {
      console.log("User found:", user.username, "ID:", user.id);
      return user.id;
    } else {
      console.log("Invalid credentials. Users available:", users.map(u => u.username));
      return false;
    }
  } catch (error) {
    console.error("Error validating user:", error);
    return false;
  }
};

export const updateUser = async (
  userId: number,
  userData: Partial<User>
): Promise<boolean> => {
  try {
    const users = await getUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      console.error("User not found.");
      return false;
    }
    
    // Update user data
    users[userIndex] = { ...users[userIndex], ...userData };
    await saveItems(USERS_KEY, users);
    console.log("User updated successfully.");
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
};

export const deleteUser = async (userId: number): Promise<boolean> => {
  try {
    const users = await getUsers();
    const filteredUsers = users.filter(user => user.id !== userId);
    
    if (filteredUsers.length === users.length) {
      console.error("User not found.");
      return false;
    }
    
    await saveItems(USERS_KEY, filteredUsers);
    console.log("User deleted successfully.");
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
};

// FOLDER FUNCTIONS
export const getFolders = async (): Promise<Folder[]> => {
  return getItems<Folder>(FOLDERS_KEY);
};

export const getFoldersByUserId = async (userId: number): Promise<Folder[]> => {
  try {
    const folders = await getFolders();
    return folders.filter(folder => folder.userId === userId);
  } catch (error) {
    console.error("Error getting folders by user ID:", error);
    return [];
  }
};

// Función para obtener carpetas ordenadas por posición
export const getFoldersByUserIdSorted = async (userId: number): Promise<Folder[]> => {
  try {
    const folders = await getFoldersByUserId(userId);
    return folders.sort((a, b) => (a.position || 0) - (b.position || 0));
  } catch (error) {
    console.error("Error getting sorted folders by user ID:", error);
    return [];
  }
};

export const getFolderById = async (folderId: number): Promise<Folder | null> => {
  try {
    const folders = await getFolders();
    const folder = folders.find(folder => folder.id === folderId);
    return folder || null;
  } catch (error) {
    console.error("Error getting folder by ID:", error);
    return null;
  }
};

export const insertFolder = async (folderData: Omit<Folder, 'id'>): Promise<number | false> => {
  try {
    const folders = await getFolders();
    const id = await getNextId(FOLDERS_KEY);
    
    // Si no se especifica posición, ponerla al final
    const position = folderData.position !== undefined ? folderData.position : folders.length;
    
    const newFolder: Folder = { id, ...folderData, position };
    folders.push(newFolder);
    await saveItems(FOLDERS_KEY, folders);
    console.log("Folder added successfully. ID:", id);
    return id;
  } catch (error) {
    console.error("Error inserting folder:", error);
    return false;
  }
};

export const updateFolder = async (
  folderId: number,
  folderData: Partial<Folder>
): Promise<boolean> => {
  try {
    const folders = await getFolders();
    const folderIndex = folders.findIndex(folder => folder.id === folderId);
    
    if (folderIndex === -1) {
      console.error("Folder not found.");
      return false;
    }
    
    // Update folder data
    folders[folderIndex] = { ...folders[folderIndex], ...folderData };
    await saveItems(FOLDERS_KEY, folders);
    console.log("Folder updated successfully.");
    return true;
  } catch (error) {
    console.error("Error updating folder:", error);
    return false;
  }
};

export const deleteFolder = async (folderId: number): Promise<boolean> => {
  try {
    const folders = await getFolders();
    const filteredFolders = folders.filter(folder => folder.id !== folderId);
    
    if (filteredFolders.length === folders.length) {
      console.error("Folder not found.");
      return false;
    }
    
    await saveItems(FOLDERS_KEY, filteredFolders);
    
    // Also delete associated competences
    const competences = await getCompetences();
    const updatedCompetences = competences.filter(comp => comp.folderId !== folderId);
    await saveItems(COMPETENCES_KEY, updatedCompetences);
    
    console.log("Folder and associated items deleted successfully.");
    return true;
  } catch (error) {
    console.error("Error deleting folder:", error);
    return false;
  }
};

// Función para reordenar carpetas después de drag & drop
export const reorderFolders = async (userId: number, fromIndex: number, toIndex: number): Promise<boolean> => {
  try {
    const folders = await getFoldersByUserIdSorted(userId);
    
    if (fromIndex < 0 || fromIndex >= folders.length || toIndex < 0 || toIndex >= folders.length) {
      console.error("Invalid indices for reordering");
      return false;
    }

    // Mover el elemento
    const [movedFolder] = folders.splice(fromIndex, 1);
    folders.splice(toIndex, 0, movedFolder);

    // Actualizar las posiciones
    const allFolders = await getFolders();
    folders.forEach((folder, index) => {
      folder.position = index;
      const globalIndex = allFolders.findIndex(f => f.id === folder.id);
      if (globalIndex !== -1) {
        allFolders[globalIndex] = folder;
      }
    });

    await saveItems(FOLDERS_KEY, allFolders);
    console.log("Folders reordered successfully");
    return true;
  } catch (error) {
    console.error("Error reordering folders:", error);
    return false;
  }
};

// Función para actualizar la posición de una carpeta específica
export const updateFolderPosition = async (folderId: number, newPosition: number): Promise<boolean> => {
  try {
    const folders = await getFolders();
    const folderIndex = folders.findIndex(f => f.id === folderId);
    
    if (folderIndex === -1) {
      console.error("Folder not found for position update");
      return false;
    }

    folders[folderIndex].position = newPosition;
    await saveItems(FOLDERS_KEY, folders);
    console.log(`Folder ${folderId} position updated to ${newPosition}`);
    return true;
  } catch (error) {
    console.error("Error updating folder position:", error);
    return false;
  }
};

// SESSION FUNCTIONS
export const getSessions = async (): Promise<Session[]> => {
  return getItems<Session>(SESSIONS_KEY);
};

export const getSessionsByUserId = async (userId: number): Promise<Session[]> => {
  try {
    const sessions = await getSessions();
    return sessions.filter(session => session.userId === userId);
  } catch (error) {
    console.error("Error getting sessions by user ID:", error);
    return [];
  }
};

export const insertSession = async (sessionData: Omit<Session, 'id'>): Promise<number | false> => {
  try {
    const sessions = await getSessions();
    const id = await getNextId(SESSIONS_KEY);
    const newSession: Session = { id, ...sessionData };
    sessions.push(newSession);
    await saveItems(SESSIONS_KEY, sessions);
    console.log("Session added successfully. ID:", id);
    return id;
  } catch (error) {
    console.error("Error inserting session:", error);
    return false;
  }
};

export const updateSession = async (
  sessionId: number,
  sessionData: Partial<Session>
): Promise<boolean> => {
  try {
    const sessions = await getSessions();
    const sessionIndex = sessions.findIndex(session => session.id === sessionId);
    
    if (sessionIndex === -1) {
      console.error("Session not found.");
      return false;
    }
    
    // Update session data
    sessions[sessionIndex] = { ...sessions[sessionIndex], ...sessionData };
    await saveItems(SESSIONS_KEY, sessions);
    console.log("Session updated successfully.");
    return true;
  } catch (error) {
    console.error("Error updating session:", error);
    return false;
  }
};

export const deleteSession = async (sessionId: number): Promise<boolean> => {
  try {
    const sessions = await getSessions();
    const filteredSessions = sessions.filter(session => session.id !== sessionId);
    
    if (filteredSessions.length === sessions.length) {
      console.error("Session not found.");
      return false;
    }
    
    await saveItems(SESSIONS_KEY, filteredSessions);
    console.log("Session deleted successfully.");
    return true;
  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
};

// COMPETENCE FUNCTIONS
export const getCompetences = async (): Promise<Competence[]> => {
  return getItems<Competence>(COMPETENCES_KEY);
};

export const getCompetencesByFolderId = async (folderId: number): Promise<Competence[]> => {
  try {
    console.log("Getting competences by folder ID:", folderId);
    console.log("Competences before filtering:", await getCompetences());
    const competences = await getCompetences();
    return competences.filter(competence => competence.folderId === folderId);
  } catch (error) {
    console.error("Error getting competences by folder ID:", error);
    return [];
  }
};

export const getCompetenceById = async (competenceId: number): Promise<Competence | null> => {
  try {
    const competences = await getCompetences();
    const competence = competences.find(competence => competence.id === competenceId);
    return competence || null;
  } catch (error) {
    console.error("Error getting competence by ID:", error);
    return null;
  }
};

export const insertCompetence = async (competenceData: Omit<Competence, 'id'>): Promise<number | false> => {
  try {
    const competences = await getCompetences();
    const id = await getNextId(COMPETENCES_KEY);
    const newCompetence: Competence = { id, ...competenceData };
    competences.push(newCompetence);
    await saveItems(COMPETENCES_KEY, competences);
    console.log("Competence added successfully. ID:", id);
    return id;
  } catch (error) {
    console.error("Error inserting competence:", error);
    return false;
  }
};

export const updateCompetence = async (
  competenceId: number,
  competenceData: Partial<Competence>
): Promise<boolean> => {
  try {
    const competences = await getCompetences();
    const competenceIndex = competences.findIndex(competence => competence.id === competenceId);
    
    if (competenceIndex === -1) {
      console.error("Competence not found.");
      return false;
    }
    
    // Update competence data
    competences[competenceIndex] = { ...competences[competenceIndex], ...competenceData };
    await saveItems(COMPETENCES_KEY, competences);
    console.log("Competence updated successfully.");
    return true;
  } catch (error) {
    console.error("Error updating competence:", error);
    return false;
  }
};

export const deleteCompetence = async (competenceId: number): Promise<boolean> => {
  try {
    const competences = await getCompetences();
    const filteredCompetences = competences.filter(competence => competence.id !== competenceId);
    
    if (filteredCompetences.length === competences.length) {
      console.error("Competence not found.");
      return false;
    }
    
    await saveItems(COMPETENCES_KEY, filteredCompetences);
    
    // Also delete associated main tables
    const mainTables = await getMainTables();
    const filteredMainTables = mainTables.filter(table => table.competenceId !== competenceId);
    await saveItems(MAIN_TABLES_KEY, filteredMainTables);
    
    console.log("Competence and associated items deleted successfully.");
    return true;
  } catch (error) {
    console.error("Error deleting competence:", error);
    return false;
  }
};

// MAIN TABLE FUNCTIONS
export const getMainTables = async (): Promise<MainTable[]> => {
  return getItems<MainTable>(MAIN_TABLES_KEY);
};

export const deleteRateGeneralByTableId = async (tableId: number): Promise<void> => {
  try {
    const rateGeneralTables = await getRateGeneralTables();
    const filteredRateGeneralTables = rateGeneralTables.filter(rate => rate.tableId !== tableId);

    if (filteredRateGeneralTables.length === rateGeneralTables.length) {
      console.log(`No RateGeneral entries found for tableId: ${tableId}`);
      return;
    }

    await saveItems(RATE_GENERAL_KEY, filteredRateGeneralTables);
    console.log(`Deleted RateGeneral entries for tableId: ${tableId}`);
  } catch (error) {
    console.error(`Error deleting RateGeneral entries for tableId: ${tableId}`, error);
  }
};

export const deleteMainTableByCompetenceId = async (competenceId: number): Promise<void> => {
  try {
    const mainTables = await getMainTables();
    const filteredMainTables = mainTables.filter(table => table.competenceId !== competenceId);

    if (filteredMainTables.length === mainTables.length) {
      console.log(`No MainTable entries found for competenceId: ${competenceId}`);
      return;
    }

    await saveItems(MAIN_TABLES_KEY, filteredMainTables);
    console.log(`Deleted MainTable entries for competenceId: ${competenceId}`);
  } catch (error) {
    console.error(`Error deleting MainTable entries for competenceId: ${competenceId}`, error);
  }
};

export const updateElementGroup = async (rateId: number, elementGroupKey: keyof MainRateGeneral, value: number) => {
  try {
    // Prepare the data to update
    const updateData: Partial<MainRateGeneral> = {
      [elementGroupKey]: value, // Dynamically set the field to update
    };

    // Call the updateRateGeneral function
    const success = await updateRateGeneral(rateId, updateData);

    if (success) {
      console.log(`Successfully updated ${elementGroupKey} to ${value} for rateId: ${rateId}`);
    } else {
      console.error(`Failed to update ${elementGroupKey} for rateId: ${rateId}`);
    }
  } catch (error) {
    console.error("Error updating element group:", error);
  }
};


export const getMainTablesByCompetenceId = async (competenceId: number): Promise<MainTable[]> => {
  try {
    const mainTables = await getMainTables();
    return mainTables.filter(table => table.competenceId === competenceId);
  } catch (error) {
    console.error("Error getting main tables by competence ID:", error);
    return [];
  }
};

export const deleteCompetencesByFolderId = async (folderId: number): Promise<void> => {
  try {
    const competences = await getCompetences();
    const filteredCompetences = competences.filter(competence => competence.folderId !== folderId);

    if (filteredCompetences.length === competences.length) {
      console.log(`No Competence entries found for folderId: ${folderId}`);
      return;
    }

    await saveItems(COMPETENCES_KEY, filteredCompetences);
    console.log(`Deleted Competence entries for folderId: ${folderId}`);
  } catch (error) {
    console.error(`Error deleting Competence entries for folderId: ${folderId}`, error);
  }
};


export const getMainTableById = async (tableId: number): Promise<MainTable | null> => {
  try {
    const mainTables = await getMainTables();
    const table = mainTables.find(table => table.id === tableId);
    return table || null;
  } catch (error) {
    console.error("Error getting main table by ID:", error);
    return null;
  }
};

export const insertMainTable = async (tableData: Omit<MainTable, 'id'>): Promise<number | false> => {
  try {
    const mainTables = await getMainTables();
    const id = await getNextId(MAIN_TABLES_KEY);
    const newTable: MainTable = { id, ...tableData };
    mainTables.push(newTable);
    await saveItems(MAIN_TABLES_KEY, mainTables);
    console.log("Main table added successfully. ID:", id);
    return id;
  } catch (error) {
    console.error("Error inserting main table:", error);
    return false;
  }
};

export const updateMainTable = async (
  tableId: number,
  tableData: Partial<MainTable>
): Promise<boolean> => {
  try {
    const mainTables = await getMainTables();
    const tableIndex = mainTables.findIndex(table => table.id === tableId);
    
    if (tableIndex === -1) {
      console.error("Main table not found.");
      return false;
    }
    
    // Update main table data
    mainTables[tableIndex] = { ...mainTables[tableIndex], ...tableData };
    await saveItems(MAIN_TABLES_KEY, mainTables);
    console.log("Main table updated successfully.");
    return true;
  } catch (error) {
    console.error("Error updating main table:", error);
    return false;
  }
};

export const deleteMainTable = async (tableId: number): Promise<boolean> => {
  try {
    const mainTables = await getMainTables();
    const filteredMainTables = mainTables.filter(table => table.id !== tableId);
    
    if (filteredMainTables.length === mainTables.length) {
      console.error("Main table not found.");
      return false;
    }
    
    await saveItems(MAIN_TABLES_KEY, filteredMainTables);
    
    // Delete associated rate tables
    const rateGeneralTables = await getRateGeneralTables();
    const filteredRateGeneralTables = rateGeneralTables.filter(rate => rate.tableId !== tableId);
    await saveItems(RATE_GENERAL_KEY, filteredRateGeneralTables);
    
    const rateJumpTables = await getRateJumpTables();
    const filteredRateJumpTables = rateJumpTables.filter(rate => rate.tableId !== tableId);
    await saveItems(RATE_JUMP_KEY, filteredRateJumpTables);
    
    console.log("Main table and associated items deleted successfully.");
    return true;
  } catch (error) {
    console.error("Error deleting main table:", error);
    return false;
  }
};

// MAIN RATE GENERAL FUNCTIONS
export const getRateGeneralTables = async (): Promise<MainRateGeneral[]> => {
  return getItems<MainRateGeneral>(RATE_GENERAL_KEY);
};



export const getRateGeneralByTableId = async (tableId: number): Promise<MainRateGeneral | null> => {
  try {
    const rateGeneralTables = await getRateGeneralTables();
    const rateGeneral = rateGeneralTables.find(rate => rate.tableId === tableId);
    return rateGeneral || null;
  } catch (error) {
    console.error("Error getting rate general by table ID:", error);
    return null;
  }
};

export const insertRateGeneral = async (rateData: Omit<MainRateGeneral, 'id'>): Promise<number | false> => {
  try {
    const rateGeneralTables = await getRateGeneralTables();
    
    // Check if entry already exists for this table ID
    const existingRate = rateGeneralTables.find(rate => rate.tableId === rateData.tableId);
    if (existingRate) {
      console.error("Rate general already exists for this table.");
      return false;
    }
    
    const id = await getNextId(RATE_GENERAL_KEY);
    const newRate: MainRateGeneral = { id, ...rateData };
    rateGeneralTables.push(newRate);
    await saveItems(RATE_GENERAL_KEY, rateGeneralTables);
    console.log("Rate general added successfully. ID:", id);
    return id;
  } catch (error) {
    console.error("Error inserting rate general:", error);
    return false;
  }
};

export const updateRateGeneral = async (
  rateId: number,
  rateData: Partial<MainRateGeneral>
): Promise<boolean> => {
  try {
    const rateGeneralTables = await getRateGeneralTables();
    const rateIndex = rateGeneralTables.findIndex(rate => rate.id === rateId);
    
    if (rateIndex === -1) {
      console.error("Rate general not found.");
      return false;
    }
    
    // Update rate general data
    rateGeneralTables[rateIndex] = { ...rateGeneralTables[rateIndex], ...rateData };
    await saveItems(RATE_GENERAL_KEY, rateGeneralTables);
    console.log("Rate general updated successfully.");
    return true;
  } catch (error) {
    console.error("Error updating rate general:", error);
    return false;
  }
};

export const deleteRateGeneral = async (rateId: number): Promise<boolean> => {
  try {
    const rateGeneralTables = await getRateGeneralTables();
    const filteredRateGeneralTables = rateGeneralTables.filter(rate => rate.id !== rateId);
    
    if (filteredRateGeneralTables.length === rateGeneralTables.length) {
      console.error("Rate general not found.");
      return false;
    }
    
    await saveItems(RATE_GENERAL_KEY, filteredRateGeneralTables);
    console.log("Rate general deleted successfully.");
    return true;
  } catch (error) {
    console.error("Error deleting rate general:", error);
    return false;
  }
};

// MAIN RATE JUMP FUNCTIONS
export const getRateJumpTables = async (): Promise<MainRateJump[]> => {
  return getItems<MainRateJump>(RATE_JUMP_KEY);
};

export const getRateJumpByTableId = async (tableId: number): Promise<MainRateJump | null> => {
  try {
    const rateJumpTables = await getRateJumpTables();
    const rateJump = rateJumpTables.find(rate => rate.tableId === tableId);
    return rateJump || null;
  } catch (error) {
    console.error("Error getting rate jump by table ID:", error);
    return null;
  }
};

export const insertRateJump = async (rateData: Omit<MainRateJump, 'id'>): Promise<number | false> => {
  try {
    const rateJumpTables = await getRateJumpTables();
    
    // Check if entry already exists for this table ID
    const existingRate = rateJumpTables.find(rate => rate.tableId === rateData.tableId);
    if (existingRate) {
      console.error("Rate jump already exists for this table.");
      return false;
    }
    
    const id = await getNextId(RATE_JUMP_KEY);
    const newRate: MainRateJump = { id, ...rateData };
    rateJumpTables.push(newRate);
    await saveItems(RATE_JUMP_KEY, rateJumpTables);
    console.log("Rate jump added successfully. ID:", id);
    return id;
  } catch (error) {
    console.error("Error inserting rate jump:", error);
    return false;
  }
};

export const updateRateJump = async (
  rateId: number,
  rateData: Partial<MainRateJump>
): Promise<boolean> => {
  try {
    const rateJumpTables = await getRateJumpTables();
    const rateIndex = rateJumpTables.findIndex(rate => rate.id === rateId);
    
    if (rateIndex === -1) {
      console.error("Rate jump not found.");
      return false;
    }
    
    // Update rate jump data
    rateJumpTables[rateIndex] = { ...rateJumpTables[rateIndex], ...rateData };
    await saveItems(RATE_JUMP_KEY, rateJumpTables);
    console.log("Rate jump updated successfully.");
    return true;
  } catch (error) {
    console.error("Error updating rate jump:", error);
    return false;
  }
};

export const deleteRateJump = async (rateId: number): Promise<boolean> => {
  try {
    const rateJumpTables = await getRateJumpTables();
    const filteredRateJumpTables = rateJumpTables.filter(rate => rate.id !== rateId);
    
    if (filteredRateJumpTables.length === rateJumpTables.length) {
      console.error("Rate jump not found.");
      return false;
    }
    
    await saveItems(RATE_JUMP_KEY, filteredRateJumpTables);
    console.log("Rate jump deleted successfully.");
    return true;
  } catch (error) {
    console.error("Error deleting rate jump:", error);
    return false;
  }
};

// Clean up existing data to ensure all records have correct structure
export const cleanupData = async (): Promise<void> => {
  try {
    console.log("Starting data cleanup...");
    
    // Clean up users
    const users = await getUsers();
    let usersUpdated = false;
    
    users.forEach((user, index) => {
      if (typeof user.id !== 'number') {
        user.id = index + 1;
        usersUpdated = true;
      }
    });
    
    if (usersUpdated) {
      await saveItems(USERS_KEY, users);
      console.log("Fixed user IDs");
    }
    
    console.log("Data cleanup completed");
  } catch (error) {
    console.error("Error during data cleanup:", error);
  }
};

export const getMainTableByCompetenceId = async (competenceId: number): Promise<MainTable[]> => {
  try {
    const mainTables = await getMainTables();
    return mainTables.filter(table => table.competenceId === competenceId);
  } catch (error) {
    console.error("Error getting main tables by competence ID:", error);
    return [];
  }
};

export const deleteMainTableentries = async (competenceId: number, number: number): Promise<boolean> => {
  try {
    const mainTables = await getMainTables();
    const filteredMainTables = mainTables.filter(
      table => !(table.competenceId === competenceId && table.number === number)
    );

    if (filteredMainTables.length === mainTables.length) {
      console.error("Main table entry not found.");
      return false;
    }

    await saveItems(MAIN_TABLES_KEY, filteredMainTables);
    console.log(`Deleted MainTable entry with competenceId: ${competenceId}, number: ${number}`);
    return true;
  } catch (error) {
    console.error("Error deleting MainTable entry:", error);
    return false;
  }
};


// Add test data
export const addTestData = async () => {
  try {
    // First, clean up any existing data
    await cleanupData();
    
    // Add test user if it doesn't exist
    const testUsername = "Luis";
    const testPassword = "123";
    
    const users = await getUsers();
    const userExists = users.some((user) => user.username === testUsername);
    
    let userId = 1;
    if (!userExists) {
      const result = await insertUser(testUsername, testPassword);
      if (!result) {
        console.error("Failed to add test user.");
        return;
      }
      userId = (await getUsers()).find(user => user.username === testUsername)?.id || 1;
    } else {
      userId = users.find(user => user.username === testUsername)?.id || 1;
    }
    
    // Add test folder
    const folderExists = (await getFolders()).some(folder => folder.userId === userId && folder.name === "Test Folder");
    
    let folderId = 1;
    if (!folderExists) {
      const folderData: Omit<Folder, 'id'> = {
        userId,
        name: "Test Folder",
        description: "This is a test folder",
        type: true, // Training
        date: new Date().toISOString(),
        filled: false
      };
      
      const result = await insertFolder(folderData);
      if (!result) {
        console.error("Failed to add test folder.");
        return;
      }
      folderId = result as number;
    } else {
      folderId = (await getFolders()).find(folder => folder.userId === userId && folder.name === "Test Folder")?.id || 1;
    }
    
    // Add test session
    const sessionExists = (await getSessions()).some(session => session.userId === userId);
    
    let sessionId = 1;
    if (!sessionExists) {
      const sessionData: Omit<Session, 'id'> = {
        userId,
        gender: true // Male
      };
      
      const result = await insertSession(sessionData);
      if (!result) {
        console.error("Failed to add test session.");
        return;
      }
      sessionId = result as number;
    } else {
      sessionId = (await getSessions()).find(session => session.userId === userId)?.id || 1;
    }
    
    // Add test competence
    const competenceExists = (await getCompetences()).some(comp => comp.folderId === folderId);
    
    let competenceId = 1;
    if (!competenceExists) {
      const competenceData: Omit<Competence, 'id'> = {
        name: "Test Competition",
        description: "This is a test competition",
        date: new Date().toISOString(),
        type: "Floor",
        gender: true,
        sessionId,
        folderId,
        userId,
        numberOfParticipants: 10
      };
      
      const result = await insertCompetence(competenceData);
      if (!result) {
        console.error("Failed to add test competence.");
        return;
      }
      competenceId = result as number;
    } else {
      competenceId = (await getCompetences()).find(comp => comp.folderId === folderId)?.id || 1;
    }
    
    // Add test main table
    const mainTableExists = (await getMainTables()).some(table => table.competenceId === competenceId);
    
    let tableId = 1;
    if (!mainTableExists) {
      const tableData: Omit<MainTable, 'id'> = {
        competenceId,
        number: 1,
        name: "Test Participant",
        event: "Test Event",
        noc: "123",
        bib: "456",
        j: 1,
        i: 2,
        h: 3,
        g: 4,
        f: 5,
        e: 6,
        d: 7,
        c: 8,
        b: 9,
        a: 10,
        dv: 11,
        eg: 12,
        sb: 13,
        nd: 14,
        cv: 15,
        sv: 16,
        e2: 17,
        d3: 18,
        e3: 19,
        delt: 20,
        percentage: 95
      };
      
      const result = await insertMainTable(tableData);
      if (!result) {
        console.error("Failed to add test main table.");
        return;
      }
      tableId = result as number;
    } else {
      tableId = (await getMainTables()).find(table => table.competenceId === competenceId)?.id || 1;
    }
    
    // Add test rate general
    const rateGeneralExists = (await getRateGeneralTables()).some(rate => rate.tableId === tableId);
    
    if (!rateGeneralExists) {
      const rateGeneralData: Omit<MainRateGeneral, 'id'> = {
        tableId,
        stickBonus: true,
        numberOfElements: 6,
        difficultyValues: 3.5,
        elementGroups1: 0.5,
        elementGroups2: 0.5,
        elementGroups3: 0.5,
        elementGroups4: 0.5,
        elementGroups5: 0.5,
        execution: 8.5,
        eScore: 9.0,
        myScore: 12.5,
        compD: 6.0,
        compE: 8.0,
        compSd: 0.0,
        compNd: 0.0,
        compScore: 14.0,
        comments: "Good performance overall",
        paths: "Path A",
      };
      
      const result = await insertRateGeneral(rateGeneralData);
      if (!result) {
        console.error("Failed to add test rate general.");
      }
    }
    


    // Add test rate jump
    const rateJumpExists = (await getRateJumpTables()).some(rate => rate.tableId === tableId);
    
    if (!rateJumpExists) {
      const rateJumpData: Omit<MainRateJump, 'id'> = {
        tableId,
        stickBonus: true,
        vaultNumber: 2,
        startValue: 5.6,
        description: "Double somersault with twist",
        execution: 9.2,
        myScore: 14.8,
        compD: 5.8,
        compE: 9.0,
        compSd: 0.0,
        compNd: 0.0,
        score: 14.8
      };
      
      const result = await insertRateJump(rateJumpData);
      if (!result) {
        console.error("Failed to add test rate jump.");
      }
    }
    
    console.log("Test data added successfully.");
    
  } catch (error) {
    console.error("Error adding test data:", error);
  }
};

// Helper function to generate checksum for data integrity
const generateChecksum = async (data: string): Promise<string> => {
  try {
    console.log("generateChecksum: Starting checksum generation");
    const crypto = await import('expo-crypto');
    console.log("generateChecksum: expo-crypto imported successfully");
    const checksum = await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    console.log("generateChecksum: Checksum generated successfully:", checksum.substring(0, 16) + "...");
    return checksum;
  } catch (error) {
    console.error("Error generating checksum:", error);
    return '';
  }
};

// Export folder data with all related information
export const exportFolderData = async (
  folderId: number, 
  progressCallback?: (message: string, progress: number) => void
): Promise<string | null> => {
  try {
    console.log("exportFolderData: Starting export for folderId:", folderId);

    // Get folder
    const folder = await getFolderById(folderId);
    if (!folder) {
      console.error("Folder not found");
      return null;
    }
    
    progressCallback?.("Extrayendo información de carpeta...", 5);
    console.log("exportFolderData: Found folder:", folder.name);

    // Get competences for this folder
    const competences = await getCompetencesByFolderId(folderId);
    console.log("exportFolderData: Found competences:", competences.length);
    
    progressCallback?.("Calculando total de gimnastas...", 10);
    
    // Calculate total gymnasts
    let totalGymnasts = 0;
    for (const competence of competences) {
      const mainTables = await getMainTablesByCompetenceId(competence.id);
      totalGymnasts += mainTables.length;
    }
    
    progressCallback?.(`Exportando ${totalGymnasts} gimnastas...`, 15);
    
    // Get main tables and rate tables for each competence
    const competenceData = [];
    let processedGymnasts = 0;
    
    for (const competence of competences) {
      const mainTables = await getMainTablesByCompetenceId(competence.id);
      const tablesWithRates = [];
      
      for (const table of mainTables) {
        const progress = 15 + Math.floor((processedGymnasts / totalGymnasts) * 60); // 15% to 75%
        progressCallback?.(`Exportando gimnasta ${processedGymnasts + 1} de ${totalGymnasts}...`, progress);
        
        const rateGeneral = await getRateGeneralByTableId(table.id);
        const rateJump = await getRateJumpByTableId(table.id);
        
        tablesWithRates.push({
          mainTable: table,
          rateGeneral,
          rateJump
        });
        
        processedGymnasts++;
      }
      
      competenceData.push({
        competence,
        tables: tablesWithRates
      });
    }

    progressCallback?.("Generando archivo de exportación...", 80);
    console.log("exportFolderData: Collected all data, creating export object");

    // Create export object
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      folder,
      competences: competenceData
    };

    // Convert to JSON string
    const jsonData = JSON.stringify(exportData);
    console.log("exportFolderData: JSON data created, length:", jsonData.length);
    
    progressCallback?.("Generando checksum de seguridad...", 85);
    // Generate checksum
    console.log("exportFolderData: Generating checksum...");
    const checksum = await generateChecksum(jsonData);
    console.log("exportFolderData: Checksum generated:", checksum);
    
    progressCallback?.("Finalizando exportación...", 95);
    // Create final export object with security
    console.log("exportFolderData: Creating secure export data with btoa...");
    const secureExportData = {
      data: btoa(unescape(encodeURIComponent(jsonData))),
      checksum,
      metadata: {
        version: "1.0",
        exportDate: exportData.exportDate,
        folderName: folder.name
      }
    };

    console.log("exportFolderData: Export completed successfully");
    return JSON.stringify(secureExportData);
  } catch (error) {
    console.error("Error exporting folder data:", error);
    return null;
  }
};

// Import folder data and recreate all related information
export const importFolderData = async (
  importDataString: string, 
  targetUserId: number, 
  progressCallback?: (message: string, progress: number) => void
): Promise<boolean> => {
  try {
    // Parse import data
    const secureImportData = JSON.parse(importDataString);
    
    if (!secureImportData.data || !secureImportData.checksum) {
      throw new Error("Invalid import file format");
    }

    progressCallback?.("Validando archivo...", 5);

    // Decode data
    const jsonData = decodeURIComponent(escape(atob(secureImportData.data)));
    
    // Verify checksum
    const calculatedChecksum = await generateChecksum(jsonData);
    if (calculatedChecksum !== secureImportData.checksum) {
      throw new Error("Data integrity check failed - file may be corrupted");
    }

    progressCallback?.("Procesando datos...", 15);

    // Parse the actual data
    const importData = JSON.parse(jsonData);
    
    if (!importData.folder || !importData.competences) {
      throw new Error("Invalid data structure in import file");
    }

    // Calculate total gymnasts for progress tracking
    let totalGymnasts = 0;
    for (const competenceData of importData.competences) {
      totalGymnasts += competenceData.tables ? competenceData.tables.length : 0;
    }

    progressCallback?.(`Preparando importación de ${totalGymnasts} gimnastas...`, 20);

    // Map to store old ID -> new ID mappings
    const idMappings = {
      folders: new Map<number, number>(),
      competences: new Map<number, number>(),
      mainTables: new Map<number, number>()
    };

    // Import folder (assign to target user)
    const newFolderData = {
      ...importData.folder,
      userId: targetUserId
    };
    delete newFolderData.id; // Remove old ID

    progressCallback?.("Creando carpeta...", 25);
    const newFolderId = await insertFolder(newFolderData);
    if (!newFolderId) {
      throw new Error("Failed to create folder");
    }
    idMappings.folders.set(importData.folder.id, newFolderId);

    let processedGymnasts = 0;

    // Import competences
    for (const competenceData of importData.competences) {
      const newCompetenceData = {
        ...competenceData.competence,
        folderId: newFolderId,
        userId: targetUserId
      };
      delete newCompetenceData.id; // Remove old ID

      const newCompetenceId = await insertCompetence(newCompetenceData);
      if (!newCompetenceId) {
        throw new Error("Failed to create competence");
      }
      idMappings.competences.set(competenceData.competence.id, newCompetenceId);

      // Import main tables and rate tables
      for (const tableData of competenceData.tables) {
        const progress = 25 + Math.floor((processedGymnasts / totalGymnasts) * 65); // 25% to 90%
        progressCallback?.(`Importando gimnasta ${processedGymnasts + 1} de ${totalGymnasts}...`, progress);

        const newMainTableData = {
          ...tableData.mainTable,
          competenceId: newCompetenceId
        };
        delete newMainTableData.id; // Remove old ID

        const newMainTableId = await insertMainTable(newMainTableData);
        if (!newMainTableId) {
          throw new Error("Failed to create main table");
        }
        idMappings.mainTables.set(tableData.mainTable.id, newMainTableId);

        // Import rate general if exists
        if (tableData.rateGeneral) {
          const newRateGeneralData = {
            ...tableData.rateGeneral,
            tableId: newMainTableId
          };
          delete newRateGeneralData.id; // Remove old ID
          await insertRateGeneral(newRateGeneralData);
        }

        // Import rate jump if exists
        if (tableData.rateJump) {
          const newRateJumpData = {
            ...tableData.rateJump,
            tableId: newMainTableId
          };
          delete newRateJumpData.id; // Remove old ID
          await insertRateJump(newRateJumpData);
        }

        processedGymnasts++;
      }
    }

    progressCallback?.("Finalizando importación...", 95);
    console.log("Import completed successfully", idMappings);
    return true;
  } catch (error) {
    console.error("Error importing folder data:", error);
    return false;
  }
};



// Helper functions for querying related data
export const getFolderWithCompetences = async (folderId: number): Promise<any> => {
  try {
    const folder = await getFolderById(folderId);
    if (!folder) return null;
    
    const competences = await getCompetencesByFolderId(folderId);
    
    return {
      ...folder,
      competences
    };
  } catch (error) {
    console.error("Error getting folder with competences:", error);
    return null;
  }
};

export const getCompetenceWithTables = async (competenceId: number): Promise<any> => {
  try {
    const competence = await getCompetenceById(competenceId);
    if (!competence) return null;
    
    const mainTables = await getMainTablesByCompetenceId(competenceId);
    
    // Include rates for each table
    const tablesWithRates = await Promise.all(mainTables.map(async (table) => {
      const rateGeneral = await getRateGeneralByTableId(table.id);
      const rateJump = await getRateJumpByTableId(table.id);
      
      return {
        ...table,
        rateGeneral,
        rateJump
      };
    }));
    
    return {
      ...competence,
      tables: tablesWithRates
    };
  } catch (error) {
    console.error("Error getting competence with tables:", error);
    return null;
  }
};

// Get user data with all related information
export const getUserWithAllData = async (userId: number): Promise<any> => {
  try {
    const user = await getUserById(userId);
    if (!user) return null;
    
    const folders = await getFoldersByUserId(userId);
    const sessions = await getSessionsByUserId(userId);
    
    // Get competences for each folder
    const foldersWithCompetences = await Promise.all(folders.map(async (folder) => {
      const competences = await getCompetencesByFolderId(folder.id);
      return {
        ...folder,
        competences
      };
    }));
    
    return {
      ...user,
      folders: foldersWithCompetences,
      sessions
    };
  } catch (error) {
    console.error("Error getting user with all data:", error);
    return null;
  }
};

// Bulk operations for data import/export
export const exportAllData = async (): Promise<any> => {
  try {
    const users = await getUsers();
    const folders = await getFolders();
    const sessions = await getSessions();
    const competences = await getCompetences();
    const mainTables = await getMainTables();
    const rateGeneralTables = await getRateGeneralTables();
    const rateJumpTables = await getRateJumpTables();
    
    return {
      users,
      folders,
      sessions,
      competences,
      mainTables,
      rateGeneralTables,
      rateJumpTables
    };
  } catch (error) {
    console.error("Error exporting all data:", error);
    return null;
  }
};

export const importAllData = async (data: any): Promise<boolean> => {
  try {
    if (!data) return false;
    
    // Import data for each table
    if (data.users) await saveItems(USERS_KEY, data.users);
    if (data.folders) await saveItems(FOLDERS_KEY, data.folders);
    if (data.sessions) await saveItems(SESSIONS_KEY, data.sessions);
    if (data.competences) await saveItems(COMPETENCES_KEY, data.competences);
    if (data.mainTables) await saveItems(MAIN_TABLES_KEY, data.mainTables);
    if (data.rateGeneralTables) await saveItems(RATE_GENERAL_KEY, data.rateGeneralTables);
    if (data.rateJumpTables) await saveItems(RATE_JUMP_KEY, data.rateJumpTables);
    
    console.log("All data imported successfully.");
    return true;
  } catch (error) {
    console.error("Error importing all data:", error);
    return false;
  }
};

// Clear all data (for testing or reset purposes)
export const clearAllData = async (): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove([
      USERS_KEY,
      FOLDERS_KEY,
      SESSIONS_KEY,
      COMPETENCES_KEY,
      MAIN_TABLES_KEY,
      RATE_GENERAL_KEY,
      RATE_JUMP_KEY
    ]);
    console.log("All data cleared successfully.");
    return true;
  } catch (error) {
    console.error("Error clearing all data:", error);
    return false;
  }
};

// Additional helper functions for common queries

// Get all competitions for a user
export const getUserCompetitions = async (userId: number): Promise<Competence[]> => {
  try {
    const competences = await getCompetences();
    return competences.filter(competence => competence.userId === userId);
  } catch (error) {
    console.error("Error getting user competitions:", error);
    return [];
  }
};

// Get all recent competitions (past 30 days)
export const getRecentCompetitions = async (userId: number): Promise<Competence[]> => {
  try {
    const competences = await getUserCompetitions(userId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return competences.filter(competence => {
      const competenceDate = new Date(competence.date);
      return competenceDate >= thirtyDaysAgo;
    });
  } catch (error) {
    console.error("Error getting recent competitions:", error);
    return [];
  }
};

// Search folders by name or description
export const searchFolders = async (userId: number, searchTerm: string): Promise<Folder[]> => {
  try {
    const folders = await getFoldersByUserId(userId);
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return folders.filter(folder => 
      folder.name.toLowerCase().includes(lowerSearchTerm) || 
      folder.description.toLowerCase().includes(lowerSearchTerm)
    );
  } catch (error) {
    console.error("Error searching folders:", error);
    return [];
  }
};

// Search competitions by name or description
export const searchCompetitions = async (userId: number, searchTerm: string): Promise<Competence[]> => {
  try {
    const competences = await getUserCompetitions(userId);
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return competences.filter(competence => 
      competence.name.toLowerCase().includes(lowerSearchTerm) || 
      competence.description.toLowerCase().includes(lowerSearchTerm)
    );
  } catch (error) {
    console.error("Error searching competitions:", error);
    return [];
  }
};

// Get statistics for a user
export const getUserStatistics = async (userId: number): Promise<any> => {
  try {
    const folders = await getFoldersByUserId(userId);
    const competences = await getUserCompetitions(userId);
    const mainTables = await getMainTables();
    
    // Filter main tables that belong to the user's competitions
    const userCompetenceIds = competences.map(comp => comp.id);
    const userMainTables = mainTables.filter(table => 
      userCompetenceIds.includes(table.competenceId)
    );
    
    // Calculate statistics
    return {
      totalFolders: folders.length,
      totalCompetitions: competences.length,
      totalParticipants: userMainTables.length,
      competenceTypes: countByProperty(competences, 'type'),
      foldersPerType: {
        training: folders.filter(folder => folder.type).length,
        competence: folders.filter(folder => !folder.type).length
      }
    };
  } catch (error) {
    console.error("Error getting user statistics:", error);
    return null;
  }
};

// Count items by a specific property
const countByProperty = <T>(items: T[], property: keyof T): Record<string, number> => {
  return items.reduce((acc: Record<string, number>, item: T) => {
    const propValue = String(item[property]);
    acc[propValue] = (acc[propValue] || 0) + 1;
    return acc;
  }, {});
};

// Demo or initialization function
export const initializeApp = async (): Promise<void> => {
  try {
    // Run cleanup to ensure data integrity
    await cleanupData();
    
    // Check if any data exists
    const users = await getUsers();
    
    // If no users, initialize with default users and test data
    if (users.length === 0) {
      console.log("No users found. Initializing app with default users and test data...");
      await addTestData();
    } else {
      console.log(`App initialized with ${users.length} existing users.`);
      
      // Ensure default users exist even if other users are present
      const defaultUsernames = ["Bernabe", "Luis", "LuisAdmin"];
      const missingUsers = defaultUsernames.filter(
        username => !users.some(user => user.username === username)
      );
      
      if (missingUsers.length > 0) {
        console.log(`Adding missing default users: ${missingUsers.join(", ")}`);
        await addTestData();
      }
    }
  } catch (error) {
    console.error("Error initializing app:", error);
  }
};

export const updateFolderPositions = async (folderPositions: { id: number; position: number }[]): Promise<boolean> => {
  try {
    const folders = await getFolders();
    
    // Update positions for each folder
    folderPositions.forEach(({ id, position }) => {
      const folderIndex = folders.findIndex(folder => folder.id === id);
      if (folderIndex !== -1) {
        folders[folderIndex].position = position;
      }
    });
    
    await saveItems(FOLDERS_KEY, folders);
    console.log("Folder positions updated successfully.");
    return true;
  } catch (error) {
    console.error("Error updating folder positions:", error);
    return false;
  }
};

export const getFoldersOrderedByPosition = async (): Promise<Folder[]> => {
  try {
    const folders = await getFolders();
    
    // Sort by position, folders without position go to the end
    return folders.sort((a, b) => {
      if (a.position === undefined && b.position === undefined) return 0;
      if (a.position === undefined) return 1;
      if (b.position === undefined) return -1;
      return a.position - b.position;
    });
  } catch (error) {
    console.error("Error getting ordered folders:", error);
    return [];
  }
};