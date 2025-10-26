import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import ErrorBoundary from '../components/ErrorBoundary';
import { safeLog } from '../utils/crashPrevention';
import { memoryManager } from '../utils/memoryManager';
import { Platform, AppState } from 'react-native';

// Note: Console overrides are now installed in index.tsx for earlier activation

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Setup memory management on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      console.log('🚀 Setting up memory management for Android');
      memoryManager.setupMemoryMonitoring();

      // Clean memory when app goes to background
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'background') {
          console.log('📱 App going to background - cleaning memory');
          memoryManager.cleanupMemory();
        }
      });

      // Initial cleanup
      memoryManager.cleanupMemory();

      return () => {
        subscription.remove();
      };
    }
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        safeLog.error('App Error Boundary caught error:', error);
        safeLog.error('Component Stack:', errorInfo.componentStack);
        
        // Trigger emergency cleanup on crash
        if (Platform.OS === 'android') {
          memoryManager.emergencyCleanup();
        }
      }}
    >
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ title: 'LoginScreen' }} />
          <Stack.Screen name="select-sex" options={{ title: 'SelectSex' }} />
          <Stack.Screen name="main-menu" options={{ title: 'main-menu' }} />
          <Stack.Screen name="final-table" options={{ title: 'final-table' }} />
          <Stack.Screen name="start-gudging" options={{ title: 'start-gudging' }} />
          <Stack.Screen name="main-floor" options={{ title: 'main-floor' }} />
          <Stack.Screen name="main-jump" options={{ title: 'main-jump' }} />

        
        </Stack>
      </ThemeProvider>
    </ErrorBoundary>
  );
}