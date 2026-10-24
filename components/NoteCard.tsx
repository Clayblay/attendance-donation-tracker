import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { noteColor, spacing, useTheme } from '@/constants/theme';
import { isTodo, NOTE_CATEGORY_LABEL } from '@/lib/notes';
import { Note } from '@/lib/types';

type Props = {
  note: Note;
  /** Text like "Person: Jane Smith"; leave out when the context already makes it obvious. */
  attachedTo?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleDone: () => void;
};

export default function NoteCard({ note, attachedTo, onEdit, onDelete, onToggleDone }: Props) {
  const theme = useTheme();
  const color = noteColor(theme, note.category);
  const todo = isTodo(note);
  const stamp = new Date(note.updatedAt).toLocaleDateString();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.top}>
        {todo ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: note.done }}
            accessibilityLabel="Mark done"
            onPress={onToggleDone}
          >
            <Ionicons name={note.done ? 'checkbox' : 'square-outline'} size={26} color={note.done ? theme.primary : theme.textMuted} />
          </Pressable>
        ) : null}
        <View style={[styles.tag, { borderColor: color }]}>
          <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{NOTE_CATEGORY_LABEL[note.category]}</Text>
        </View>
        {note.pinned ? <Ionicons name="pin" size={16} color={theme.gold} /> : null}
        <View style={{ flex: 1 }} />
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{stamp}</Text>
      </View>

      <Text
        style={[
          styles.text,
          { color: theme.text },
          note.done && todo && { textDecorationLine: 'line-through', opacity: 0.6 },
        ]}
      >
        {note.text}
      </Text>

      {attachedTo ? (
        <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.xs }} numberOfLines={2}>
          {attachedTo}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable accessibilityLabel="Edit note" onPress={onEdit} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={22} color={theme.primary} />
        </Pressable>
        <Pressable accessibilityLabel="Delete note" onPress={onDelete} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={22} color={theme.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  text: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  iconBtn: { padding: 6 },
});
