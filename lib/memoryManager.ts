import { Platform } from 'react-native';

/**
 * Memory Management Utilities for Android OOM Prevention
 * 
 * This module provides utilities to help prevent OutOfMemoryError crashes
 * on Android devices with limited RAM.
 */

let memoryManagementEnabled = true;
let lastGarbageCollectionTime = 0;
const GC_COOLDOWN_MS = 2000; // Minimum time between explicit GC calls

/**
 * Enable or disable memory management features
 */
export function setMemoryManagementEnabled(enabled: boolean): void {
  memoryManagementEnabled = enabled;
}

/**
 * Request garbage collection hint from the JVM
 * Only available on Android, and only if the runtime supports it
 */
export function requestGarbageCollection(): void {
  if (Platform.OS !== 'android' || !memoryManagementEnabled) {
    return;
  }

  const now = Date.now();
  if (now - lastGarbageCollectionTime < GC_COOLDOWN_MS) {
    // Too soon since last GC, skip to avoid thrashing
    return;
  }

  try {
    const gc = (globalThis as any)?.gc;
    if (typeof gc === 'function') {
      gc();
      lastGarbageCollectionTime = now;
      console.log('[Memory] GC triggered');
    }
  } catch (error) {
    // Ignore errors from GC
    console.warn('[Memory] GC error:', error);
  }
}

/**
 * Attempt to reduce memory pressure by clearing various caches
 * This is a best-effort operation and may not always succeed
 */
export async function reduceMemoryPressure(): Promise<void> {
  if (Platform.OS !== 'android' || !memoryManagementEnabled) {
    return;
  }

  try {
    console.warn('[Memory] Attempting to reduce memory pressure...');
    
    // Request GC
    requestGarbageCollection();
    
    // Small delay to allow OS to process GC
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('[Memory] Memory pressure reduction completed');
  } catch (error) {
    console.warn('[Memory] Error reducing memory pressure:', error);
  }
}

/**
 * Check if the app is likely under memory pressure
 * This is a heuristic and may not be perfectly accurate
 */
export function isLikelyUnderMemoryPressure(): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }

  // Try to estimate memory pressure through available APIs
  try {
    const runtime = (globalThis as any)?.java?.lang?.Runtime?.getRuntime?.();
    if (runtime) {
      const totalMemory = runtime.totalMemory();
      const freeMemory = runtime.freeMemory();
      const maxMemory = runtime.maxMemory();
      
      // If we're using more than 75% of available memory, we're under pressure
      const usedMemory = totalMemory - freeMemory;
      const threshold = maxMemory * 0.75;
      
      return usedMemory > threshold;
    }
  } catch {
    // If we can't access Java runtime, assume we might be under pressure
    return false;
  }

  return false;
}

/**
 * Batch function calls with memory checks
 * This will automatically apply backpressure if memory is running low
 */
export async function executeWithMemoryManagement<T>(
  operation: () => Promise<T>,
  options?: {
    retryOnOOM?: boolean;
    maxRetries?: number;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 0;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check memory before operation
      if (isLikelyUnderMemoryPressure()) {
        console.warn('[Memory] Under pressure before operation, reducing pressure...');
        await reduceMemoryPressure();
      }

      const result = await operation();
      
      // Check memory after operation
      if (isLikelyUnderMemoryPressure()) {
        console.warn('[Memory] Under pressure after operation, reducing pressure...');
        await reduceMemoryPressure();
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      
      const isOOMError = isOutOfMemoryError(error);
      if (isOOMError && options?.retryOnOOM && attempt < maxRetries) {
        console.warn(`[Memory] OOM error, retrying (${attempt + 1}/${maxRetries})...`);
        await reduceMemoryPressure();
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); // Exponential backoff
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Check if an error is an OutOfMemoryError
 */
export function isOutOfMemoryError(error: any): boolean {
  if (!error) return false;

  const errorMessage = String(error?.message || error || '');
  const errorName = String(error?.name || '');
  
  return (
    errorMessage.includes('OutOfMemoryError') ||
    errorMessage.includes('Failed to allocate') ||
    errorMessage.includes('OOM') ||
    errorMessage.includes('Native memory exhausted') ||
    errorName.includes('OutOfMemoryError')
  );
}

/**
 * Create a memory-efficient batch processor
 * Processes items in smaller batches to avoid memory overload
 */
export class BatchProcessor<T, R> {
  private batchSize: number;
  private delayBetweenBatches: number;

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    options?: {
      batchSize?: number;
      delayBetweenBatches?: number;
    }
  ) {
    this.batchSize = options?.batchSize ?? (Platform.OS === 'android' ? 5 : 10);
    this.delayBetweenBatches = options?.delayBetweenBatches ?? 100;
  }

  async processBatch(items: T[]): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      console.log(`[Memory] Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(items.length / this.batchSize)}`);

      try {
        const batchResults = await this.processor(batch);
        results.push(...batchResults);

        // Delay before next batch to allow GC
        if (i + this.batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
          
          // Optional: trigger GC between batches
          if (Platform.OS === 'android') {
            requestGarbageCollection();
          }
        }
      } catch (error) {
        console.error('[Memory] Batch processing error:', error);
        throw error;
      }
    }

    return results;
  }
}

/**
 * Clear all memoization/caching in a component safely
 */
export function safelyCleanupComponent(componentName: string): void {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    console.log(`[Memory] Cleaning up component: ${componentName}`);
    requestGarbageCollection();
  } catch (error) {
    console.warn(`[Memory] Error cleaning up component ${componentName}:`, error);
  }
}

export default {
  requestGarbageCollection,
  reduceMemoryPressure,
  isLikelyUnderMemoryPressure,
  isOutOfMemoryError,
  executeWithMemoryManagement,
  BatchProcessor,
  safelyCleanupComponent,
  setMemoryManagementEnabled,
};
