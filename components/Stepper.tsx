import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { spacing, useTheme } from '@/constants/theme';

type Props = { label?: string; value: number; onChange: (n: number) => void };

/** A number box with − and + buttons. */
export default function Stepper({ label, value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="Decrease"
          onPress={() => onChange(Math.max(0, value - 1))}
          style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Ionicons name="remove" size={22} color={theme.primary} />
        </Pressable>
        <TextInput
          value={String(value)}
          keyboardType="number-pad"
          onChangeText={(t) => {
            const n = parseInt(t.replace(/\D/g, ''), 10);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
        />
        <Pressable
          accessibilityLabel="Increase"
          onPress={() => onChange(value + 1)}
          style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Ionicons name="add" size={22} color={theme.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { width: 90, textAlign: 'center', fontSize: 18, fontWeight: '700', borderWidth: 1, borderRadius: 12, paddingVertical: 8 },
});
