import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, useTheme } from '@/constants/theme';

type Props = {
  number: number;
  title: string;
  subtitle?: string;
  /** Take the full width of the dashboard. */
  full?: boolean;
  /** Optional control shown at the right of the header. */
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
};

export default function Widget({ number, title, subtitle, full, headerRight, children }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{number}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle ? <Text style={{ color: theme.textMuted, fontSize: 13 }}>{subtitle}</Text> : null}
        </View>
        {headerRight}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexShrink: 1,
    alignSelf: 'stretch',
    minHeight: 200,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontWeight: '700', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  body: { flexGrow: 1, marginTop: spacing.md },
});
