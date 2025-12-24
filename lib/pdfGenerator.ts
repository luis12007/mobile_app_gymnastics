import * as Print from 'expo-print';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { Platform, Alert, Image } from 'react-native';
import { PDFDocument } from 'pdf-lib';
import { 
  getCompetitionById, 
  getGymnastsByCompetition, 
  Competition, 
  Gymnast,
  getGymnastTracesAsJSON,
  getGymnastImages,
  GymnastImage
} from './database';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

export interface TableRow {
  id: number;
  numero: number;
  gymnasta: string;
  evento: string;
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
  eScore: number;
  dScore: number;
  eDelta: number;
  delta: number;
  percentage: number;
  comments: string;
}

function isPdfOutOfMemoryError(error: any): boolean {
  const message = String(error?.message ?? error ?? '');
  return (
    message.includes('OutOfMemoryError') ||
    message.includes('Failed to allocate') ||
    message.includes('OOM')
  );
}

async function ensurePdfFileExists(uri: string, label: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error(`[PDF] ${label}: file was not created`);
  }
  console.log(`[PDF] ${label}: file size`, info.size, 'bytes');
}

function bytesToBase64(bytes: Uint8Array): string {
  const anyBuf: any = (globalThis as any).Buffer;
  if (anyBuf?.from) {
    return anyBuf.from(bytes).toString('base64');
  }
  const anyGlobal: any = globalThis as any;
  if (typeof anyGlobal?.btoa === 'function') {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return anyGlobal.btoa(binary);
  }
  throw new Error('[PDF] Could not convert bytes to base64 (no Buffer/btoa available)');
}

async function mergePdfUrisToSinglePdf(pdfUris: string[], outputUri: string): Promise<string> {
  console.log('[PDF][Chunk] Merging PDFs:', pdfUris.length);
  const merged = await PDFDocument.create();

  for (let i = 0; i < pdfUris.length; i++) {
    const uri = pdfUris[i];
    console.log(`[PDF][Chunk] Loading chunk PDF ${i + 1}/${pdfUris.length}:`, uri);
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = base64ToBytes(base64);
    const src = await PDFDocument.load(bytes);
    const pageCount = src.getPageCount();
    console.log(`[PDF][Chunk] Chunk ${i + 1} pages:`, pageCount);

    const copied = await merged.copyPages(src, Array.from({ length: pageCount }, (_, idx) => idx));
    for (const page of copied) merged.addPage(page);
  }

  const mergedBytes = await merged.save();
  const mergedBase64 = bytesToBase64(mergedBytes);
  await FileSystem.writeAsStringAsync(outputUri, mergedBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await ensurePdfFileExists(outputUri, '[PDF][Chunk] Merged PDF');
  return outputUri;
}

async function safeDeleteUris(uris: string[], label: string) {
  for (const uri of uris) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (e) {
      console.warn(`[PDF][Chunk] Could not delete ${label}:`, uri, e);
    }
  }
}

async function printHtmlToPdf(html: string, label: string): Promise<string> {
  console.log(`[PDF] printToFileAsync start: ${label} (html chars=${html.length})`);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  console.log(`[PDF] printToFileAsync done: ${label}`, uri);
  await ensurePdfFileExists(uri, label);

  try {
    const info = await FileSystem.getInfoAsync(uri);
    const size = info.exists && typeof (info as any).size === 'number' ? (info as any).size : 0;
    if (size > 0 && size < 2048) {
      console.warn(`[PDF] ${label}: suspiciously small PDF size (${size} bytes). This may render as a blank page.`);
    }
  } catch {
    // ignore
  }
  return uri;
}

const PDF_MIN_VALID_BYTES = 2048;

async function getFileSizeBytes(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    const size = info.exists && typeof (info as any).size === 'number' ? (info as any).size : 0;
    return size;
  } catch {
    return 0;
  }
}

async function generateCompetitionPDFChunked(
  competition: Competition,
  competitionId: number,
  tableData: TableRow[],
  gymnasts: Gymnast[]
): Promise<string> {
  logPdfImageOptimizerStatus('chunked');
  const rowsForIndividualPages = tableData.filter(row => row.gymnasta && row.gymnasta.trim() !== '');
  const timestamp = Date.now();

  let chunkSize = Platform.OS === 'android' ? 3 : 8;
  const minChunkSize = 1;
  const maxAttempts = 4;

  console.log('[PDF][Chunk] Starting chunked generation', {
    competitionId,
    totalRows: rowsForIndividualPages.length,
    initialChunkSize: chunkSize,
    platform: Platform.OS,
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const chunkUris: string[] = [];
    let summaryUri: string | null = null;
    try {
      console.log(`[PDF][Chunk] Attempt ${attempt}/${maxAttempts} with chunkSize=${chunkSize}`);
      const totalChunks = Math.ceil(rowsForIndividualPages.length / chunkSize);
      console.log('[PDF][Chunk] Total chunks:', totalChunks);

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(rowsForIndividualPages.length, start + chunkSize);
        const chunkRows = rowsForIndividualPages.slice(start, end);
        console.log(
          `[PDF][Chunk] Generating chunk ${chunkIndex + 1}/${totalChunks} rows ${start}-${end - 1}`,
          chunkRows.map(r => ({ id: r.id, numero: r.numero, evento: r.evento, gymnast: r.gymnasta }))
        );

        const baseLabel = `[PDF][Chunk] Chunk ${chunkIndex + 1}`;

        const html = await generatePDFHTML(competition, tableData, gymnasts, {
          rowsForIndividualPages: chunkRows,
          includeIndividualPages: true,
          includeSummary: false,
          debugLabel: `chunk-${chunkIndex + 1}`,
          whiteboardMode: 'full',
        });

        let uri: string | null = null;

        try {
          uri = await printHtmlToPdf(html, baseLabel);
        } catch (err) {
          // Android-only: extra fallbacks for memory/blank rendering.
          if (Platform.OS === 'android' && chunkSize === 1 && isPdfOutOfMemoryError(err)) {
            console.warn('[PDF][Chunk] OOM while printing chunk; retrying with per-image embedding', {
              chunkIndex: chunkIndex + 1,
            });

            const htmlPerImage = await generatePDFHTML(competition, tableData, gymnasts, {
              rowsForIndividualPages: chunkRows,
              includeIndividualPages: true,
              includeSummary: false,
              debugLabel: `chunk-${chunkIndex + 1}-perImage`,
              whiteboardMode: 'perImage',
            });

            try {
              uri = await printHtmlToPdf(htmlPerImage, `${baseLabel} (perImage)`);
            } catch {
              console.warn('[PDF][Chunk] perImage retry failed; retrying pathsOnly', {
                chunkIndex: chunkIndex + 1,
              });
              const htmlNoImages = await generatePDFHTML(competition, tableData, gymnasts, {
                rowsForIndividualPages: chunkRows,
                includeIndividualPages: true,
                includeSummary: false,
                debugLabel: `chunk-${chunkIndex + 1}-pathsOnly`,
                whiteboardMode: 'pathsOnly',
              });
              uri = await printHtmlToPdf(htmlNoImages, `${baseLabel} (pathsOnly)`);
            }
          } else {
            throw err;
          }
        }

        // Sometimes ExpoPrint returns a tiny PDF instead of throwing.
        const size = uri ? await getFileSizeBytes(uri) : 0;
        if (Platform.OS === 'android' && uri && size > 0 && size < PDF_MIN_VALID_BYTES) {
          console.warn('[PDF][Chunk] Tiny PDF detected; retrying with per-image embedding', {
            chunkIndex: chunkIndex + 1,
            size,
          });
          await safeDeleteUris([uri], 'tiny chunk PDF');

          const htmlPerImage = await generatePDFHTML(competition, tableData, gymnasts, {
            rowsForIndividualPages: chunkRows,
            includeIndividualPages: true,
            includeSummary: false,
            debugLabel: `chunk-${chunkIndex + 1}-perImage`,
            whiteboardMode: 'perImage',
          });
          uri = await printHtmlToPdf(htmlPerImage, `${baseLabel} (perImage)`);

          const size2 = uri ? await getFileSizeBytes(uri) : 0;
          if (uri && size2 > 0 && size2 < PDF_MIN_VALID_BYTES) {
            console.warn('[PDF][Chunk] perImage still produced tiny PDF; retrying pathsOnly', {
              chunkIndex: chunkIndex + 1,
              size: size2,
            });
            await safeDeleteUris([uri], 'tiny chunk PDF (perImage)');

            const htmlNoImages = await generatePDFHTML(competition, tableData, gymnasts, {
              rowsForIndividualPages: chunkRows,
              includeIndividualPages: true,
              includeSummary: false,
              debugLabel: `chunk-${chunkIndex + 1}-pathsOnly`,
              whiteboardMode: 'pathsOnly',
            });
            uri = await printHtmlToPdf(htmlNoImages, `${baseLabel} (pathsOnly)`);
          }
        }

        if (!uri) throw new Error(`[PDF][Chunk] Failed to generate chunk ${chunkIndex + 1}`);
        chunkUris.push(uri);
      }

      console.log('[PDF][Chunk] Generating summary PDF');
      const summaryHtml = await generatePDFHTML(competition, tableData, gymnasts, {
        includeIndividualPages: false,
        includeSummary: true,
        debugLabel: 'summary',
      });
      summaryUri = await printHtmlToPdf(summaryHtml, '[PDF][Chunk] Summary');

      const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      const outputUri = `${baseDir}Competition_${competitionId}_${timestamp}_merged.pdf`;
      const mergedUri = await mergePdfUrisToSinglePdf([...chunkUris, summaryUri], outputUri);

      await safeDeleteUris(chunkUris, 'chunk PDF');
      await safeDeleteUris([summaryUri], 'summary PDF');

      console.log('[PDF][Chunk] Chunked generation complete:', mergedUri);
      return mergedUri;
    } catch (error) {
      console.error('[PDF][Chunk] Attempt failed:', error);
      await safeDeleteUris(chunkUris, 'chunk PDF');
      if (summaryUri) await safeDeleteUris([summaryUri], 'summary PDF');

      if (isPdfOutOfMemoryError(error) && chunkSize > minChunkSize) {
        const nextChunkSize = Math.max(minChunkSize, Math.floor(chunkSize / 2));
        console.warn('[PDF][Chunk] OOM detected. Retrying with smaller chunkSize:', nextChunkSize);
        chunkSize = nextChunkSize;
        continue;
      }

      throw error;
    }
  }

  throw new Error('[PDF][Chunk] Could not generate PDF after multiple attempts');
}

