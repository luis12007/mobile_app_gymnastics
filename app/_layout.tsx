import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';


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

  if (!loaded) {
    return null;
  }

  return (
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
  );
}