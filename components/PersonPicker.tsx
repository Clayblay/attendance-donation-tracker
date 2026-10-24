import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import IdBadge from '@/components/IdBadge';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import { Person } from '@/lib/types';

type Props = {
  people: Person[];
  /** null = anonymous / no name. */
  value: string | null;
  onChange: (id: string | null) => void;
  /** Creates a new contributor from a typed name and returns them. */
  onQuickAdd: (name: string) => Person;
};

export default function PersonPicker({ people, value, onChange, onQuickAdd }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const selected = people.find((p) => p.id === value) ?? null;
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return [];
    return people
      .filter((p) => p.name.toLowerCase().includes(q) || p.displayId.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [people, q]);

  const exact = people.some((p) => p.name.toLowerCase() === q);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textMuted }]}>Donor</Text>
      {selected ? (
        <View style={[styles.pill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <IdBadge displayId={selected.displayId} type={selected.type} />
          <Text style={[styles.pillName, { color: theme.text }]} numberOfLines={1}>{selected.name}</Text>
          <Pressable accessibilityLabel="Clear donor" onPress={() => onChange(null)}>
            <Ionicons name="close-circle" size={22} color={theme.textMuted} />
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={[styles.anon, { color: theme.textMuted }]}>
            Anonymous (no donor selected). Search below to choose someone.
          </Text>
          <TextField value={query} onChangeText={setQuery} placeholder="Search by name or ID" />
          {matches.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                onChange(p.id);
                setQuery('');
              }}
              style={({ pressed }) => [styles.option, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <IdBadge displayId={p.displayId} type={p.type} />
              <Text style={[styles.pillName, { color: theme.text }]} numberOfLines={1}>{p.name}</Text>
            </Pressable>
          ))}
          {q && !exact ? (
            <Pressable
              onPress={() => {
                const person = onQuickAdd(query.trim());
                onChange(person.id);
                setQuery('');
              }}
              style={({ pressed }) => [styles.option, { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="person-add-outline" size={20} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                Add "{query.trim()}" as a new contributor
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  anon: { fontSize: 13, marginBottom: spacing.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: 12 },
  pillName: { flex: 1, fontSize: 16, fontWeight: '600' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
});