/**
 * Genera un PDF con la tabla de resultados de la competencia
 */
export async function generateCompetitionPDF(
  competitionId: number,
  tableData: TableRow[]
): Promise<string> {
  try {
    console.log('[PDF] Starting PDF generation for competition:', competitionId);
    logPdfImageOptimizerStatus('generateCompetitionPDF');

    // Obtener información de la competencia
    const competition = await getCompetitionById(competitionId);
    if (!competition) {
      throw new Error('Competition not found');
    }

    // Obtener gimnastas con datos completos de la base de datos
    const gymnasts = await getGymnastsByCompetition(competitionId);

    // Use chunking on Android by default to avoid OOM.
    if (Platform.OS === 'android') {
      return await generateCompetitionPDFChunked(competition, competitionId, tableData, gymnasts);
    }

    // iOS: try normal generation first, fallback to chunking if needed.
    try {
      const html = await generatePDFHTML(competition, tableData, gymnasts);
      console.log('[PDF] Generando PDF...');
      const uri = await printHtmlToPdf(html, '[PDF] Full document');
      return uri;
    } catch (error) {
      if (isPdfOutOfMemoryError(error)) {
        console.warn('[PDF] OOM in full generation. Falling back to chunking...');
        return await generateCompetitionPDFChunked(competition, competitionId, tableData, gymnasts);
      }
      throw error;
    }
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error);
    throw error;
  }
}

/**
 * Carga la imagen del salto y la convierte a base64 para usar en el PDF
 */
async function getJumpImageBase64(): Promise<string> {
  // Fallback vacío: NO renderizar placeholder si no hay imagen
  const JUMP_IMAGE_FALLBACK = '';

  const candidateRequires = [
    () => require('../assets/images/Jump1.png'),
    () => require('../assets/images/Jump2.webp'),
    () => require('../assets/images/Jump3.jpg'),
    () => require('../assets/images/Jump4.jpeg'),
  ];

  const guessMime = (u: string) => {
    const lower = String(u || '').toLowerCase();
    if (/\.jpe?g$/i.test(lower)) return 'image/jpeg';
    if (/\.webp$/i.test(lower)) return 'image/webp';
    return 'image/png';
  };

  const arrayBufferToBase64 = (buf: ArrayBuffer): string => {
    const anyBuf: any = (globalThis as any).Buffer;
    if (anyBuf?.from) {
      return anyBuf.from(buf).toString('base64');
    }
    const anyGlobal: any = globalThis as any;
    if (typeof anyGlobal?.btoa === 'function') {
      const bytes = new Uint8Array(buf);
      let binary = '';
      // chunk to avoid call stack limits
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        const slice = bytes.subarray(i, i + CHUNK);
        binary += String.fromCharCode(...slice);
      }
      return anyGlobal.btoa(binary);
    }
    throw new Error('[PDF] Could not convert jump image to base64 (no Buffer/btoa available)');
  };

  try {
    let asset: any = null;
    for (const fn of candidateRequires) {
      try {
        asset = Asset.fromModule(fn());
        break;
      } catch {
        asset = null;
      }
    }

    if (!asset) return JUMP_IMAGE_FALLBACK;

    try {
      await asset.downloadAsync();
    } catch {
      // ignore
    }

    const primaryUri = asset.localUri || asset.uri;
    if (!primaryUri) return JUMP_IMAGE_FALLBACK;

    const mime = guessMime(primaryUri);

    // 1) Prefer fetch -> arrayBuffer -> base64 (works for http(s) URIs)
    try {
      const res = await fetch(primaryUri);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        if (b64 && b64.length > 100) {
          return `data:${mime};base64,${b64}`;
        }
      }
    } catch (e) {
      console.warn('[PDF][JumpImage] fetch failed', e);
    }

    // 2) Try FileSystem read for file:// URIs
    try {
      const base64 = await FileSystem.readAsStringAsync(primaryUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (base64 && base64.length > 100) {
        return `data:${mime};base64,${base64}`;
      }
    } catch (e) {
      console.warn('[PDF][JumpImage] FileSystem read failed', e);
    }

    // 3) Last resort: allow http(s) uri directly (SVG <image href="..."></image> may resolve it)
    if (/^https?:/i.test(primaryUri)) {
      return primaryUri;
    }

    return JUMP_IMAGE_FALLBACK;
  } catch (error) {
    console.warn('[PDF] Error loading jump image:', error);
    return JUMP_IMAGE_FALLBACK;
  }
}

const PDF_IMAGE_OPT_MAX_WIDTH = 512;
const PDF_IMAGE_OPT_COMPRESS = 0.72;
const PDF_IMAGE_OPT_MIN_BYTES = 350_000;
const PDF_IMAGE_EMBED_MAX_BYTES = 550_000;
const pdfOptimizedImageCache = new Map<string, string>();

function inferImageMimeFromUri(uri: string): 'png' | 'jpeg' {
  const u = String(uri ?? '').toLowerCase();
  if (u.includes('.jpg') || u.includes('.jpeg')) return 'jpeg';
  return 'png';
}

