import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  return (
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
  );
}