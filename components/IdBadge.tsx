import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typeColor, useTheme } from '@/constants/theme';
import { PersonType } from '@/lib/types';

export default function IdBadge({ displayId, type }: { displayId: string; type: PersonType }) {
  const theme = useTheme();
  const color = typeColor(theme, type);
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: theme.surfaceAlt }]}>
      <Text style={[styles.text, { color }]}>{displayId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});