async function getOriginalImageDataUriNoLimit(originalUri: string): Promise<string> {
  if (!originalUri) return '';
  const cached = pdfOptimizedImageCache.get(`orig:${originalUri}`);
  if (cached) return cached;
  try {
    const base64 = await FileSystem.readAsStringAsync(originalUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const mime = inferImageMimeFromUri(originalUri);
    const dataUri = `data:image/${mime};base64,${base64}`;
    pdfOptimizedImageCache.set(`orig:${originalUri}`, dataUri);
    return dataUri;
  } catch (e) {
    console.warn('[PDF][IMG] Failed to read original image', { originalUri, e });
    return '';
  }
}

type ExpoImageManipulatorModule = typeof import('expo-image-manipulator');
let cachedImageManipulatorModule: ExpoImageManipulatorModule | null | undefined;

function getExpoImageManipulatorModule(): ExpoImageManipulatorModule | null {
  if (cachedImageManipulatorModule !== undefined) return cachedImageManipulatorModule;
  try {
    // Lazy-load to avoid crashing when the native module isn't available (Expo Go / old dev client).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedImageManipulatorModule = require('expo-image-manipulator') as ExpoImageManipulatorModule;
  } catch (e) {
    cachedImageManipulatorModule = null;
    console.warn('[PDF][IMG] expo-image-manipulator not available; skipping optimization', e);
  }
  return cachedImageManipulatorModule;
}

function logPdfImageOptimizerStatus(label: string) {
  const available = Platform.OS !== 'ios' && !!getExpoImageManipulatorModule();
  console.log(`[PDF][IMG] Optimizer ${available ? 'ENABLED' : 'DISABLED'} (${label})`);
}

function isPdfImageOptimizerEnabled(): boolean {
  // Per user requirement: iOS must not use the image optimizer.
  return Platform.OS !== 'ios' && !!getExpoImageManipulatorModule();
}

async function getOptimizedImageDataUri(originalUri: string): Promise<string> {
  if (!originalUri) return '';
  const cached = pdfOptimizedImageCache.get(originalUri);
  if (cached) return cached;

  // iOS: do not run any image optimization logic; embed original image.
  if (Platform.OS === 'ios') {
    const dataUri = await getOriginalImageDataUriNoLimit(originalUri);
    pdfOptimizedImageCache.set(originalUri, dataUri);
    return dataUri;
  }

  try {
    const info = await FileSystem.getInfoAsync(originalUri);
    const originalSize = info.exists && typeof (info as any).size === 'number' ? (info as any).size : 0;

    // Non-iOS: if optimizer not enabled, embed only if reasonably small.
    if (!isPdfImageOptimizerEnabled()) {
      if (originalSize > 0 && originalSize > PDF_IMAGE_EMBED_MAX_BYTES) {
        console.warn('[PDF][IMG] Skipping embed (optimizer unavailable + too large)', { originalSize, originalUri });
        return '';
      }
      const base64 = await FileSystem.readAsStringAsync(originalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mime = inferImageMimeFromUri(originalUri);
      const dataUri = `data:image/${mime};base64,${base64}`;
      pdfOptimizedImageCache.set(originalUri, dataUri);
      console.log('[PDF][IMG] Embedded original (optimizer unavailable)', { originalSize, originalUri });
      return dataUri;
    }

    const ImageManipulator = getExpoImageManipulatorModule();
    if (!ImageManipulator) {
      if (originalSize > 0 && originalSize > PDF_IMAGE_EMBED_MAX_BYTES) {
        console.warn('[PDF][IMG] Skipping embed (optimizer unavailable + too large)', { originalSize, originalUri });
        return '';
      }
      const base64 = await FileSystem.readAsStringAsync(originalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mime = inferImageMimeFromUri(originalUri);
      const dataUri = `data:image/${mime};base64,${base64}`;
      pdfOptimizedImageCache.set(originalUri, dataUri);
      console.log('[PDF][IMG] Embedded original (optimizer unavailable)', { originalSize, originalUri });
      return dataUri;
    }

    // If already small, skip optimization.
    if (originalSize > 0 && originalSize < PDF_IMAGE_OPT_MIN_BYTES) {
      const base64 = await FileSystem.readAsStringAsync(originalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataUri = `data:image/png;base64,${base64}`;
      pdfOptimizedImageCache.set(originalUri, dataUri);
      console.log('[PDF][IMG] Skip optimization (already small)', { originalSize, originalUri });
      return dataUri;
    }

    // Try 1: moderate resize + compress.
    const attempt1 = await ImageManipulator.manipulateAsync(
      originalUri,
      [{ resize: { width: PDF_IMAGE_OPT_MAX_WIDTH } }],
      {
        compress: PDF_IMAGE_OPT_COMPRESS,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      }
    );

    const info1 = await FileSystem.getInfoAsync(attempt1.uri);
    const size1 = info1.exists && typeof (info1 as any).size === 'number' ? (info1 as any).size : 0;

    // If still large, try 2: smaller width + stronger compression.
    let finalUri = attempt1.uri;
    let finalSize = size1;
    if (size1 > PDF_IMAGE_EMBED_MAX_BYTES) {
      const attempt2 = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 320 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false,
        }
      );
      const info2 = await FileSystem.getInfoAsync(attempt2.uri);
      const size2 = info2.exists && typeof (info2 as any).size === 'number' ? (info2 as any).size : 0;
      if (size2 > 0 && size2 <= size1) {
        finalUri = attempt2.uri;
        finalSize = size2;
      }
    }

    console.log('[PDF][IMG] Optimized image', {
      originalSize,
      optimizedSize: finalSize,
      originalUri,
      optimizedUri: finalUri,
    });

    if (finalSize > 0 && finalSize > PDF_IMAGE_EMBED_MAX_BYTES) {
      console.warn('[PDF][IMG] Skipping embed (optimized still too large)', {
        originalSize,
        optimizedSize: finalSize,
        originalUri,
      });
      return '';
    }

    const base64 = await FileSystem.readAsStringAsync(finalUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const dataUri = `data:image/jpeg;base64,${base64}`;
    pdfOptimizedImageCache.set(originalUri, dataUri);
    return dataUri;
  } catch (error) {
    console.warn('[PDF][IMG] Optimization failed, falling back to original', { originalUri, error });
    try {
      const info = await FileSystem.getInfoAsync(originalUri);
      const originalSize = info.exists && typeof (info as any).size === 'number' ? (info as any).size : 0;
      if (originalSize > 0 && originalSize > PDF_IMAGE_EMBED_MAX_BYTES) {
        console.warn('[PDF][IMG] Skipping embed (fallback original too large)', { originalSize, originalUri });
        return '';
      }
      const base64 = await FileSystem.readAsStringAsync(originalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mime = inferImageMimeFromUri(originalUri);
      const dataUri = `data:image/${mime};base64,${base64}`;
      pdfOptimizedImageCache.set(originalUri, dataUri);
      return dataUri;
    } catch (e) {
      console.warn('[PDF][IMG] Fallback read failed', { originalUri, e });
      return '';
    }
  }
}

/**
 * Renderiza las imágenes del gimnasta en SVG para el PDF
 */
async function renderGymnastImages(images: GymnastImage[], scaleX: number, scaleY: number, offsetX: number): Promise<string> {
  if (!images || images.length === 0) return '';
  
  try {
    const imageElements = await Promise.all(
      images.map(async (img) => {
        try {
          // Optimize image before embedding to reduce PDF memory/size.
          const imageData = await getOptimizedImageDataUri(img.image_uri);
          
          // Escalar posición y tamaño con multiplicador de 1.5x
          const x = img.position_x * scaleX + offsetX;
          const y = img.position_y * scaleY;
          const width = 100 * img.scale * scaleX * 1.5; // Tamaño base de 100 con multiplicador 1.5x
          const height = 100 * img.scale * scaleY * 1.5;

          if (!imageData) {
            console.warn('[PDF][IMG] Empty imageData after optimization', { uri: img.image_uri, gymnastImageId: img.id });
            return '';
          }
          
          return `
            <image 
              x="${x}" 
              y="${y}" 
              width="${width}" 
              height="${height}" 
              href="${imageData}" 
              transform="rotate(${img.rotation}, ${x + width/2}, ${y + height/2})" 
              preserveAspectRatio="xMidYMid meet" 
            />
          `;
        } catch (error) {
          console.warn('[PDF] Error al cargar imagen:', img.image_uri, error);
          return '';
        }
      })
    );
    
    return imageElements.filter(el => el).join('\n');
  } catch (error) {
    console.warn('[PDF] Error al renderizar imágenes:', error);
    return '';
  }
}

type ParsedWhiteboardPath = {
  path: string;
  color?: string;
  strokeWidth?: number;
  penType?: number;
  isEraser?: boolean;
};

const PDF_WHITEBOARD_W = 650;
const PDF_WHITEBOARD_H = 390;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function normalizePhotoBaseSize(w: number, h: number): { w: number; h: number } {
  // Match WhiteboardScreen.tsx (SkiaPhoto) sizing semantics so DB `scale` behaves the same in PDF.
  let bw = Math.max(1, safeNum(w, 120));
  let bh = Math.max(1, safeNum(h, 120));

  const MAX_W = 400;
  const MAX_H = 400;
  if (bw > MAX_W) {
    const f = MAX_W / bw;
    bw = MAX_W;
    bh *= f;
  }
  if (bh > MAX_H) {
    const f = MAX_H / bh;
    bh = MAX_H;
    bw *= f;
  }

  const MIN_W = 90;
  if (bw < MIN_W) {
    const f = MIN_W / bw;
    bw = MIN_W;
    bh *= f;
  }

  return { w: bw, h: bh };
}

const safeNum = (v: any, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function containTransform(srcW: number, srcH: number, dstW: number, dstH: number) {
  const safeSrcW = Math.max(1, srcW);
  const safeSrcH = Math.max(1, srcH);
  const scale = Math.min(dstW / safeSrcW, dstH / safeSrcH);
  const tx = (dstW - safeSrcW * scale) / 2;
  const ty = (dstH - safeSrcH * scale) / 2;
  return { scale, tx, ty };
}

function base64ToBytes(base64: string): Uint8Array {
  const b64 = base64.replace(/^data:[^;]+;base64,/, '');
  const anyGlobal: any = globalThis as any;
  if (typeof anyGlobal?.atob === 'function') {
    const binary = anyGlobal.atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i) & 0xff;
    return out;
  }
  const anyBuf: any = (globalThis as any).Buffer;
  if (anyBuf?.from) {
    const buf = anyBuf.from(b64, 'base64');
    return new Uint8Array(buf);
  }
  // Worst-case fallback: return empty
  return new Uint8Array();
}

function readU32BE(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0;
}

function getImageSizeFromBase64(base64: string): { width: number; height: number } | null {
  const bytes = base64ToBytes(base64);
  if (bytes.length < 24) return null;

  // PNG: signature + IHDR
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (isPng) {
    const width = readU32BE(bytes, 16);
    const height = readU32BE(bytes, 20);
    if (width > 0 && height > 0) return { width, height };
    return null;
  }

  // JPEG: scan for SOF markers
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (isJpeg) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = bytes[i + 1];
      // Start of Frame markers: C0..C3, C5..C7, C9..CB, CD..CF
      const isSof =
        marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
        marker === 0xc5 || marker === 0xc6 || marker === 0xc7 ||
        marker === 0xc9 || marker === 0xca || marker === 0xcb ||
        marker === 0xcd || marker === 0xce || marker === 0xcf;

      const len = ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0);
      if (len <= 0) break;

      if (isSof) {
        const height = ((bytes[i + 5] ?? 0) << 8) | (bytes[i + 6] ?? 0);
        const width = ((bytes[i + 7] ?? 0) << 8) | (bytes[i + 8] ?? 0);
        if (width > 0 && height > 0) return { width, height };
        return null;
      }
      i += 2 + len;
    }
  }

  return null;
}

function getImageSizeFromDataOrUriSync(dataOrUri: string): { width: number; height: number } | null {
  if (typeof dataOrUri !== 'string' || dataOrUri.length === 0) return null;
  if (dataOrUri.startsWith('data:')) return getImageSizeFromBase64(dataOrUri);
  return null;
}

async function getImageSizeFromUriAsync(uri: string): Promise<{ width: number; height: number } | null> {
  if (typeof uri !== 'string' || uri.length === 0) return null;
  if (uri.startsWith('data:')) return getImageSizeFromBase64(uri);

  return await new Promise((resolve) => {
    try {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve(null)
      );
    } catch {
      resolve(null);
    }
  });
}

