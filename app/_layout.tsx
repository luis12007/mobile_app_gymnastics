import React, { Component } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const REVENUECAT_API_KEY_IOS = 'appl_mQejviYuLICJoCRcTTaDWvGxqWl';
const REVENUECAT_API_KEY_ANDROID = 'goog_oQKtKPTjSrjppDQtPcIjLZcVvHR';

// Configure RevenueCat synchronously at module load time
// so it is ready before any child screen's useEffect runs
Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
try {
  if (Platform.OS === 'ios') {
    Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
  } else if (Platform.OS === 'android') {
    Purchases.configure({ apiKey: REVENUECAT_API_KEY_ANDROID });
  }
} catch (e: any) {
  // Catch native errors coming from the billing wrapper or config
  console.error('[RC] ❌ Failed to configure Purchases:', e);
}

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'Unexpected error',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackTitle}>Gym Judge needs to recover</Text>
          <Text style={styles.fallbackText} numberOfLines={4}>
            {this.state.errorMessage}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <AppErrorBoundary>
          <Stack 
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="discipline-select" options={{ headerShown: false }} />
            <Stack.Screen name="main-menu" />
            <Stack.Screen name="folder/[id]" />
            <Stack.Screen name="start-judging" />
            <Stack.Screen name="gymnast-floor" />
            <Stack.Screen name="gymnast-vault" />
            <Stack.Screen name="main-table" />
          </Stack>
        </AppErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b1b1b',
    marginBottom: 12,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#004aad',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});