import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import DateField from '@/components/DateField';
import FormModal from '@/components/FormModal';
import PersonPicker from '@/components/PersonPicker';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import { centsToInput, parseAmount } from '@/lib/money';
import { METHOD_LABEL, PAYMENT_METHODS } from '@/lib/gifts';
import { useData } from '@/lib/store';
import { Gift, GiftInput, PaymentMethod } from '@/lib/types';
import { todayStr } from '@/lib/dates';

type Props = {
  /** null = recording a new gift. */
  gift: Gift | null;
  /** Remembered from the last gift so batches are quick to enter. */
  defaults: { date: string; givingId: string; method: PaymentMethod };
  onSave: (input: GiftInput, addAnother: boolean) => void;
  onClose: () => void;
};

export default function GiftForm({ gift, defaults, onSave, onClose }: Props) {
  const theme = useTheme();
  const { data, addPerson } = useData();
  const isNew = gift === null;

  // Active ones, plus the gift's own opportunity even if it is now inactive.
  const givings = data.givingOpportunities.filter((g) => g.active || g.id === gift?.givingId);

  const [personId, setPersonId] = useState<string | null>(gift?.personId ?? null);
  const [givingId, setGivingId] = useState<string>(
    gift?.givingId ?? (givings.some((g) => g.id === defaults.givingId) ? defaults.givingId : givings[0]?.id ?? '')
  );
  const [amount, setAmount] = useState(gift ? centsToInput(gift.amountCents) : '');
  const [date, setDate] = useState<string | null>(gift?.date ?? defaults.date ?? todayStr());
  const [method, setMethod] = useState<PaymentMethod>(gift?.method ?? defaults.method);
  const [reference, setReference] = useState(gift?.reference ?? '');
  const [note, setNote] = useState(gift?.note ?? '');
  const [errors, setErrors] = useState<{ amount?: string; giving?: string; date?: string }>({});
  const [savedCount, setSavedCount] = useState(0);

  function submit(addAnother: boolean) {
    const cents = parseAmount(amount);
    const next: typeof errors = {};
    if (cents === null || cents <= 0) next.amount = 'Enter an amount greater than 0, like 25 or 25.50.';
    if (!givingId) next.giving = 'Choose what this gift is for.';
    if (!date) next.date = 'Enter a valid date.';
    setErrors(next);
    if (Object.keys(next).length > 0 || cents === null || !date) return;

    onSave(
      { date, personId, givingId, amountCents: cents, method, reference: method === 'check' ? reference.trim() : '', note: note.trim() },
      addAnother
    );
    if (addAnother) {
      // Keep date, giving and method; clear the rest for the next gift.
      setAmount('');
      setPersonId(null);
      setReference('');
      setNote('');
      setSavedCount((c) => c + 1);
    }
  }

  return (
    <FormModal
      visible
      title={isNew ? 'Record gift' : 'Edit gift'}
      onClose={onClose}
      footer={
        <>
          <Button title={isNew && savedCount > 0 ? 'Done' : 'Cancel'} variant="secondary" onPress={onClose} />
          {isNew ? <Button title="Save & add another" variant="secondary" onPress={() => submit(true)} /> : null}
          <Button title={isNew ? 'Save' : 'Save changes'} onPress={() => submit(false)} />
        </>
      }
    >
      {savedCount > 0 ? (
        <Text style={[styles.saved, { color: theme.primary }]}>
          {savedCount} {savedCount === 1 ? 'gift' : 'gifts'} saved. Enter the next one.
        </Text>
      ) : null}

      <PersonPicker
        people={data.people}
        value={personId}
        onChange={setPersonId}
        onQuickAdd={(name) => addPerson({ name, type: 'contributor', email: '', phone: '' })}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>Gift is for</Text>
      {givings.length === 0 ? (
        <Text style={[styles.note, { color: theme.danger }]}>
          No active giving opportunities. Add one in Settings first.
        </Text>
      ) : (
        <View style={styles.chips}>
          {givings.map((g) => (
            <Chip key={g.id} label={g.name} selected={givingId === g.id} onPress={() => setGivingId(g.id)} />
          ))}
        </View>
      )}
      {errors.giving ? <Text style={[styles.err, { color: theme.danger }]}>{errors.giving}</Text> : null}
      <View style={{ height: spacing.md }} />

      <TextField
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors.amount}
      />

      <DateField value={date} onChange={setDate} />
      {errors.date ? <Text style={[styles.err, { color: theme.danger }]}>{errors.date}</Text> : null}

      <Text style={[styles.label, { color: theme.textMuted }]}>Method</Text>
      <View style={styles.chips}>
        {PAYMENT_METHODS.map((m) => (
          <Chip key={m} label={METHOD_LABEL[m]} selected={method === m} onPress={() => setMethod(m)} />
        ))}
      </View>
      <View style={{ height: spacing.md }} />

      {method === 'check' ? (
        <TextField label="Check number (optional)" value={reference} onChangeText={setReference} placeholder="e.g. 1042" />
      ) : null}
      <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. In memory of..." />
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { fontSize: 13 },
  err: { fontSize: 12, marginTop: 4 },
  saved: { fontSize: 14, fontWeight: '600', marginBottom: spacing.md },
});
