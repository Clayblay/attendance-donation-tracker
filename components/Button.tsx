import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { spacing, useTheme } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
};

export default function Button({ title, onPress, variant = 'primary', icon, disabled }: Props) {
  const theme = useTheme();

  let bg = theme.primary;
  let fg = theme.onPrimary;
  let border = 'transparent';
  if (variant === 'secondary') {
    bg = theme.surface;
    fg = theme.text;
    border = theme.border;
  } else if (variant === 'danger') {
    bg = theme.danger;
    fg = '#FFFFFF';
  } else if (variant === 'ghost') {
    bg = 'transparent';
    fg = theme.primary;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.label, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: { fontSize: 15, fontWeight: '600' },
});
