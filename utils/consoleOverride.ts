/**
 * Console Override - Prevent memory leaks from excessive logging
 * Android keeps ALL console logs in memory, causing OOM crashes
 */

import { Platform } from 'react-native';

const MAX_LOGS_IN_MEMORY = 100;
const logBuffer: string[] = [];

// Only apply on Android in production
const shouldLimitLogs = Platform.OS === 'android' && !__DEV__;

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

/**
 * Limited console.log - prevents memory buildup
 */
function limitedLog(...args: any[]) {
  if (shouldLimitLogs) {
    // Keep only last N logs
    const message = args.map(arg => String(arg)).join(' ');
    logBuffer.push(message);
    
    if (logBuffer.length > MAX_LOGS_IN_MEMORY) {
      logBuffer.shift(); // Remove oldest log
    }
    
    // Don't call original in production to save memory
    return;
  }
  
  originalConsoleLog(...args);
}

/**
 * Limited console.warn
 */
function limitedWarn(...args: any[]) {
  if (shouldLimitLogs) {
    logBuffer.push(`WARN: ${args.map(arg => String(arg)).join(' ')}`);
    if (logBuffer.length > MAX_LOGS_IN_MEMORY) {
      logBuffer.shift();
    }
    return;
  }
  
  originalConsoleWarn(...args);
}

/**
 * Limited console.error - always show errors
 */
function limitedError(...args: any[]) {
  // Always log errors, but limit buffer
  if (logBuffer.length > MAX_LOGS_IN_MEMORY) {
    logBuffer.shift();
  }
  
  logBuffer.push(`ERROR: ${args.map(arg => String(arg)).join(' ')}`);
  originalConsoleError(...args);
}

/**
 * Install console overrides
 */
export function installConsoleOverrides() {
  if (Platform.OS !== 'android') return;
  
  console.log = limitedLog;
  console.warn = limitedWarn;
  console.error = limitedError;
  
  console.log('✅ Console overrides installed - memory leak prevention active');
}

/**
 * Get current log buffer
 */
export function getLogBuffer(): string[] {
  return [...logBuffer];
}

/**
 * Clear log buffer
 */
export function clearLogBuffer() {
  logBuffer.length = 0;
  console.log('🧹 Log buffer cleared');
}

// Auto-clear buffer every 5 minutes
if (Platform.OS === 'android') {
  setInterval(() => {
    if (logBuffer.length > MAX_LOGS_IN_MEMORY / 2) {
      const removed = logBuffer.splice(0, MAX_LOGS_IN_MEMORY / 2);
      console.log(`🧹 Auto-cleared ${String(removed.length)} old logs from buffer`);
    }
  }, 300000); // 5 minutes
}
