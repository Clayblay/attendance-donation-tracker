import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { spacing, useTheme } from '@/constants/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
};

export default function Chip({ label, selected, onPress, color }: Props) {
  const theme = useTheme();
  const accent = color ?? theme.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? accent : theme.surface,
          borderColor: selected ? accent : theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: selected ? theme.onPrimary : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontSize: 14, fontWeight: '600' },
});
