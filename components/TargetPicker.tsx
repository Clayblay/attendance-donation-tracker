import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import { describeTarget } from '@/lib/notes';
import { useData } from '@/lib/store';
import { NoteTargetKind } from '@/lib/types';

type Props = {
  kind: Exclude<NoteTargetKind, 'none'>;
  value: string;
  onChange: (id: string) => void;
};

const PLACEHOLDER = {
  person: 'Search people by name or ID',
  gift: 'Search gifts by donor, amount or date',
  attendance: 'Search by event or date',
};

/** Pick the specific person, gift or attendance record a note belongs to. */
export default function TargetPicker({ kind, value, onChange }: Props) {
  const theme = useTheme();
  const { data } = useData();
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    if (kind === 'person') {
      return [...data.people]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ id: p.id, label: `${p.name} (${p.displayId})` }));
    }
    if (kind === 'gift') {
      return [...data.gifts]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((g) => ({ id: g.id, label: describeTarget('gift', g.id, data) ?? '' }));
    }
    return [...data.attendance]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((r) => ({ id: r.id, label: describeTarget('attendance', r.id, data) ?? '' }));
  }, [kind, data]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => options.filter((o) => !q || o.label.toLowerCase().includes(q)).slice(0, 8),
    [options, q]
  );
  const selectedLabel = value ? describeTarget(kind, value, data) : null;

  if (value && selectedLabel) {
    return (
      <View style={[styles.pill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Text style={{ color: theme.text, flex: 1, fontWeight: '600' }} numberOfLines={2}>{selectedLabel}</Text>
        <Pressable accessibilityLabel="Clear selection" onPress={() => onChange('')}>
          <Ionicons name="close-circle" size={22} color={theme.textMuted} />
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <TextField value={query} onChangeText={setQuery} placeholder={PLACEHOLDER[kind]} />
      {options.length === 0 ? (
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>Nothing to choose from yet.</Text>
      ) : matches.length === 0 ? (
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>No matches.</Text>
      ) : (
        matches.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => {
              onChange(o.id);
              setQuery('');
            }}
            style={({ pressed }) => [styles.option, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={{ color: theme.text }} numberOfLines={2}>{o.label}</Text>
          </Pressable>
        ))
      )}
      {!q && options.length > 8 ? (
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>Showing the most recent. Search to find others.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: 12 },
  option: { padding: spacing.sm, borderWidth: 1, borderRadius: 12, marginBottom: spacing.xs },
});
