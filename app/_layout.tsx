import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from '@/components/LoginScreen';
import SyncConflictModal from '@/components/SyncConflictModal';
import { useTheme } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DataProvider, useData } from '@/lib/store';
import { SyncProvider, useSync } from '@/lib/sync';

function Gate() {
  const { loaded } = useData();
  const auth = useAuth();
  const sync = useSync();
  const theme = useTheme();

  const needsLogin = (auth.status === 'signedOut' && !auth.skipped) || auth.status === 'recovery';

  let body;
  if (!loaded || auth.status === 'loading') {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  } else if (needsLogin) {
    body = <LoginScreen />;
  } else {
    body = (
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    );
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      {body}
      {sync.info.state === 'conflict' && sync.conflictOpen && !needsLogin ? <SyncConflictModal /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <AuthProvider>
          <SyncProvider>
            <Gate />
          </SyncProvider>
        </AuthProvider>
      </DataProvider>
    </SafeAreaProvider>
  );
}
