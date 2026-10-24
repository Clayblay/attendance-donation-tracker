import React, { useState } from 'react';
import { Text } from 'react-native';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormModal from '@/components/FormModal';
import NoteCard from '@/components/NoteCard';
import NoteForm from '@/components/NoteForm';
import { useTheme } from '@/constants/theme';
import { noteToInput } from '@/lib/notes';
import { useData } from '@/lib/store';
import { Note, NoteInput, NoteTargetKind } from '@/lib/types';

type Props = {
  target: { kind: Exclude<NoteTargetKind, 'none'>; id: string };
  title: string;
  onClose: () => void;
};

/** A pop-up listing every note attached to one person, gift or attendance record. */
export default function NotesHost({ target, title, onClose }: Props) {
  const theme = useTheme();
  const { data, addNote, updateNote, deleteNote } = useData();
  const [form, setForm] = useState<Note | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  const notes = data.notes
    .filter((n) => n.targetKind === target.kind && n.targetId === target.id)
    .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.updatedAt.localeCompare(a.updatedAt)));

  function save(input: NoteInput) {
    if (form === 'new') addNote(input);
    else if (form) updateNote(form.id, input);
    setForm(null);
  }

  return (
    <>
      <FormModal
        visible
        title={title}
        onClose={onClose}
        footer={
          <>
            <Button title="Close" variant="secondary" onPress={onClose} />
            <Button title="Add note" icon="add" onPress={() => setForm('new')} />
          </>
        }
      >
        {notes.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>No notes yet. Tap "Add note" to write one.</Text>
        ) : (
          notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onEdit={() => setForm(n)}
              onDelete={() => setDeleting(n)}
              onToggleDone={() => updateNote(n.id, { ...noteToInput(n), done: !n.done })}
            />
          ))
        )}
      </FormModal>

      {form !== null ? (
        <NoteForm note={form === 'new' ? null : form} fixedTarget={target} onSave={save} onClose={() => setForm(null)} />
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
    </>
  );
}
