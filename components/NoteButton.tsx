import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/constants/theme';

/** A small notes icon with a count badge. */
export default function NoteButton({ count, onPress }: { count: number; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityLabel={`Notes (${count})`} onPress={onPress} style={styles.btn}>
      <Ionicons name={count > 0 ? 'document-text' : 'document-text-outline'} size={22} color={theme.gold} />
      {count > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.gold }]}>
          <Text style={[styles.badgeText, { color: theme.onPrimary }]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 6 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
