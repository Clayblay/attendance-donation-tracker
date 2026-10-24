import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import FormModal from '@/components/FormModal';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import { GIVING_KIND_LABEL, GIVING_KINDS } from '@/lib/giving';
import { GivingInput, GivingKind, GivingOpportunity } from '@/lib/types';

type Props = {
  /** null = adding a new giving opportunity. */
  item: GivingOpportunity | null;
  /** Names already in use by other opportunities (to prevent duplicates). */
  takenNames: string[];
  onSave: (input: GivingInput) => void;
  onClose: () => void;
};

export default function GivingForm({ item, takenNames, onSave, onClose }: Props) {
  const theme = useTheme();
  const [name, setName] = useState(item?.name ?? '');
  const [kind, setKind] = useState<GivingKind>(item?.kind ?? 'offering');
  const [description, setDescription] = useState(item?.description ?? '');
  const [active, setActive] = useState(item?.active ?? true);
  const [error, setError] = useState<string | undefined>();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError('Please enter a name.');
    if (takenNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      return setError('You already have a giving opportunity with this name.');
    }
    setError(undefined);
    onSave({ name: trimmed, kind, description, active });
  }

  return (
    <FormModal
      visible
      title={item ? 'Edit giving opportunity' : 'Add giving opportunity'}
      onClose={onClose}
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button title={item ? 'Save changes' : 'Add'} onPress={submit} />
        </>
      }
    >
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Christmas Offering 2026"
        autoFocus
        autoCapitalize="words"
        error={error}
      />
      <Text style={[styles.label, { color: theme.textMuted }]}>Kind</Text>
      <View style={styles.chips}>
        {GIVING_KINDS.map((k) => (
          <Chip key={k} label={GIVING_KIND_LABEL[k]} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <View style={{ height: spacing.md }} />
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Building fund drive"
      />
      <Text style={[styles.label, { color: theme.textMuted }]}>Status</Text>
      <View style={styles.chips}>
        <Chip label="Active" selected={active} onPress={() => setActive(true)} />
        <Chip label="Inactive" selected={!active} color={theme.textMuted} onPress={() => setActive(false)} />
      </View>
      <Text style={[styles.note, { color: theme.textMuted }]}>
        Inactive items are hidden when you record gifts, but their past gifts are kept.
      </Text>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { fontSize: 13, marginTop: spacing.md, lineHeight: 18 },
});
