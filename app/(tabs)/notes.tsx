import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import ConfirmDialog from '@/components/ConfirmDialog';
import NoteCard from '@/components/NoteCard';
import NoteForm from '@/components/NoteForm';
import Screen from '@/components/Screen';
import { noteColor, spacing, useTheme } from '@/constants/theme';
import { attachLabel, isTodo, noteToInput, NOTE_CATEGORIES, NOTE_CATEGORY_LABEL } from '@/lib/notes';
import { useData } from '@/lib/store';
import { Note, NoteCategory, NoteInput } from '@/lib/types';

type Filter = 'all' | 'open' | 'pinned' | NoteCategory;

export default function NotesScreen() {
  const theme = useTheme();
  const { data, addNote, updateNote, deleteNote } = useData();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Note | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  const openCount = data.notes.filter((n) => isTodo(n) && !n.done).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.notes
      .filter((n) => {
        if (filter === 'all') return true;
        if (filter === 'open') return isTodo(n) && !n.done;
        if (filter === 'pinned') return n.pinned;
        return n.category === filter;
      })
      .filter((n) => !q || n.text.toLowerCase().includes(q) || (attachLabel(n, data) ?? '').toLowerCase().includes(q))
      .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.updatedAt.localeCompare(a.updatedAt)));
  }, [data, filter, query]);

  function save(input: NoteInput) {
    if (editing === 'new') addNote(input);
    else if (editing) updateNote(editing.id, input);
    setEditing(null);
  }

  return (
    <Screen
      title="Notes"
      subtitle={`${data.notes.length} ${data.notes.length === 1 ? 'note' : 'notes'} · ${openCount} open to-do${openCount === 1 ? '' : 's'}`}
      back={{ label: 'Dashboard', to: '/' }}
      headerRight={<Button title="Add note" icon="add" onPress={() => setEditing('new')} />}
    >
      <View style={[styles.search, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes"
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
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`Open to-dos (${openCount})`} selected={filter === 'open'} onPress={() => setFilter('open')} />
        <Chip label="Pinned" selected={filter === 'pinned'} onPress={() => setFilter('pinned')} />
        {NOTE_CATEGORIES.map((c) => (
          <Chip key={c} label={NOTE_CATEGORY_LABEL[c]} selected={filter === c} color={noteColor(theme, c)} onPress={() => setFilter(c)} />
        ))}
      </View>

      {visible.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="document-text-outline" size={44} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {data.notes.length === 0 ? 'No notes yet' : 'No notes match'}
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            {data.notes.length === 0
              ? 'Write a general note, or attach one to a person, a gift or an attendance record. You can also add notes from the People, History and Attendance tabs.'
              : 'Try another filter or search.'}
          </Text>
          {data.notes.length === 0 ? <Button title="Add note" icon="add" onPress={() => setEditing('new')} /> : null}
        </View>
      ) : (
        visible.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            attachedTo={attachLabel(n, data)}
            onEdit={() => setEditing(n)}
            onDelete={() => setDeleting(n)}
            onToggleDone={() => updateNote(n.id, { ...noteToInput(n), done: !n.done })}
          />
        ))
      )}

      {editing !== null ? (
        <NoteForm note={editing === 'new' ? null : editing} onSave={save} onClose={() => setEditing(null)} />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this note?"
          message="This note will be removed. This cannot be undone."
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteNote(deleting.id);
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
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderWidth: 1, borderRadius: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyBody: { fontSize: 14, textAlign: 'center', marginBottom: spacing.sm, maxWidth: 420 },
});
