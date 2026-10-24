import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { spacing, useTheme } from '@/constants/theme';
import { DASHBOARD_ITEMS, DEFAULT_DASHBOARD } from '@/lib/settings';
import { useData } from '@/lib/store';

export default function DashboardLayoutScreen() {
  const theme = useTheme();
  const { data, updateSettings } = useData();
  const items = data.settings.dashboard;
  const info = (id: string) => DASHBOARD_ITEMS.find((i) => i.id === id);

  function toggle(index: number) {
    updateSettings({ dashboard: items.map((it, i) => (i === index ? { ...it, visible: !it.visible } : it)) });
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    updateSettings({ dashboard: next });
  }

  return (
    <Screen
      title="Dashboard layout"
      subtitle="Show, hide and reorder the sections of your Dashboard"
      back={{ label: 'Settings', to: '/settings' }}
      headerRight={<Button title="Reset" variant="secondary" onPress={() => updateSettings({ dashboard: DEFAULT_DASHBOARD })} />}
    >
      <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {items.map((it, i) => {
          const meta = info(it.id);
          return (
            <View
              key={it.id}
              style={[styles.row, i < items.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }, !it.visible && { opacity: 0.55 }]}
            >
              <Pressable accessibilityLabel={it.visible ? 'Hide' : 'Show'} onPress={() => toggle(i)} style={styles.iconBtn}>
                <Ionicons name={it.visible ? 'eye-outline' : 'eye-off-outline'} size={24} color={theme.primary} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{meta?.label}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>{meta?.description}</Text>
              </View>
              <Pressable accessibilityLabel="Move up" disabled={i === 0} onPress={() => move(i, -1)} style={[styles.iconBtn, i === 0 && { opacity: 0.25 }]}>
                <Ionicons name="arrow-up" size={22} color={theme.text} />
              </Pressable>
              <Pressable
                accessibilityLabel="Move down"
                disabled={i === items.length - 1}
                onPress={() => move(i, 1)}
                style={[styles.iconBtn, i === items.length - 1 && { opacity: 0.25 }]}
              >
                <Ionicons name="arrow-down" size={22} color={theme.text} />
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.md }}>
        The eye shows or hides a section. The arrows move it up or down. Changes show on the Dashboard straight away.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  iconBtn: { padding: 6 },
});