function compactSvgPathNumbers(pathString: string, decimals = 1): string {
  if (typeof pathString !== 'string' || pathString.length === 0) return '';
  const d = Math.max(0, Math.min(4, decimals));
  // Replace numeric tokens with rounded versions to reduce string size.
  return pathString.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (m) => {
    const n = Number(m);
    if (!Number.isFinite(n)) return m;
    // Round and strip trailing zeros.
    const rounded = n.toFixed(d);
    return rounded.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  });
}

function parseWhiteboardPaths(pathsString: string): ParsedWhiteboardPath[] {
  if (!pathsString || pathsString.trim() === '') return [];
  try {
    const parsed = JSON.parse(pathsString);
    if (!Array.isArray(parsed)) return [];
    return (parsed as any[])
      .filter((p) => p && typeof p === 'object')
      .filter((p) => typeof (p as any).path === 'string' && (p as any).path.trim() !== '') as ParsedWhiteboardPath[];
  } catch {
    return [];
  }
}

function getSvgPathBounds(pathString: any): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (typeof pathString !== 'string' || pathString.trim() === '') return null;
  // Rough bounds: take every numeric pair we see.
  const nums = (pathString.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [])
    .map(n => Number(n))
    .filter(n => Number.isFinite(n));
  if (nums.length < 2) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return { minX, minY, maxX, maxY };
}

function renderPathsAsSvg(paths: ParsedWhiteboardPath[]): string {
  if (!paths.length) return '';

  const getEraserStrokeWidth = (w: number) => (w <= 10 ? w * 4 : w);

  return paths
    .map((pd) => {
      const rawPath = typeof pd.path === 'string' ? pd.path : '';
      const path = rawPath ? compactSvgPathNumbers(rawPath, 1) : '';
      if (!path) return '';
      const penType = safeNum(pd.penType, 0);
      const isEraser = !!pd.isEraser;
      let color = (pd.color || '#000000') as string;
      let strokeWidth = safeNum(pd.strokeWidth, 2);

      if (isEraser || color === '#FFFFFF' || color === '#ffffff' || color === 'white') {
        color = '#f9f9f9';
        strokeWidth = getEraserStrokeWidth(strokeWidth);
      }

      if (penType === 2 && !isEraser) {
        // Highlighter: filled + stroked with opacity
        return `
          <g>
            <path d="${path}" fill="${color}" opacity="0.3" />
            <path d="${path}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" />
          </g>
        `;
      }

      const opacity = penType === 1 ? 0.8 : 1;
      return `<path d="${path}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />`;
    })
    .filter(Boolean)
    .join('\n');
}

async function loadGymnastImagesForSvg(
  images: GymnastImage[],
  opts?: { mode?: 'full' | 'perImage' }
): Promise<Array<GymnastImage & { dataUri: string; w: number; h: number }>> {
  if (!images || images.length === 0) return [];

  const mode = opts?.mode ?? 'full';
  const out: Array<GymnastImage & { dataUri: string; w: number; h: number }> = [];

  if (mode === 'perImage') {
    // Sequential processing to reduce peak memory.
    for (const img of images) {
      try {
        const dataOrUri = await getOptimizedImageDataUri(img.image_uri);
        if (!dataOrUri) continue;
        const size = (dataOrUri.startsWith('data:')
          ? getImageSizeFromDataOrUriSync(dataOrUri)
          : await getImageSizeFromUriAsync(dataOrUri));
        const normalized = normalizePhotoBaseSize(size?.width ?? 120, size?.height ?? 120);
        out.push({ ...img, dataUri: dataOrUri, w: normalized.w, h: normalized.h });
      } catch (e) {
        // Skip ONLY this image.
        console.warn('[PDF][WB] Skipping image (perImage)', { uri: img.image_uri, id: img.id, e });
        continue;
      }
    }
    return out;
  }

  // full mode: parallel load for speed; still skips per-image failures.
  const loaded = await Promise.all(
    images.map(async (img) => {
      try {
        const dataOrUri = await getOptimizedImageDataUri(img.image_uri);
        if (!dataOrUri) return null;
        const size = (dataOrUri.startsWith('data:')
          ? getImageSizeFromDataOrUriSync(dataOrUri)
          : await getImageSizeFromUriAsync(dataOrUri));
        const normalized = normalizePhotoBaseSize(size?.width ?? 120, size?.height ?? 120);
        return { ...img, dataUri: dataOrUri, w: normalized.w, h: normalized.h };
      } catch {
        return null;
      }
    })
  );

  return loaded.filter((x): x is GymnastImage & { dataUri: string; w: number; h: number } => !!x);
}

function renderGymnastImagesAsSvg(images: Array<GymnastImage & { dataUri: string; w: number; h: number }>): string {
  if (!images.length) return '';
  return images
    .map((img) => {
      const x = safeNum(img.position_x, 0);
      const y = safeNum(img.position_y, 0);
      const scale = safeNum(img.scale, 1);
      const rotation = safeNum(img.rotation, 0);
      const width = Math.max(1, safeNum(img.w, 100) * scale);
      const height = Math.max(1, safeNum(img.h, 100) * scale);
      const cx = x + width / 2;
      const cy = y + height / 2;
      return `
        <image
          x="${x}"
          y="${y}"
          width="${width}"
          height="${height}"
          href="${img.dataUri}"
          transform="rotate(${rotation}, ${cx}, ${cy})"
          preserveAspectRatio="xMidYMid meet"
        />
      `;
    })
    .join('\n');
}

