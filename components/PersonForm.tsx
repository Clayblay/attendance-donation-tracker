import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import FormModal from '@/components/FormModal';
import TextField from '@/components/TextField';
import { spacing, typeColor, useTheme } from '@/constants/theme';
import { PERSON_TYPES, TYPE_LABEL } from '@/lib/ids';
import { Person, PersonInput, PersonType } from '@/lib/types';

type Props = {
  /** null = adding a new person. */
  person: Person | null;
  peekNextId: (type: PersonType) => string;
  onSave: (input: PersonInput) => void;
  onClose: () => void;
};

export default function PersonForm({ person, peekNextId, onSave, onClose }: Props) {
  const theme = useTheme();
  const [name, setName] = useState(person?.name ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [type, setType] = useState<PersonType>(person?.type ?? 'contributor');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const typeChanged = person !== null && person.type !== type;
  let idNote: string;
  if (person === null) idNote = `This person will get ID ${peekNextId(type)}.`;
  else if (typeChanged)
    idNote = `Changing the type gives a new ID (${peekNextId(type)}). The old ID ${person.displayId} is kept in their record.`;
  else idNote = `ID: ${person.displayId}`;

  function submit() {
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) next.name = 'Please enter a name.';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'That email address does not look right.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave({ name, email, phone, type });
  }

  return (
    <FormModal
      visible
      title={person ? 'Edit person' : 'Add person'}
      onClose={onClose}
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button title={person ? 'Save changes' : 'Add person'} onPress={submit} />
        </>
      }
    >
      <TextField label="Full name" value={name} onChangeText={setName} placeholder="e.g. Jane Smith" autoFocus error={errors.name} autoCapitalize="words" />
      <TextField label="Email (optional)" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      <TextField label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="(555) 123-4567" keyboardType="phone-pad" />
      <Text style={[styles.label, { color: theme.textMuted }]}>Type</Text>
      <View style={styles.chips}>
        {PERSON_TYPES.map((t) => (
          <Chip key={t} label={TYPE_LABEL[t]} selected={type === t} color={typeColor(theme, t)} onPress={() => setType(t)} />
        ))}
      </View>
      <Text style={[styles.note, { color: theme.textMuted }]}>{idNote}</Text>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { fontSize: 13, marginTop: spacing.md, lineHeight: 18 },
});
