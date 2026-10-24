import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import ConfirmDialog from '@/components/ConfirmDialog';
import IdBadge from '@/components/IdBadge';
import NoteButton from '@/components/NoteButton';
import NotesHost from '@/components/NotesHost';
import PersonForm from '@/components/PersonForm';
import Screen from '@/components/Screen';
import { spacing, typeColor, useTheme } from '@/constants/theme';
import { PERSON_TYPES, TYPE_LABEL, TYPE_LABEL_PLURAL } from '@/lib/ids';
import { formatMoney } from '@/lib/money';
import { countNotes } from '@/lib/notes';
import { useData } from '@/lib/store';
import { Person, PersonInput, PersonType } from '@/lib/types';

type Filter = 'all' | PersonType;

export default function PeopleScreen() {
  const theme = useTheme();
  const { data, addPerson, updatePerson, deletePerson, peekNextId } = useData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Person | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const [notesFor, setNotesFor] = useState<Person | null>(null);

  const counts = useMemo(() => {
    const c: Record<PersonType, number> = { member: 0, contributor: 0, visitor: 0 };
    data.people.forEach((p) => (c[p.type] += 1));
    return c;
  }, [data.people]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.people
      .filter((p) => filter === 'all' || p.type === filter)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.displayId.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.people, query, filter]);

  function save(input: PersonInput) {
    if (editing === 'new') addPerson(input);
    else if (editing) updatePerson(editing.id, input);
    setEditing(null);
  }

  return (
    <Screen
      title="People"
      subtitle={`${data.people.length} ${data.people.length === 1 ? 'person' : 'people'} on record`}
      headerRight={<Button title="Add person" icon="add" onPress={() => setEditing('new')} />}
    >
      <View style={[styles.search, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, ID, email or phone"
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {query ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chips}>
        <Chip label={`All (${data.people.length})`} selected={filter === 'all'} onPress={() => setFilter('all')} />
        {PERSON_TYPES.map((t) => (
          <Chip
            key={t}
            label={`${TYPE_LABEL_PLURAL[t]} (${counts[t]})`}
            selected={filter === t}
            color={typeColor(theme, t)}
            onPress={() => setFilter(t)}
          />
        ))}
      </View>

      {data.people.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="people-outline" size={44} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No people yet</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            Add your members, contributors and visitors. Each person gets an ID that starts with M, C or V.
          </Text>
          <Button title="Add your first person" icon="add" onPress={() => setEditing('new')} />
        </View>
      ) : visible.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No matches</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>Try a different search or filter.</Text>
        </View>
      ) : (
        <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {visible.map((p, i) => {
            const details = [TYPE_LABEL[p.type], p.email, p.phone].filter(Boolean).join('  ·  ');
            return (
              <View
                key={p.id}
                style={[styles.row, i < visible.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
              >
                <IdBadge displayId={p.displayId} type={p.type} />
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.details, { color: theme.textMuted }]} numberOfLines={1}>{details}</Text>
                  {p.previousIds.length > 0 ? (
                    <Text style={[styles.details, { color: theme.textMuted }]} numberOfLines={1}>
                      Previous ID: {p.previousIds.join(', ')}
                    </Text>
                  ) : null}
                </View>
                <NoteButton count={countNotes(data, 'person', p.id)} onPress={() => setNotesFor(p)} />
                <Pressable accessibilityLabel={`Edit ${p.name}`} onPress={() => setEditing(p)} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={22} color={theme.primary} />
                </Pressable>
                <Pressable accessibilityLabel={`Delete ${p.name}`} onPress={() => setDeleting(p)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={22} color={theme.danger} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {notesFor ? (
        <NotesHost target={{ kind: 'person', id: notesFor.id }} title={`Notes: ${notesFor.name}`} onClose={() => setNotesFor(null)} />
      ) : null}

      {editing !== null ? (
        <PersonForm
          person={editing === 'new' ? null : editing}
          peekNextId={peekNextId}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this person?"
          message={(() => {
            const theirs = data.gifts.filter((g) => g.personId === deleting.id);
            const base = `${deleting.name} (${deleting.displayId}) will be removed. This cannot be undone.`;
            const att = data.attendance.filter((r) => r.personIds.includes(deleting.id)).length;
            const attNote = att > 0 ? ` They are checked in on ${att} attendance ${att === 1 ? 'record' : 'records'}; those counts stay as unnamed attendees.` : '';
            if (theirs.length === 0) return base + attNote;
            const total = formatMoney(theirs.reduce((t, g) => t + g.amountCents, 0));
            return `${base} Their ${theirs.length} recorded ${theirs.length === 1 ? 'gift' : 'gifts'} (${total}) will be kept in History under their name.${attNote}`;
          })()}
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deletePerson(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  list: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  details: { fontSize: 13, marginTop: 2 },
  iconBtn: { padding: 6 },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth: 1,
    borderRadius: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyBody: { fontSize: 14, textAlign: 'center', marginBottom: spacing.sm, maxWidth: 360 },
});
