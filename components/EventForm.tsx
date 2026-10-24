import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import FormModal from '@/components/FormModal';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import { EventInput, EventType } from '@/lib/types';

type Props = {
  /** null = adding a new event type. */
  item: EventType | null;
  takenNames: string[];
  onSave: (input: EventInput) => void;
  onClose: () => void;
};

export default function EventForm({ item, takenNames, onSave, onClose }: Props) {
  const theme = useTheme();
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [active, setActive] = useState(item?.active ?? true);
  const [error, setError] = useState<string | undefined>();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError('Please enter a name.');
    if (takenNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      return setError('You already have an event type with this name.');
    }
    setError(undefined);
    onSave({ name: trimmed, description, active });
  }

  return (
    <FormModal
      visible
      title={item ? 'Edit event type' : 'Add event type'}
      onClose={onClose}
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button title={item ? 'Save changes' : 'Add'} onPress={submit} />
        </>
      }
    >
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Youth Night" autoFocus autoCapitalize="words" error={error} />
      <TextField label="Description (optional)" value={description} onChangeText={setDescription} placeholder="e.g. Fridays at 7 pm" />
      <Text style={[styles.label, { color: theme.textMuted }]}>Status</Text>
      <View style={styles.chips}>
        <Chip label="Active" selected={active} onPress={() => setActive(true)} />
        <Chip label="Inactive" selected={!active} color={theme.textMuted} onPress={() => setActive(false)} />
      </View>
      <Text style={[styles.note, { color: theme.textMuted }]}>
        Inactive event types are hidden when taking attendance, but past records are kept.
      </Text>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { fontSize: 13, marginTop: spacing.md, lineHeight: 18 },
});
