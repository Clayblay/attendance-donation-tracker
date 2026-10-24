import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@/constants/theme';
import { DataProvider, useData } from '@/lib/store';

function Gate() {
  const { loaded } = useData();
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      {!loaded ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <Gate />
      </DataProvider>
    </SafeAreaProvider>
  );
}
