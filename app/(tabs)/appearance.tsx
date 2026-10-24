import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import Screen from '@/components/Screen';
import TextField from '@/components/TextField';
import { PALETTES } from '@/constants/palettes';
import { spacing, useTheme } from '@/constants/theme';
import { normalizeHex } from '@/lib/color';
import { useData } from '@/lib/store';
import { ThemeMode } from '@/lib/types';

const MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'Match my device' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function AppearanceScreen() {
  const theme = useTheme();
  const { data, updateSettings } = useData();
  const { themeMode, paletteId, customAccent } = data.settings;
  const [hex, setHex] = useState(customAccent);
  const [hexError, setHexError] = useState<string | undefined>();

  function applyAccent() {
    const ok = normalizeHex(hex);
    if (!ok) return setHexError('Enter a colour like #7B3FA0 (6 letters or numbers).');
    setHexError(undefined);
    setHex(ok);
    updateSettings({ customAccent: ok });
  }

  function clearAccent() {
    setHex('');
    setHexError(undefined);
    updateSettings({ customAccent: '' });
  }

  return (
    <Screen
      title="Appearance"
      subtitle="Choose your colours. The whole app changes as you pick."
      back={{ label: 'Settings', to: '/settings' }}
    >
      <Text style={[styles.label, { color: theme.textMuted }]}>Light or dark</Text>
      <View style={styles.chips}>
        {MODES.map((m) => (
          <Chip key={m.id} label={m.label} selected={themeMode === m.id} onPress={() => updateSettings({ themeMode: m.id })} />
        ))}
      </View>

      <Text style={[styles.label, styles.gap, { color: theme.textMuted }]}>Colour palette</Text>
      <View style={styles.grid}>
        {PALETTES.map((p) => {
          const c = theme.isDark ? p.dark : p.light;
          const selected = paletteId === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => updateSettings({ paletteId: p.id })}
              style={[
                styles.card,
                { backgroundColor: c.background, borderColor: selected ? theme.primary : theme.border, borderWidth: selected ? 3 : 1 },
              ]}
            >
              <View style={styles.swatches}>
                <View style={[styles.swatch, { backgroundColor: c.primary }]} />
                <View style={[styles.swatch, { backgroundColor: c.gold }]} />
                <View style={[styles.swatch, { backgroundColor: c.blue }]} />
                <View style={[styles.swatch, { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]} />
              </View>
              <View style={styles.cardFooter}>
                <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{p.name}</Text>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.primary} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, styles.gap, { color: theme.textMuted }]}>Custom accent colour (optional)</Text>
      <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
          Replaces the main colour of the palette above. Type a colour code like #7B3FA0.
        </Text>
        <View style={styles.hexRow}>
          <View style={{ flex: 1 }}>
            <TextField value={hex} onChangeText={setHex} placeholder="#7B3FA0" autoCapitalize="none" error={hexError} />
          </View>
          <View style={[styles.preview, { backgroundColor: normalizeHex(hex) ?? theme.primary, borderColor: theme.border }]} />
        </View>
        <View style={styles.chips}>
          <Button title="Apply colour" onPress={applyAccent} />
          {customAccent ? <Button title="Remove custom colour" variant="secondary" onPress={clearAccent} /> : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  gap: { marginTop: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { flexGrow: 1, flexBasis: 150, borderRadius: 16, padding: spacing.md, gap: spacing.md },
  swatches: { flexDirection: 'row', gap: spacing.sm },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  box: { borderWidth: 1, borderRadius: 16, padding: spacing.md },
  hexRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  preview: { width: 44, height: 44, borderRadius: 12, borderWidth: 1 },
});
