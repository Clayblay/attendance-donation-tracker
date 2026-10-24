import React, { useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import FormModal from '@/components/FormModal';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import { buildStatementValues, renderTemplate } from '@/lib/letters';
import { buildStatementHtml, printHtml } from '@/lib/print';
import { useData } from '@/lib/store';
import { Person } from '@/lib/types';

type Props = { person: Person; year: number; onClose: () => void };

/** Preview, edit, print or send one donor's yearly giving statement. */
export default function StatementModal({ person, year, onClose }: Props) {
  const theme = useTheme();
  const { data, markStatementSent } = useData();

  const templates = data.templates.filter((t) => t.kind === 'statement');
  const values = buildStatementValues(person, year, data);
  const sent = !!data.statementsSent[`${person.id}:${year}`];

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const first = templates.find((t) => t.id === templateId);
  const [subject, setSubject] = useState(first ? renderTemplate(first.subject, values) : '');
  const [body, setBody] = useState(first ? renderTemplate(first.body, values) : '');
  const [status, setStatus] = useState<string | undefined>();

  function choose(id: string) {
    const t = templates.find((x) => x.id === id);
    setTemplateId(id);
    if (t) {
      setSubject(renderTemplate(t.subject, values));
      setBody(renderTemplate(t.body, values));
    }
    setStatus(undefined);
  }

  async function openEmail() {
    const to = person.email ? encodeURIComponent(person.email) : '';
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`;
    try {
      await Linking.openURL(url);
      setStatus('Opened your email app. Send it there, then tick "Statement sent" below.');
    } catch {
      setStatus('Could not open an email app on this device. Try Share, Copy or Print instead.');
    }
  }

  async function shareIt() {
    try {
      await Share.share({ title: subject, message: `${subject}\n\n${body}` });
    } catch {
      setStatus('Sharing is not available here. Try Email, Copy or Print instead.');
    }
  }

  async function copyIt() {
    try {
      const nav = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
      if (!nav?.clipboard) throw new Error('no clipboard');
      await nav.clipboard.writeText(`${subject}\n\n${body}`);
      setStatus('Copied. Paste it into your email or document.');
    } catch {
      setStatus('Copy is not available here. Select the text and copy it by hand.');
    }
  }

  async function printIt() {
    try {
      await printHtml(buildStatementHtml(data.orgName, subject, body));
      setStatus('In the print window you can choose a printer, or "Save as PDF" to keep a copy.');
    } catch {
      setStatus('Printing is not available here. Try Email, Share or Copy instead.');
    }
  }

  return (
    <FormModal
      visible
      title={`${year} giving statement`}
      onClose={onClose}
      footer={<Button title="Close" variant="secondary" onPress={onClose} />}
    >
      <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.md }}>
        {person.name} ({person.displayId}) · {values.gift_count} {values.gift_count === '1' ? 'gift' : 'gifts'} · {values.year_total}
        {person.email ? ` · ${person.email}` : ' · no email on file'}
      </Text>

      {templates.length === 0 ? (
        <Text style={{ color: theme.danger, marginBottom: spacing.md }}>
          You have no statement templates. Add one in Settings, then Letter templates.
        </Text>
      ) : (
        <>
          <Text style={[styles.label, { color: theme.textMuted }]}>Template</Text>
          <View style={styles.chips}>
            {templates.map((t) => (
              <Chip key={t.id} label={t.name} selected={templateId === t.id} onPress={() => choose(t.id)} />
            ))}
          </View>
          <View style={{ height: spacing.md }} />
        </>
      )}

      <TextField label="Title / email subject" value={subject} onChangeText={setSubject} />
      <TextField label="Statement (you can edit this before sending)" value={body} onChangeText={setBody} multiline />

      <View style={styles.chips}>
        <Button title="Print / PDF" icon="print-outline" onPress={printIt} />
        <Button title="Email" icon="mail-outline" variant="secondary" onPress={openEmail} />
        <Button title="Share" icon="share-outline" variant="secondary" onPress={shareIt} />
        {Platform.OS === 'web' ? <Button title="Copy" icon="copy-outline" variant="secondary" onPress={copyIt} /> : null}
      </View>

      {status ? <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.md }}>{status}</Text> : null}

      <View style={{ marginTop: spacing.md }}>
        <Chip
          label={sent ? 'Statement sent ✓' : 'Mark statement as sent'}
          selected={sent}
          onPress={() => markStatementSent(person.id, year, !sent)}
        />
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
