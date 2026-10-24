import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import FormModal from '@/components/FormModal';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import { fieldsFor, renderTemplate, sampleValues, unknownFields } from '@/lib/letters';
import { useData } from '@/lib/store';
import { LetterTemplate, LetterTemplateInput, TemplateKind } from '@/lib/types';

type Props = {
  kind: TemplateKind;
  /** null = a new template. */
  item: LetterTemplate | null;
  takenNames: string[];
  onSave: (input: LetterTemplateInput) => void;
  onClose: () => void;
};

type Sel = { start: number; end: number };

export default function TemplateForm({ kind, item, takenNames, onSave, onClose }: Props) {
  const theme = useTheme();
  const { data } = useData();
  const [name, setName] = useState(item?.name ?? '');
  const [subject, setSubject] = useState(item?.subject ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [target, setTarget] = useState<'body' | 'subject'>('body');
  const [sel, setSel] = useState<Sel>({ start: (item?.body ?? '').length, end: (item?.body ?? '').length });
  const [forcedSel, setForcedSel] = useState<Sel | undefined>();
  const [error, setError] = useState<string | undefined>();

  const sample = useMemo(() => sampleValues(data), [data]);
  const unknown = useMemo(() => unknownFields(`${subject}\n${body}`, kind), [subject, body, kind]);

  function insert(key: string) {
    const token = `{{${key}}}`;
    if (target === 'subject') {
      setSubject((s) => s + token);
      return;
    }
    const start = Math.min(sel.start, body.length);
    const end = Math.min(sel.end, body.length);
    setBody(body.slice(0, start) + token + body.slice(end));
    const pos = start + token.length;
    setSel({ start: pos, end: pos });
    setForcedSel({ start: pos, end: pos });
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError('Please give the template a name.');
    if (takenNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return setError('You already have a template with this name.');
    if (!subject.trim()) return setError('Please enter a subject line.');
    if (!body.trim()) return setError('Please write the letter.');
    setError(undefined);
    onSave({ name: trimmed, subject, body });
  }

  return (
    <FormModal
      visible
      title={`${item ? 'Edit' : 'Add'} ${kind === 'statement' ? 'statement' : 'thank-you'} template`}
      onClose={onClose}
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button title={item ? 'Save changes' : 'Add template'} onPress={submit} />
        </>
      }
    >
      <TextField label="Template name" value={name} onChangeText={setName} placeholder="e.g. Year-end thank-you" autoFocus />
      <TextField label="Email subject" value={subject} onChangeText={setSubject} placeholder="Thank you for your gift" />
      <TextField
        label="Letter"
        value={body}
        onChangeText={setBody}
        placeholder="Dear {{first_name}}, ..."
        multiline
        selection={forcedSel}
        onSelectionChange={(e) => {
          setSel(e.nativeEvent.selection);
          setForcedSel(undefined);
        }}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>Add a field (it fills in automatically)</Text>
      <View style={styles.chips}>
        <Chip label="Into the letter" selected={target === 'body'} onPress={() => setTarget('body')} />
        <Chip label="Into the subject" selected={target === 'subject'} onPress={() => setTarget('subject')} />
      </View>
      <View style={[styles.chips, { marginTop: spacing.sm }]}>
        {fieldsFor(kind).map((f) => (
          <Chip key={f.key} label={f.label} selected={false} onPress={() => insert(f.key)} />
        ))}
      </View>

      {unknown.length > 0 ? (
        <Text style={{ color: theme.danger, fontSize: 13, marginTop: spacing.sm }}>
          Not recognised, so it will show as typed: {unknown.join(', ')}
        </Text>
      ) : null}

      <Text style={[styles.label, { color: theme.textMuted, marginTop: spacing.md }]}>Preview with sample details</Text>
      <View style={[styles.preview, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Text style={{ color: theme.text, fontWeight: '700', marginBottom: spacing.sm }}>{renderTemplate(subject, sample) || ' '}</Text>
        <Text style={{ color: theme.text, lineHeight: 21 }}>{renderTemplate(body, sample) || ' '}</Text>
      </View>

      {error ? <Text style={{ color: theme.danger, fontSize: 13, marginTop: spacing.md }}>{error}</Text> : null}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: { borderWidth: 1, borderRadius: 12, padding: spacing.md },
});
