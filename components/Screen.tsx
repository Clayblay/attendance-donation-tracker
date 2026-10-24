import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_CONTENT_WIDTH, spacing, useTheme } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  /** Optional element (usually a button) shown at the right of the title. */
  headerRight?: React.ReactNode;
  /** Shows a back link, e.g. { label: 'Settings', to: '/settings' }. */
  back?: { label: string; to: string };
  children: React.ReactNode;
};

/** Shared page shell: safe-area aware, scrollable, and centred on wide screens. */
export default function Screen({ title, subtitle, headerRight, back, children }: Props) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace(back.to as never))}
              style={styles.back}
            >
              <Ionicons name="chevron-back" size={20} color={theme.primary} />
              <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{back.label}</Text>
            </Pressable>
          ) : null}
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
              ) : null}
            </View>
            {headerRight}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', padding: spacing.lg },
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, alignSelf: 'flex-start' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: { flex: 1 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, marginTop: spacing.xs },
});
