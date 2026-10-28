import React from 'react';
import { Text } from 'react-native';
import Button from '@/components/Button';
import ReportsPanel from '@/components/ReportsPanel';
import Screen from '@/components/Screen';
import { spacing, useTheme } from '@/constants/theme';

/** If this page ever crashes, show the actual message instead of flashing back. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const theme = useTheme();
  return (
    <Screen title="Reports" subtitle="This page ran into a problem" back={{ label: 'Settings', to: '/settings' }}>
      <Text selectable style={{ color: theme.danger, fontSize: 14, marginBottom: spacing.md }}>
        {String(error?.message ?? error)}
      </Text>
      <Button title="Try again" onPress={() => retry()} />
    </Screen>
  );
}

export default function ReportsScreen() {
  return (
    <Screen title="Reports" subtitle="Print, save as PDF, or open in a spreadsheet" back={{ label: 'Settings', to: '/settings' }}>
      <ReportsPanel />
    </Screen>
  );
}
