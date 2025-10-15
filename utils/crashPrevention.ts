/**
 * Utilidades anti-crash para operaciones asíncronas en Android
 * Previene crashes comunes: timeouts, memory leaks, race conditions
 */

/**
 * Ejecuta una promesa con timeout automático
 * Previene que promesas colgadas maten la app en Android
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  timeoutError: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    ),
  ]);
};

/**
 * Ejecuta Promise.all con timeout y manejo de errores individual
 * Si una promesa falla, devuelve null en lugar de fallar todo
 */
export const safePromiseAll = async <T>(
  promises: Promise<T>[],
  timeoutMs: number = 10000
): Promise<(T | null)[]> => {
  const wrappedPromises = promises.map(async (promise) => {
    try {
      return await withTimeout(promise, timeoutMs);
    } catch (error) {
      console.error('⚠️ Promise failed in safePromiseAll:', error);
      return null;
    }
  });

  return Promise.all(wrappedPromises);
};

/**
 * Retry automático para operaciones que pueden fallar
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        // Delay exponencial: 1s, 2s, 4s
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
};

/**
 * Debounce para prevenir exceso de llamadas
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
};

/**
 * Throttle para limitar frecuencia de ejecución
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limitMs);
    }
  };
};

/**
 * Hook para detectar si el componente está montado
 * Previene setState en componentes desmontados
 */
export const createMountedRef = () => {
  let isMounted = true;

  const cleanup = () => {
    isMounted = false;
  };

  const checkMounted = () => isMounted;

  return { cleanup, checkMounted };
};

/**
 * Safe setState que solo ejecuta si el componente está montado
 */
export const createSafeState = <T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  mountedRef: { checkMounted: () => boolean }
) => {
  return (value: T | ((prev: T) => T)) => {
    if (mountedRef.checkMounted()) {
      setState(value);
    } else {
      console.warn('⚠️ Attempted setState on unmounted component');
    }
  };
};

/**
 * Ejecuta una operación de DB con protección de errores
 */
export const safeDBOperation = async <T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string = 'DB Operation'
): Promise<T> => {
  try {
    const result = await withTimeout(operation(), 5000);
    return result;
  } catch (error) {
    console.error(`❌ ${operationName} failed:`, error);
    return fallbackValue;
  }
};

/**
 * Chunking para procesar arrays grandes sin bloquear UI
 */
export const processInChunks = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  chunkSize: number = 10,
  delayBetweenChunks: number = 50
): Promise<R[]> => {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    // Procesar chunk
    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        try {
          return await processor(item);
        } catch (error) {
          console.error('⚠️ Error processing item:', error);
          return null as any;
        }
      })
    );

    results.push(...chunkResults.filter((r) => r !== null));

    // Delay para no bloquear UI
    if (i + chunkSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
    }
  }

  return results;
};

/**
 * Memoria cache simple con TTL
 */
export class MemoryCache<K, V> {
  private cache: Map<K, { value: V; expiry: number }> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 60000) {
    this.defaultTTL = defaultTTLMs;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: K): V | null {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Logger seguro que no crashea
 */
export const safeLog = {
  info: (...args: any[]) => {
    try {
      console.log(...args);
    } catch (e) {
      // Ignore logging errors
    }
  },
  warn: (...args: any[]) => {
    try {
      console.warn(...args);
    } catch (e) {
      // Ignore logging errors
    }
  },
  error: (...args: any[]) => {
    try {
      console.error(...args);
    } catch (e) {
      // Ignore logging errors
    }
  },
};

/**
 * Validador de datos seguro
 */
export const safeValidate = {
  isArray: (value: any): value is any[] => {
    return Array.isArray(value);
  },
  isObject: (value: any): value is object => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  },
  isString: (value: any): value is string => {
    return typeof value === 'string';
  },
  isNumber: (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  },
  isFunction: (value: any): value is Function => {
    return typeof value === 'function';
  },
};
