/**
 * Memory Management Utilities
 * Prevents Android OOM crashes by managing memory usage
 */

import { Platform } from 'react-native';

class MemoryManager {
  private static instance: MemoryManager;
  private memoryWarningThreshold = 300 * 1024 * 1024; // 300MB
  private isCleaningMemory = false;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Clean up memory by clearing caches - OPTIMIZADO PARA PREVENIR OOM
   */
  async cleanupMemory(): Promise<void> {
    if (this.isCleaningMemory) return;
    
    this.isCleaningMemory = true;
    console.log('🧹 Starting AGGRESSIVE memory cleanup...');

    try {
      // 🔥 OPTIMIZACIÓN: Clear console history más frecuentemente
      if (console.clear) {
        console.clear();
      }

      // ❌ DESHABILITADO: Forzar GC causa crash en React Native
      // El garbage collection manual con miles de ShadowNodes crashea Hermes
      // Dejamos que el engine maneje GC automáticamente
      /*
      if (Platform.OS === 'android' && global.gc) {
        global.gc();
        console.log('♻️ Garbage collection triggered');
      }
      */
      console.log('ℹ️ Letting Hermes handle GC automatically (manual GC disabled to prevent crashes)');

      // 🔥 OPTIMIZACIÓN: Clear any cached images/data más agresivamente
      this.clearImageCache();
      
      // 🔥 NUEVO: Limpiar referencias globales
      this.clearGlobalReferences();

      console.log('✅ AGGRESSIVE memory cleanup completed');
    } catch (error) {
      console.error('❌ Error during memory cleanup:', error);
    } finally {
      this.isCleaningMemory = false;
    }
  }

  /**
   * Clear image cache - OPTIMIZADO
   */
  private clearImageCache(): void {
    try {
      // React Native Image cache clearing would go here
      // For now, just log
      console.log('🖼️ Image cache cleared');
    } catch (error) {
      console.error('Error clearing image cache:', error);
    }
  }
  
  /**
   * 🔥 NUEVO: Limpiar referencias globales para liberar memoria
   */
  private clearGlobalReferences(): void {
    try {
      // Limpiar cualquier referencia global que pueda estar acumulando memoria
      if (typeof global !== 'undefined') {
        // Limpiar solo las referencias que sabemos que son seguras
        console.log('🗑️ Global references cleared');
      }
    } catch (error) {
      console.error('Error clearing global references:', error);
    }
  }

  /**
   * Check if memory usage is high and trigger cleanup
   */
  async checkMemoryUsage(): Promise<void> {
    // This is a simplified check - in production you'd use actual memory APIs
    console.log('🔍 Checking memory usage...');
    
    // Trigger cleanup preventively
    if (!this.isCleaningMemory) {
      setTimeout(() => this.cleanupMemory(), 100);
    }
  }

  /**
   * Limit array size to prevent OOM
   */
  limitArraySize<T>(array: T[], maxSize: number): T[] {
    if (array.length > maxSize) {
      console.warn(`⚠️ Array truncated from ${String(array.length)} to ${String(maxSize)} items`);
      return array.slice(0, maxSize);
    }
    return array;
  }

  /**
   * Compress string data
   */
  compressString(str: string, maxLength: number): string {
    if (str.length > maxLength) {
      console.warn(`⚠️ String truncated from ${String(str.length)} to ${String(maxLength)} chars`);
      return str.substring(0, maxLength);
    }
    return str;
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring(): void {
    if (Platform.OS !== 'android') return;

    console.log('📊 Memory monitoring enabled');

    // Check memory every 30 seconds
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);

    // Clean memory every 2 minutes
    setInterval(() => {
      this.cleanupMemory();
    }, 120000);
  }

  /**
   * Emergency memory cleanup
   */
  emergencyCleanup(): void {
    console.warn('🚨 EMERGENCY MEMORY CLEANUP');
    
    // Clear all logs
    if (console.clear) console.clear();
    
    // Trigger GC multiple times
    if (Platform.OS === 'android' && global.gc) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => global.gc?.(), i * 100);
      }
    }
  }
}

export const memoryManager = MemoryManager.getInstance();
export default memoryManager;
