import { Platform } from 'react-native';
import * as ExpoFS from 'expo-file-system/legacy';
// Carga condicional de RNFS para evitar crash en Expo Go / cuando no existe build nativa
let RNFS: any = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RNFS = require('react-native-fs');
  } catch (e) {
    console.warn('[platformFS] react-native-fs no disponible, usando fallback ExpoFS en', Platform.OS);
  }
}

// Pequeña abstracción para no usar expo-file-system en iOS.
// API mínima usada en exportToPDFv1.ts
export interface PlatformFS {
  readFileBase64(uri: string): Promise<string>;
  writeFileBase64(uri: string, base64: string): Promise<void>;
  getInfo(uri: string): Promise<{ exists: boolean; size: number | null }>;  
  documentDir(): string;
}

const normalizeFileUri = (uri: string) => {
  if (uri.startsWith('file://')) return uri.replace('file://', '');
  return uri;
};

let impl: PlatformFS;
export const isIOSUsingFallback = Platform.OS === 'ios' && !RNFS;

if (Platform.OS === 'ios' && RNFS) {
  impl = {
    async readFileBase64(uri: string) {
      const p = normalizeFileUri(uri);
      return RNFS.readFile(p, 'base64');
    },
    async writeFileBase64(uri: string, base64: string) {
      const p = normalizeFileUri(uri);
      await RNFS.writeFile(p, base64, 'base64');
    },
    async getInfo(uri: string) {
      try {
        const p = normalizeFileUri(uri);
        const stat = await RNFS.stat(p);
        return { exists: !!stat && stat.isFile(), size: Number(stat.size) };
      } catch {
        return { exists: false, size: null };
      }
    },
    documentDir() {
      return RNFS.DocumentDirectoryPath.endsWith('/') ? RNFS.DocumentDirectoryPath : RNFS.DocumentDirectoryPath + '/';
    }
  };
} else {
  impl = {
    async readFileBase64(uri: string) {
      return ExpoFS.readAsStringAsync(uri, { encoding: 'base64' as any });
    },
    async writeFileBase64(uri: string, base64: string) {
      await ExpoFS.writeAsStringAsync(uri, base64, { encoding: 'base64' as any });
    },
    async getInfo(uri: string) {
      const info = await ExpoFS.getInfoAsync(uri);
      return { exists: info.exists, size: (info as any).size ?? null };
    },
    documentDir() { return (ExpoFS as any).documentDirectory || ''; }
  };
}

export const PFS: PlatformFS = impl;
