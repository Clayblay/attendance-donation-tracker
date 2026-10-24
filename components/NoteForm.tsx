import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import FormModal from '@/components/FormModal';
import TargetPicker from '@/components/TargetPicker';
import TextField from '@/components/TextField';
import { noteColor, spacing, useTheme } from '@/constants/theme';
import { describeTarget, isTodo, NOTE_CATEGORIES, NOTE_CATEGORY_LABEL, TARGET_KIND_LABEL } from '@/lib/notes';
import { useData } from '@/lib/store';
import { Note, NoteCategory, NoteInput, NoteTargetKind } from '@/lib/types';

type Props = {
  /** null = writing a new note. */
  note: Note | null;
  /** When set, the note is locked to this item (used from a person, gift or attendance record). */
  fixedTarget?: { kind: Exclude<NoteTargetKind, 'none'>; id: string };
  onSave: (input: NoteInput) => void;
  onClose: () => void;
};

const KINDS: NoteTargetKind[] = ['none', 'person', 'gift', 'attendance'];

export default function NoteForm({ note, fixedTarget, onSave, onClose }: Props) {
  const theme = useTheme();
  const { data } = useData();
  const [text, setText] = useState(note?.text ?? '');
  const [category, setCategory] = useState<NoteCategory>(note?.category ?? 'general');
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [done, setDone] = useState(note?.done ?? false);
  const [kind, setKind] = useState<NoteTargetKind>(fixedTarget?.kind ?? note?.targetKind ?? 'none');
  const [targetId, setTargetId] = useState(fixedTarget?.id ?? note?.targetId ?? '');
  const [error, setError] = useState<string | undefined>();

  function submit() {
    if (!text.trim()) return setError('Please write something in the note.');
    if (kind !== 'none' && !targetId) return setError('Choose what this note is attached to, or pick "Nothing".');
    setError(undefined);
    onSave({
      text,
      category,
      pinned,
      done: isTodo({ category }) ? done : false,
      targetKind: kind,
      targetId: kind === 'none' ? '' : targetId,
    });
  }

  return (
    <FormModal
      visible
      title={note ? 'Edit note' : 'Add note'}
      onClose={onClose}
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button title={note ? 'Save changes' : 'Add note'} onPress={submit} />
        </>
      }
    >
      <TextField label="Note" value={text} onChangeText={setText} placeholder="Write your note here" multiline autoFocus />

      <Text style={[styles.label, { color: theme.textMuted }]}>Type</Text>
      <View style={styles.chips}>
        {NOTE_CATEGORIES.map((c) => (
          <Chip key={c} label={NOTE_CATEGORY_LABEL[c]} selected={category === c} color={noteColor(theme, c)} onPress={() => setCategory(c)} />
        ))}
      </View>

      {isTodo({ category }) ? (
        <>
          <Text style={[styles.label, styles.gap, { color: theme.textMuted }]}>Status</Text>
          <View style={styles.chips}>
            <Chip label="Open" selected={!done} onPress={() => setDone(false)} />
            <Chip label="Done" selected={done} onPress={() => setDone(true)} />
          </View>
        </>
      ) : null}

      <Text style={[styles.label, styles.gap, { color: theme.textMuted }]}>Pin</Text>
      <View style={styles.chips}>
        <Chip label={pinned ? 'Pinned to the top' : 'Not pinned'} selected={pinned} onPress={() => setPinned((p) => !p)} />
      </View>

      <Text style={[styles.label, styles.gap, { color: theme.textMuted }]}>Attached to</Text>
      {fixedTarget ? (
        <Text style={{ color: theme.text, fontWeight: '600' }}>
          {describeTarget(fixedTarget.kind, fixedTarget.id, data) ?? ''}
        </Text>
      ) : (
        <>
          <View style={styles.chips}>
            {KINDS.map((k) => (
              <Chip
                key={k}
                label={TARGET_KIND_LABEL[k]}
                selected={kind === k}
                onPress={() => {
                  if (k !== kind) setTargetId('');
                  setKind(k);
                }}
              />
            ))}
          </View>
          {kind !== 'none' ? (
            <View style={{ marginTop: spacing.sm }}>
              <TargetPicker kind={kind} value={targetId} onChange={setTargetId} />
            </View>
          ) : null}
        </>
      )}

      {error ? <Text style={{ color: theme.danger, fontSize: 13, marginTop: spacing.md }}>{error}</Text> : null}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  gap: { marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
