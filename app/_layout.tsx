import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useRouter, useSegments } from 'expo-router';
import { Platform } from 'react-native';
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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
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
      </ThemeProvider>
    </SafeAreaProvider>
  );
}