function inferCanvasSizeFromContent(
  paths: ParsedWhiteboardPath[],
  images: Array<GymnastImage & { w: number; h: number }>
): { width: number; height: number } {
  // Conservative floors from WhiteboardScreen defaults
  let maxX = 390;
  let maxY = 350;

  for (const p of paths) {
    const b = getSvgPathBounds(p.path);
    if (!b) continue;
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  for (const img of images) {
    const x = safeNum(img.position_x, 0);
    const y = safeNum(img.position_y, 0);
    const scale = safeNum(img.scale, 1);
    const w = Math.max(1, safeNum(img.w, 100) * scale);
    const h = Math.max(1, safeNum(img.h, 100) * scale);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  // Avoid absurd sizes
  maxX = clamp(maxX, 1, 5000);
  maxY = clamp(maxY, 1, 5000);
  return { width: maxX, height: maxY };
}

async function buildWhiteboardSvgForPdf(opts: {
  tracesJSON: string;
  gymnastImages: GymnastImage[];
  showJumpBackground?: boolean;
  jumpImageBase64?: string;
  omitImages?: boolean;
  imageMode?: 'full' | 'perImage';
}): Promise<string> {
  const tracesChars = typeof opts.tracesJSON === 'string' ? opts.tracesJSON.length : 0;
  const paths = parseWhiteboardPaths(opts.tracesJSON);
  let loadedImages: Array<GymnastImage & { dataUri: string; w: number; h: number }> = [];
  if (!opts.omitImages) {
    try {
      loadedImages = await loadGymnastImagesForSvg(opts.gymnastImages, { mode: opts.imageMode ?? 'full' });
    } catch (e) {
      console.warn('[PDF][WB] Failed to load whiteboard images; rendering paths only', e);
      loadedImages = [];
    }
  }

  try {
    const totalRawPathChars = paths.reduce((acc, p) => acc + (typeof p.path === 'string' ? p.path.length : 0), 0);
    console.log('[PDF][WB] Whiteboard payload', {
      tracesChars,
      pathsCount: paths.length,
      totalRawPathChars,
      imagesCount: opts.gymnastImages?.length ?? 0,
      loadedImages: loadedImages.length,
    });
  } catch {
    // ignore
  }

  const src = inferCanvasSizeFromContent(paths, loadedImages);
  const { scale, tx, ty } = containTransform(src.width, src.height, PDF_WHITEBOARD_W, PDF_WHITEBOARD_H);

  const bgW = src.width * 0.9;
  const bgH = src.height * 0.9;
  const bgX = (src.width - bgW) / 2;
  const bgY = (src.height - bgH) / 2;

  const jumpLayer = opts.showJumpBackground && opts.jumpImageBase64
    ? `
      <image
        x="${bgX}"
        y="${bgY}"
        width="${bgW}"
        height="${bgH}"
        href="${opts.jumpImageBase64}"
        opacity="0.6"
        preserveAspectRatio="xMidYMid meet"
      />
    `
    : '';

  const imagesLayer = opts.omitImages ? '' : renderGymnastImagesAsSvg(loadedImages);
  const pathsLayer = renderPathsAsSvg(paths);

  const svg = `
    <svg class="whiteboard-canvas" viewBox="0 0 ${PDF_WHITEBOARD_W} ${PDF_WHITEBOARD_H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <rect width="${PDF_WHITEBOARD_W}" height="${PDF_WHITEBOARD_H}" fill="#f9f9f9" />
      <g transform="translate(${tx} ${ty}) scale(${scale})">
        ${jumpLayer}
        ${imagesLayer}
        ${pathsLayer}
      </g>
    </svg>
  `;

  console.log('[PDF][WB] Whiteboard SVG length', svg.length);

  return svg;
}

/**
 * Renderiza los paths del whiteboard en formato SVG
 */
/**
 * Escala un path SVG por un factor dado y lo centra
 */
function scaleSVGPath(pathString: string, scaleX: number, scaleY: number, offsetX: number = 0, offsetY: number = 0): string {
  if (!pathString) return '';
  
  // Expresión regular para encontrar comandos y números en el path
  const pathRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let scaledPath = '';
  let match;
  
  while ((match = pathRegex.exec(pathString)) !== null) {
    const command = match[1];
    const coords = match[2].trim();
    
    if (!coords) {
      scaledPath += command;
      continue;
    }
    
    // Separar los números
    const numbers = coords.split(/[,\s]+/).filter(n => n && !isNaN(parseFloat(n))).map(n => parseFloat(n));
    
    // Escalar según el comando
    const scaledNumbers: number[] = [];
    const isAbsolute = command === command.toUpperCase();
    
    for (let i = 0; i < numbers.length; i += 2) {
      if (i + 1 < numbers.length) {
        // Para comandos absolutos, aplicar offset; para relativos, no
        const x = numbers[i] * scaleX + (isAbsolute ? offsetX : 0);
        const y = numbers[i + 1] * scaleY + (isAbsolute ? offsetY : 0);
        scaledNumbers.push(x);
        scaledNumbers.push(y);
      } else if (command.toUpperCase() === 'H') {
        // Comando horizontal - solo escalar X
        const x = numbers[i] * scaleX + (isAbsolute ? offsetX : 0);
        scaledNumbers.push(x);
      } else if (command.toUpperCase() === 'V') {
        // Comando vertical - solo escalar Y
        const y = numbers[i] * scaleY + (isAbsolute ? offsetY : 0);
        scaledNumbers.push(y);
      } else {
        scaledNumbers.push(numbers[i] * scaleX);
      }
    }
    
    scaledPath += command + scaledNumbers.join(',');
  }
  
  return scaledPath || pathString; // Si falla, devolver original
}

function renderWhiteboardPaths(pathsString: string): string {
  if (!pathsString || pathsString.trim() === '') return '';
  
  try {
    const pathsData = JSON.parse(pathsString);
    if (!Array.isArray(pathsData) || pathsData.length === 0) return '';
    
    // Tamaño original del whiteboard en la app
    const originalWidth = 1300;
    const originalHeight = 780;
    
    // Tamaño del SVG en el PDF
    const pdfWidth = 650;
    const pdfHeight = 390;
    
    // Factor de escala
    const scaleX = pdfWidth / originalWidth;
    const scaleY = pdfHeight / originalHeight;
    
    // Offset para centrar (como en el componente whiteboard)
    // Ajustado: mover a la derecha y el doble hacia abajo
    const baseOffsetX = (pdfWidth - (originalWidth * scaleX)) / 2;
    const offsetX = baseOffsetX + 30; // Mover 30px a la derecha
    const offsetY = 60; // Mover 60px hacia abajo (el doble de 30)
    
    return pathsData.map((pathData: any) => {
      let color = pathData.color || '#000000';
      const strokeWidth = (pathData.strokeWidth || 2) * scaleX; // Escalar grosor también
      const path = pathData.path || '';
      const isEraser = pathData.isEraser || false;
      
      // Si es borrador o el color es blanco/muy claro, usar el MISMO gris del fondo
      if (isEraser || color === '#FFFFFF' || color === '#ffffff' || color === 'white') {
        color = '#f9f9f9'; // Mismo color que el fondo
      }
      
      if (!path) return '';
      
      // Escalar el path con offset de centrado
      const scaledPath = scaleSVGPath(path, scaleX, scaleY, offsetX, offsetY);
      
      return `<path d="${scaledPath}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('\n');
  } catch (error) {
    console.warn('[PDF] Error parsing whiteboard paths:', error);
    return '';
  }
}

/**
 * Genera y comparte el PDF de la competencia
 */
export async function generateAndSharePDF(
  competitionId: number,
  tableData: TableRow[]
): Promise<void> {
  let pdfUri: string | null = null;
  
  try {
    // Generar el PDF
    pdfUri = await generateCompetitionPDF(competitionId, tableData);
    
    console.log('[PDF] Preparando para compartir PDF desde:', pdfUri);
    
    // Verificar que el archivo existe antes de compartir
    const fileInfo = await FileSystem.getInfoAsync(pdfUri);
    if (!fileInfo.exists) {
      throw new Error('The PDF file does not exist');
    }
    
    console.log('[PDF] Verificando disponibilidad de sharing...');
    
    // Verificar si sharing está disponible
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      console.error('[PDF] Sharing no está disponible en este dispositivo');
      throw new Error('Sharing is not available on this device');
    }
    
    console.log('[PDF] Sharing disponible, creando copia en Downloads...');
    
    // Crear una copia del PDF en el directorio de documentos
    const fileName = `Competition_${competitionId}_${Date.now()}.pdf`;
    const newPath = `${FileSystem.documentDirectory}${fileName}`;
    
    // Copiar el archivo
    await FileSystem.copyAsync({
      from: pdfUri,
      to: newPath
    });
    
    console.log('[PDF] PDF copiado a:', newPath);
    
    // Compartir el PDF desde la nueva ubicación
    console.log('[PDF] Abriendo diálogo para compartir...');
    
    await Sharing.shareAsync(newPath, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Competition Report',
      UTI: 'com.adobe.pdf'
    });
    
    console.log('[PDF] PDF compartido exitosamente');
    
    // Limpiar el archivo temporal después de compartir
    try {
      await FileSystem.deleteAsync(pdfUri, { idempotent: true });
      console.log('[PDF] Archivo temporal eliminado');
    } catch (cleanupError) {
      console.warn('[PDF] No se pudo eliminar el archivo temporal:', cleanupError);
    }
    
  } catch (error: any) {
    const errorMsg = error?.message || '';
    console.error('[PDF] Error en generateAndSharePDF:', errorMsg);
    
    // Si el error es por cancelación del usuario, re-lanzarlo
    if (errorMsg.includes('cancel') || errorMsg.includes('dismiss') || errorMsg.includes('User cancelled')) {
      console.log('[PDF] Usuario canceló el share');
      throw error;
    }
    
    // Para otros errores, también re-lanzar para que el caller lo muestre y no crashee.
    throw error;
  }
}

/**
 * Genera una página individual para Floor
 */
async function generateFloorPage(
  row: TableRow,
  gymnast: Gymnast,
  opts?: { whiteboardMode?: 'full' | 'perImage' | 'pathsOnly' }
): Promise<string> {
  const elements = ['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  const selectedElements = elements.filter(code => (row[code.toLowerCase() as keyof TableRow] as number) > 0);

  const eg1 = gymnast?.element_group1 ?? 0;
  const eg2 = gymnast?.element_group2 ?? 0;
  const eg3 = gymnast?.element_group3 ?? 0;
  const eg4 = gymnast?.element_group4 ?? 0;
  const egTotal = gymnast?.element_group_total ?? row.eg ?? 0;
  
  // Obtener traces del whiteboard si existe el gimnasta
  let whiteboardSvg = '';
  
  if (gymnast) {
    try {
      const tracesJSON = await getGymnastTracesAsJSON(gymnast.id);
      const images = await getGymnastImages(gymnast.id);
      whiteboardSvg = await buildWhiteboardSvgForPdf({
        tracesJSON,
        gymnastImages: images,
        showJumpBackground: false,
        omitImages: opts?.whiteboardMode === 'pathsOnly',
        imageMode: opts?.whiteboardMode === 'perImage' ? 'perImage' : 'full',
      });
    } catch (error) {
      console.warn('[PDF] Error getting traces for gymnast:', gymnast.id, error);
    }
  }
  
  return `
    <div class="page individual-page">
      <div class="header">
        <h1>${row.evento} - ${row.gymnasta}</h1>
        <p>${row.noc} | Bib: ${row.bib}</p>
      </div>
      
      <div class="gymnast-info-box">
        <strong>Number:</strong> ${row.numero} | 
        <strong>Gymnast:</strong> ${row.gymnasta || 'N/A'} | 
        <strong>NOC:</strong> ${row.noc || 'N/A'} | 
        <strong>Event:</strong> ${row.evento || 'FX'} | 
        <strong>BIB:</strong> ${row.bib || 'N/A'} | 
        <strong>Execution Performance:</strong> ${row.percentage.toFixed(1)}%
      </div>

      <!-- Whiteboard Section -->
      <div class="whiteboard-section">
        <h3>📝 Judge's Whiteboard</h3>
        ${whiteboardSvg}
      </div>

      <div class="tables-section">
        <!-- Difficulty Values Table -->
        <div>
          <div class="section-title">DIFFICULTY VALUES</div>
          <table class="code-table">
            <tbody>
              ${['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'].map(code => {
                const value = row[code.toLowerCase() as keyof TableRow] as number;
                return `
                  <tr class="element-row">
                    <td class="code-cell ${value > 0 ? 'selected' : ''}">${code}</td>
                    ${[1, 2, 3, 4, 5, 6, 7, 8].map(num => 
                      `<td class="number-cell ${value === num ? 'selected' : ''}">${num}</td>`
                    ).join('')}
                    <td class="sel-cell ${value > 0 ? 'selected' : ''}">${value}</td>
                    <td class="selected-value ${value > 0 ? 'has-selection' : ''}">${code}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Scores Info Table -->
        <div>
          <table class="info-table">
            <tr>
              <td class="info-label">NUMBER OF ELEMENTS</td>
              <td class="info-value ${gymnast.number_of_element >= 6 && gymnast.number_of_element <= 8 ? 'green' : 'red'}">${gymnast.number_of_element.toFixed(0)}</td>
            </tr>
            <tr>
              <td class="info-label">DIFFICULTY VALUES</td>
              <td class="info-value">${row.dv.toFixed(1)}</td>
            </tr>
            <tr>
              <td class="info-label">ELEMENT GROUPS</td>
              <td class="score-groups-cell">
                <div class="score-mini-grid">
                  <div><span class="score-label">I:</span> ${Number(eg1).toFixed(1)}</div>
                  <div><span class="score-label">II:</span> ${Number(eg2).toFixed(1)}</div>
                  <div><span class="score-label">III:</span> ${Number(eg3).toFixed(1)}</div>
                  <div><span class="score-label">IV:</span> ${Number(eg4).toFixed(1)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td class="info-label">ELEMENT GROUPS TOTAL</td>
              <td class="info-value">${Number(egTotal).toFixed(1)}</td>
            </tr>
            <tr>
              <td class="info-label">SCORES</td>
              <td class="score-groups-cell">
                <div class="score-mini-grid">
                  <div><span class="score-label">CV:</span> ${row.cv.toFixed(1)}</div>
                  <div><span class="score-label">SB:</span> ${row.sb.toFixed(1)}</div>
                  <div><span class="score-label">ND:</span> ${row.nd.toFixed(1)}</div>
                  <div><span class="score-label">SV:</span> ${row.sv.toFixed(1)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td class="info-label">EXECUTION</td>
              <td class="info-value">${gymnast.execution.toFixed(1)}</td>
            </tr>
            <tr>
                  <td class="info-label">E SCORE</td>
                  <td class="info-value">${(gymnast.escore || 0).toFixed(3)}</td>
                </tr>
            <tr>
              <td class="info-label">MY SCORE</td>
              <td class="info-value orange">${(gymnast.myscore || 0).toFixed(3)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Competition Section -->
      <div class="competition-section">
        <div class="comp-row">
          <div class="comp-label">COMPETITION</div>
          <div class="comp-cell">D</div>
          <div class="comp-value">${row.dScore.toFixed(1)}</div>
          <div class="comp-cell">E</div>
          <div class="comp-value">${row.eScore.toFixed(1)}</div>
          <div class="comp-cell">SB</div>
          <div class="comp-value">${row.sb.toFixed(1)}</div>
          <div class="comp-cell">ND</div>
          <div class="comp-value">${row.nd.toFixed(1)}</div>
          <div class="comp-cell">SCORE</div>
          <div class="comp-value">${(row.eScore + row.dScore).toFixed(3)}</div>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="comments-section">
        <h3>💬 Judge's Comments</h3>
        <div class="comments-text">${row.comments || 'No comments for this routine.'}</div>
      </div>
    </div>
  `;
}

/**
 * Genera una página individual para Vault
 */
async function generateVaultPage(
  row: TableRow,
  gymnast: Gymnast | undefined,
  opts?: { whiteboardMode?: 'full' | 'perImage' | 'pathsOnly' }
): Promise<string> {
  // Obtener traces del whiteboard si existe el gimnasta
  let whiteboardSvg = '';
  
  if (gymnast) {
    try {
      const tracesJSON = await getGymnastTracesAsJSON(gymnast.id);
      const images = await getGymnastImages(gymnast.id);
      // Cargar imagen del salto como base64
      const jumpImageBase64 = await getJumpImageBase64();
      whiteboardSvg = await buildWhiteboardSvgForPdf({
        tracesJSON,
        gymnastImages: images,
        showJumpBackground: true,
        jumpImageBase64,
        omitImages: opts?.whiteboardMode === 'pathsOnly',
        imageMode: opts?.whiteboardMode === 'perImage' ? 'perImage' : 'full',
      });
    } catch (error) {
      console.warn('[PDF] Error getting traces for gymnast:', gymnast.id, error);
    }
  }
  
  return `
    <div class="page individual-page">
      <div class="header">
        <h1>Vault - ${row.gymnasta}</h1>
        <p>${row.noc} | Bib: ${row.bib}</p>
      </div>
      
      <div class="gymnast-info-box">
        <strong>Number:</strong> ${row.numero} | 
        <strong>Gymnast:</strong> ${row.gymnasta || 'N/A'} | 
        <strong>NOC:</strong> ${row.noc || 'N/A'} | 
        <strong>Event:</strong> ${row.evento || 'VT'} | 
        <strong>BIB:</strong> ${row.bib || 'N/A'} |
        <strong>Execution Performance:</strong> ${row.percentage.toFixed(1)}%
      </div>

      <!-- Whiteboard Section with Jump Background -->
      <div class="whiteboard-section">
        <h3>📝 Judge's Whiteboard</h3>
        ${whiteboardSvg}
      </div>

      <div class="tables-section">
        <!-- Vault Information -->
        <div>
          <div class="section-title">ANNOUNCED VAULT</div>
          <table class="vault-table">
            <tbody>
              <tr class="vault-info-row">
                <td class="vault-label">VAULT NUMBER</td>
                <td class="vault-value">${gymnast?.vault || 'N/A'}</td>
              </tr>
              <tr class="vault-info-row">
                <td class="vault-label">START VALUE</td>
                <td class="vault-value">${gymnast?.vault_value?.toFixed(1) || row.sv.toFixed(1)}</td>
              </tr>
              <tr class="vault-info-row">
                <td class="vault-label">DESCRIPTION</td>
                <td class="vault-value">${gymnast?.vault_description || 'No description'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Scoring Information -->
        <div>
          <table class="info-table">
            <tr>
              <td class="info-label">SCORES</td>
              <td class="score-groups-cell">
                <div class="score-mini-grid">
                  <div><span class="score-label">SV:</span> ${row.sv.toFixed(1)}</div>
                  <div><span class="score-label">ND:</span> ${row.nd.toFixed(1)}</div>
                  <div><span class="score-label">SB:</span> ${row.sb.toFixed(1)}</div>
                  <div><span class="score-label">EXEC:</span> ${row.eScore.toFixed(1)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td class="info-label">E SCORE</td>
              <td class="info-value">${row.eScore.toFixed(1)}</td>
            </tr>
            <tr>
              <td class="info-label">MY SCORE</td>
              <td class="info-value orange">${(row.eScore + row.dScore).toFixed(3)}</td>
            </tr>
            <tr>
              <td class="info-label">EXECUTION PERFORMANCE</td>
              <td class="info-value">${row.percentage.toFixed(1)}%</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Competition Section -->
      <div class="competition-section">
        <div class="comp-row">
          <div class="comp-label">COMPETITION</div>
          <div class="comp-cell">D</div>
          <div class="comp-value">${row.dScore.toFixed(1)}</div>
          <div class="comp-cell">E</div>
          <div class="comp-value">${row.eScore.toFixed(1)}</div>
          <div class="comp-cell">SB</div>
          <div class="comp-value">${row.sb.toFixed(1)}</div>
          <div class="comp-cell">ND</div>
          <div class="comp-value">${row.nd.toFixed(1)}</div>
          <div class="comp-cell">SCORE</div>
          <div class="comp-value">${(row.eScore + row.dScore).toFixed(3)}</div>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="comments-section">
        <h3>💬 Judge's Comments</h3>
        <div class="comments-text">${row.comments || 'No comments for this vault.'}</div>
      </div>
    </div>
  `;
}

/**
 * Genera el HTML para el PDF
 */
type GeneratePdfHtmlOptions = {
  rowsForIndividualPages?: TableRow[];
  includeIndividualPages?: boolean;
  includeSummary?: boolean;
  debugLabel?: string;
  whiteboardMode?: 'full' | 'perImage' | 'pathsOnly';
};

async function generatePDFHTML(
  competition: Competition,
  tableData: TableRow[],
  gymnasts: Gymnast[],
  options?: GeneratePdfHtmlOptions
): Promise<string> {
  const formattedDate = new Date(competition.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const includeIndividualPages = options?.includeIndividualPages ?? true;
  const includeSummary = options?.includeSummary ?? true;
  const whiteboardMode = options?.whiteboardMode ?? 'full';
  const rowsForIndividualPages = (options?.rowsForIndividualPages ?? tableData).filter(
    row => row.gymnasta && row.gymnasta.trim() !== ''
  );

  if (options?.debugLabel) {
    console.log('[PDF][HTML] Building HTML', {
      label: options.debugLabel,
      includeIndividualPages,
      includeSummary,
      rowsForIndividualPages: rowsForIndividualPages.length,
      totalRows: tableData.length,
    });
  }

  // Calcular estadísticas (usar solo participantes reales: con E Score > 0)
  const realParticipants = tableData.filter(p => p.eScore > 0);
  const totalParticipants = realParticipants.length;
  const avgPercentage = totalParticipants > 0
    ? (realParticipants.reduce((sum, p) => sum + p.percentage, 0) / totalParticipants)
    : 0;
  const maxPercentage = totalParticipants > 0
    ? Math.max(...realParticipants.map(p => p.percentage))
    : 0;
  const minPercentage = totalParticipants > 0
    ? Math.min(...realParticipants.map(p => p.percentage))
    : 0;

  // Generar páginas individuales para los gimnastas (incluyendo VT)
  const individualPages = includeIndividualPages
    ? (await Promise.all(
        rowsForIndividualPages.map(async (row) => {
          const gymnast = gymnasts.find(g => g.id === row.id);
          const isVault = row.evento === 'VT';
          return isVault
            ? await generateVaultPage(row, gymnast!, { whiteboardMode })
            : await generateFloorPage(row, gymnast!, { whiteboardMode });
        })
      )).join('\n')
    : '';

  const summaryHtml = includeSummary
    ? `
      <div class="page">
        <div class="header">
          <h1>SUMMARY</h1>
          <h2>${competition.name}</h2>
          <p>${formattedDate} | ${competition.gender ? 'MAG' : 'WAG'}</p>
        </div>

        <div class="participants-note">Participants: ${totalParticipants}</div>
        
        <!-- Results Table -->
        <div class="table-container">
          <table class="summary-table">
            <thead>
              <tr>
                <th class="col-no">No.</th>
                <th class="col-gymnast">Gymnast</th>
                <th class="col-event">Event</th>
                <th class="col-noc">NOC</th>
                <th class="col-bib">BIB</th>
                <th>J</th>
                <th>I</th>
                <th>H</th>
                <th>G</th>
                <th>F</th>
                <th>E</th>
                <th>D</th>
                <th>C</th>
                <th>B</th>
                <th>A</th>
                <th class="col-dv">DV</th>
                <th>EG</th>
                <th>SB</th>
                <th>ND</th>
                <th>CV</th>
                <th>SV</th>
                <th>E</th>
                <th class="col-dv">D</th>
                <th>E Δ</th>
                <th>Δ</th>
                <th class="col-perc">%</th>
              </tr>
            </thead>
            <tbody>
              ${tableData.map(row => {
                // SV validation (same idea as Main Table): highlight SV if it doesn't match D Score
                // Compare using the displayed precision (1 decimal) to avoid false mismatches.
                const svShown = Number(row.sv.toFixed(1));
                const dShown = Number(row.dScore.toFixed(1));
                const svClass = Math.abs(svShown - dShown) < 0.0001 ? 'text-green' : 'text-red';
                
                // Validation for Delta (absolute value)
                let deltaClass = '';
                const absDelta = Math.abs(row.delta);
                if (absDelta <= 0.5) deltaClass = 'text-green';
                else if (absDelta <= 1.0) deltaClass = 'text-yellow';
                else deltaClass = 'text-red';
                
                // Validation for Percentage
                let percentageTextClass = '';
                if (row.percentage >= 90) percentageTextClass = 'text-green';
                else if (row.percentage >= 70) percentageTextClass = 'text-yellow';
                else percentageTextClass = 'text-red';
                
                return `
                  <tr>
                    <td class="col-no">${row.numero}</td>
                    <td class="gymnast-name col-gymnast">${row.gymnasta || '-'}</td>
                    <td class="col-event">${row.evento || '-'}</td>
                    <td class="col-noc">${row.noc || '-'}</td>
                    <td class="col-bib">${row.bib || '-'}</td>
                    <td>${row.j}</td>
                    <td>${row.i}</td>
                    <td>${row.h}</td>
                    <td>${row.g}</td>
                    <td>${row.f}</td>
                    <td>${row.e}</td>
                    <td>${row.d}</td>
                    <td>${row.c}</td>
                    <td>${row.b}</td>
                    <td>${row.a}</td>
                    <td class="col-dv">${row.dv.toFixed(1)}</td>
                    <td>${row.eg.toFixed(1)}</td>
                    <td>${row.sb.toFixed(1)}</td>
                    <td>${row.nd.toFixed(1)}</td>
                    <td>${row.cv.toFixed(1)}</td>
                    <td class="${svClass}">${row.sv.toFixed(1)}</td>
                    <td>${row.eScore.toFixed(1)}</td>
                    <td class="col-dv">${row.dScore.toFixed(1)}</td>
                    <td>${row.eDelta.toFixed(2)}</td>
                    <td class="${deltaClass}">${row.delta.toFixed(1)}</td>
                    <td class="${percentageTextClass} col-perc">${row.percentage.toFixed(1)}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Statistics -->
        <div class="statistics">
          <h3>📊 Competition Statistics</h3>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-number">${maxPercentage.toFixed(2)}%</div>
              <div class="stat-label">Highest</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${avgPercentage.toFixed(2)}%</div>
              <div class="stat-label">Average</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${minPercentage.toFixed(2)}%</div>
              <div class="stat-label">Lowest</div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p><strong>Generado por GymJudge</strong> el ${new Date().toLocaleString('es-ES')}</p>
          <p>© ${new Date().getFullYear()} GymJudge. Todos los derechos reservados.</p>
        </div>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 9px;
          line-height: 1.4;
          color: #333;
          background: #f5f5f5;
          padding: 20px;
        }
        
        .page {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          page-break-after: auto;
          break-after: auto;
          margin-bottom: 20px;
        }

        .individual-page {
          background: #f9f9f9;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #0052b4, #004aad);
          color: white;
          padding: 20px;
          border-radius: 8px;
        }

        .individual-header {
          background: linear-gradient(135deg, #28a745, #218838);
        }
        
        .header h1 {
          font-size: 24px;
          margin-bottom: 8px;
          font-weight: bold;
        }
        
        .header h2 {
          font-size: 16px;
          opacity: 0.95;
        }
        
        .header p {
          font-size: 14px;
          opacity: 0.9;
        }

        .gymnast-info-box {
          background: #e8f4ff;
          padding: 6px;
          border-radius: 6px;
          margin-bottom: 5px;
          border-left: 4px solid #0052b4;
          font-size: 10px;
          font-weight: 600;
        }
        
        .competition-info {
          background: #e8f4ff;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          border-left: 4px solid #0052b4;
        }
        
        .competition-info h2 {
          color: #0052b4;
          margin-bottom: 10px;
          font-size: 16px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        
        .info-item {
          background: white;
          padding: 10px;
          border-radius: 4px;
          text-align: center;
          border: 1px solid #ddd;
        }
        
        .info-label {
          font-size: 8px;
          color: #666;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        
        .info-value {
          font-size: 12px;
          font-weight: bold;
          color: #0052b4;
        }

        .tables-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .section-title {
          background: #0052b4;
          color: white;
          text-align: center;
          padding: 8px;
          font-weight: bold;
          font-size: 11px;
          border-radius: 4px 4px 0 0;
        }

        .code-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 0 0 4px 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 8px;
        }

        .code-table td {
          border: 1px solid #ddd;
          padding: 4px;
          text-align: center;
          font-weight: bold;
        }

        .element-row {
          background: #a9def9;
        }

        .code-cell {
          background: #a9def9;
          color: #333;
          width: 30px;
        }

        .code-cell.selected {
          background: #28a745 !important;
          color: white !important;
        }

        .number-cell {
          background: #a9def9;
          color: #333;
          width: 25px;
        }

        .number-cell.selected {
          background: #28a745 !important;
          color: white !important;
        }

        .sel-cell {
          background: #a9def9;
          color: #333;
          width: 30px;
        }

        .sel-cell.selected {
          background: #28a745 !important;
          color: white !important;
        }

        .selected-value {
          background: #6B9BDF;
          color: white;
          width: 30px;
        }

        .selected-value.has-selection {
          background: #28a745 !important;
          color: white !important;
        }

        .vault-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 9px;
        }

        .vault-table td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: center;
          font-weight: bold;
        }

        .vault-info-row {
          background: #a9def9;
        }

        .vault-label {
          background: #a9def9;
          color: #333;
          text-align: right;
          width: 150px;
        }

        .vault-value {
          background: #6B9BDF;
          color: white;
          font-weight: bold;
        }

        .info-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 8px;
          border: 1px solid #ddd;
        }

        .info-table tr {
          min-height: 25px;
        }

        .info-table .info-label {
          background: #a9def9;
          padding: 6px 8px;
          font-weight: bold;
          text-align: right;
          width: 140px;
          border: 1px solid #ddd;
          font-size: 8px;
          color: #333;
        }

        .info-table .info-value {
          background: #6B9BDF;
          padding: 6px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #ddd;
          font-size: 9px;
          color: white;
        }

        .info-table .info-value.green {
          background: #28a745;
        }

        .info-table .info-value.red {
          background: #dc3545;
        }

        .info-table .info-value.orange {
          background: #ffc107;
          color: #333;
        }

        .score-groups-cell {
          background: #6B9BDF;
          padding: 4px;
          border: 1px solid #ddd;
        }

        .score-mini-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
        }

        .score-mini-grid > div {
          background: white;
          padding: 4px;
          border-radius: 3px;
          text-align: center;
          font-size: 9px;
          font-weight: bold;
        }

        .score-label {
          color: #666;
          font-weight: normal;
          font-size: 8px;
        }

        .competition-section {
          background: white;
          border-radius: 6px;
          margin: 0 auto 15px auto;
          max-width: 600px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .comp-row {
          display: flex;
          min-height: 28px;
        }

        .comp-label {
          background: #28a745;
          color: white;
          text-align: center;
          padding: 6px 8px;
          font-weight: bold;
          width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }

        .comp-cell {
          flex: 1;
          background: #d9d9d9;
          text-align: center;
          padding: 6px;
          font-weight: bold;
          border: 1px solid #999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }

        .comp-value {
          flex: 1;
          background: #28a745;
          color: white;
          text-align: center;
          padding: 6px;
          font-weight: bold;
          border: 1px solid #1e7e34;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }

        .comments-section {
          background: white;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .comments-section h3 {
          color: #0052b4;
          margin-bottom: 8px;
          border-bottom: 2px solid #0052b4;
          padding-bottom: 4px;
          font-size: 11px;
        }

        .comments-text {
          font-size: 9px;
          line-height: 1.4;
          text-align: justify;
          color: #555;
        }
        
        .table-container {
          background: white;
          border-radius: 8px;
          /* IMPORTANT: avoid clipping right-most columns on PDF render */
          overflow: visible;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        /* SUMMARY table needs fixed layout to prevent width growth & clipping */
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .summary-table th,
        .summary-table td {
          overflow-wrap: anywhere;
          word-break: break-word;
          line-height: 1.1;
        }

        /* Column sizing helpers */
        .col-no { width: 34px; }
        .col-gymnast { width: 150px; }
        .col-event { width: 40px; }
        .col-noc { width: 44px; }
        .col-bib { width: 44px; }
        .col-perc { width: 46px; }

        /* Column sizing helpers (keep E/D Score same width as DV) */
        .col-dv {
          width: 36px;
        }
        
        th {
          background: #0052b4;
          color: white;
          padding: 6px 3px;
          text-align: center;
          font-weight: bold;
          font-size: 7px;
          border-right: 1px solid rgba(255,255,255,0.2);
        }
        
        th:last-child {
          border-right: none;
        }
        
        td {
          padding: 5px 3px;
          text-align: center;
          border-bottom: 1px solid #e0e0e0;
          border-right: 1px solid #e0e0e0;
          font-size: 7px;
        }
        
        td:last-child {
          border-right: none;
        }
        
        tbody tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        tbody tr:hover {
          background: #f0f7ff;
        }
        
        .gymnast-name {
          text-align: left !important;
          font-weight: bold;
          padding-left: 10px !important;
          white-space: normal;
        }
        
        .percentage-high {
          background: #d4edda !important;
          color: #155724;
          font-weight: bold;
        }
        
        .percentage-medium {
          background: #fff3cd !important;
          color: #856404;
          font-weight: bold;
        }
        
        .percentage-low {
          background: #f8d7da !important;
          color: #721c24;
          font-weight: bold;
        }
        
        .text-green {
          color: #28a745;
          font-weight: bold;
        }
        
        .text-yellow {
          color: #ffc107;
          font-weight: bold;
        }
        
        .text-red {
          color: #dc3545;
          font-weight: bold;
        }
        
        .statistics {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .statistics h3 {
          color: #0052b4;
          margin-bottom: 15px;
          font-size: 16px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        
        .stat-box {
          text-align: center;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 2px solid #e0e0e0;
        }
        
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #0052b4;
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
        }

        .participants-note {
          font-size: 10px;
          color: #666;
          text-align: left;
          margin: 8px 0 12px 0;
        }

        .comments-summary {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .comments-summary h3 {
          color: #0052b4;
          margin-bottom: 15px;
          font-size: 16px;
          border-bottom: 2px solid #0052b4;
          padding-bottom: 8px;
        }

        .comment-item {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          border-left: 4px solid #0052b4;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 10px;
        }

        .comment-header strong {
          color: #333;
          font-size: 11px;
        }

        .comment-event {
          background: #0052b4;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: bold;
        }

        .comment-body {
          font-size: 10px;
          line-height: 1.5;
          color: #555;
          text-align: justify;
        }

        .no-comments {
          text-align: center;
          color: #999;
          font-style: italic;
          padding: 20px;
          font-size: 11px;
        }
        
        .whiteboard-section {
          background: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .whiteboard-section h3 {
          color: #0052b4;
          margin-bottom: 10px;
          border-bottom: 2px solid #0052b4;
          padding-bottom: 4px;
          font-size: 12px;
        }

        .whiteboard-canvas {
          width: 70%;
          height: auto;
          max-width: 650px;
          margin: 0 auto;
          display: block;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background: #f9f9f9;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 2px solid #e0e0e0;
          font-size: 8px;
          color: #666;
        }
        
        .footer p {
          margin: 3px 0;
        }
        
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            background: white;
            padding: 0;
            margin: 0;
          }
          
          /* Avoid trailing blank pages (important for chunked PDFs).
             Force page breaks BEFORE subsequent pages instead of AFTER each page. */
          .page {
            background: white;
            margin-bottom: 0;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            page-break-after: auto;
            break-after: auto;
          }

          .page + .page {
            page-break-before: always;
            break-before: page;
          }

          
        }
      </style>
    </head>
    <body>
      ${includeIndividualPages ? individualPages : ''}
      ${summaryHtml}
    </body>
    </html>
  `;
}
