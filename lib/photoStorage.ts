import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { db } from './database';

// Photos are stored in documentDirectory (persistent across launches; only
// deleted on uninstall). cacheDirectory is volatile — both iOS and Android
// may purge it under storage pressure, which previously caused user-visible
// "image disappeared" bugs. iCloud backup of these files on iOS is desirable:
// if the user restores the device, the photos come back.

const PHOTOS_SUBDIR = 'photos/';
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

// Maximum dimension we ever store. Bitmap memory grows quadratically — a
// 4032×3024 phone photo decodes to ~48MB in RAM (RGBA8888), three of those
// blow past the Java heap budget on Android tablets and OOM the process.
// Resizing to ~1600px on Android keeps the decoded bitmap under ~10MB.
const TARGET_MAX_DIMENSION = Platform.OS === 'android' ? 1600 : 2048;
const DEFAULT_QUALITY = 0.85;

const getExtFromUri = (uri: string): string => {
  const m = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : 'jpg';
};

export const ensurePhotosDir = async (): Promise<string | null> => {
  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) return null;
  const dir = baseDir + PHOTOS_SUBDIR;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // already exists or non-fatal
  }
  return dir;
};

/**
 * Re-encode an image so the resulting file fits within `maxBytes`.
 * Progressively reduces dimensions and JPEG quality. Returns the best URI
 * produced (may still exceed maxBytes if all attempts fail).
 */
export const compressImageToFit = async (
  srcUri: string,
  maxBytes: number = MAX_PHOTO_BYTES
): Promise<{ uri: string; size: number; compressed: boolean }> => {
  const initial = await FileSystem.getInfoAsync(srcUri);
  const initialSize = initial.exists ? (initial.size ?? 0) : 0;
  if (initial.exists && initialSize > 0 && initialSize <= maxBytes) {
    return { uri: srcUri, size: initialSize, compressed: false };
  }

  const dimensions: Array<number | null> = [null, 2560, 2048, 1600, 1280, 1024, 800];
  const qualities = [0.8, 0.6, 0.4, 0.25];

  let bestUri = srcUri;
  let bestSize = initialSize;

  for (const maxDim of dimensions) {
    for (const quality of qualities) {
      try {
        const actions = maxDim ? [{ resize: { width: maxDim } as any }] : [];
        const out = await ImageManipulator.manipulateAsync(srcUri, actions, {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        const oi = await FileSystem.getInfoAsync(out.uri);
        const size = oi.exists ? (oi.size ?? 0) : 0;
        if (oi.exists && size > 0) {
          bestUri = out.uri;
          bestSize = size;
          if (size <= maxBytes) {
            return { uri: bestUri, size: bestSize, compressed: true };
          }
        }
      } catch {
        // try next combination
      }
    }
  }
  return { uri: bestUri, size: bestSize, compressed: bestUri !== srcUri };
};

/**
 * Always-on import normalization: re-encode every imported photo as JPEG
 * capped at `TARGET_MAX_DIMENSION` on the long side. This keeps the decoded
 * bitmap small (~10MB on Android, ~16MB on iOS) instead of the 40-80MB a
 * raw phone-camera photo would produce. Returns a URI in cacheDirectory
 * (the caller is responsible for persisting it to documentDirectory).
 *
 * Falls back to the original URI if manipulation fails.
 */
export const normalizeImageForImport = async (srcUri: string): Promise<string> => {
  try {
    const out = await ImageManipulator.manipulateAsync(
      srcUri,
      [{ resize: { width: TARGET_MAX_DIMENSION } as any }],
      { compress: DEFAULT_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    const info = await FileSystem.getInfoAsync(out.uri);
    if (info.exists && (info.size ?? 0) > 0) return out.uri;
  } catch {
    // fall through to original
  }
  return srcUri;
};

/**
 * Copy a source URI into the app's persistent documents directory.
 * Returns the new URI on success, or the original on failure.
 */
export const copyToAppDocuments = async (srcUri: string): Promise<string> => {
  const dir = await ensurePhotosDir();
  if (!dir) return srcUri;
  const ext = getExtFromUri(srcUri);
  const filename = `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
  const dst = dir + filename;
  try {
    await FileSystem.copyAsync({ from: srcUri, to: dst });
    const info = await FileSystem.getInfoAsync(dst);
    if (info.exists && (info.size ?? 0) > 0) return dst;
  } catch {
    // fallback to original
  }
  return srcUri;
};

let migrationInFlight: Promise<void> | null = null;

/**
 * One-time migration on app start:
 *  - move photos that still live in cacheDirectory into documentDirectory
 *  - delete DB rows whose underlying file no longer exists (orphans).
 * Idempotent: safe to call on every launch.
 */
export const migrateAndCleanPhotos = async (): Promise<void> => {
  if (migrationInFlight) return migrationInFlight;
  migrationInFlight = (async () => {
    try {
      const docDir = await ensurePhotosDir();
      const cacheBase = FileSystem.cacheDirectory;
      const rows = await db.getAllAsync<any>(
        'SELECT id, image_uri FROM gymnast_images'
      );
      if (!rows || rows.length === 0) return;

      let migrated = 0;
      let orphans = 0;

      for (const row of rows) {
        const uri: string | undefined = row?.image_uri;
        if (!uri) {
          await db.runAsync('DELETE FROM gymnast_images WHERE id = ?', [row.id]);
          orphans++;
          continue;
        }

        let exists = false;
        try {
          const info = await FileSystem.getInfoAsync(uri);
          exists = info.exists && (info.size ?? 0) > 0;
        } catch {
          exists = false;
        }

        if (!exists) {
          await db.runAsync('DELETE FROM gymnast_images WHERE id = ?', [row.id]);
          orphans++;
          continue;
        }

        const inCache =
          docDir != null &&
          cacheBase != null &&
          uri.startsWith(cacheBase) &&
          uri.includes(PHOTOS_SUBDIR);

        if (inCache) {
          const filename = uri.split('/').pop() ?? `${Date.now()}.jpg`;
          const newUri = docDir + filename;
          let moved = false;
          try {
            await FileSystem.moveAsync({ from: uri, to: newUri });
            moved = true;
          } catch {
            try {
              await FileSystem.copyAsync({ from: uri, to: newUri });
              moved = true;
            } catch {
              moved = false;
            }
          }
          if (moved) {
            await db.runAsync(
              'UPDATE gymnast_images SET image_uri = ? WHERE id = ?',
              [newUri, row.id]
            );
            migrated++;
          }
        }
      }

      if (migrated > 0 || orphans > 0) {
        console.log(
          `[photoStorage] migration done: ${migrated} moved, ${orphans} orphan rows removed`
        );
      }
    } catch (e) {
      console.warn('[photoStorage] migration error:', e);
    }
  })();
  return migrationInFlight;
};
