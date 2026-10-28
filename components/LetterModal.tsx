import React, { useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import FormModal from '@/components/FormModal';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import EmailAppPicker from '@/components/EmailAppPicker';
import { buildGiftValues, renderTemplate } from '@/lib/letters';
import { buildMailUrl, openedMessage } from '@/lib/mail';
import { useData } from '@/lib/store';
import { Gift } from '@/lib/types';

type Props = { gift: Gift; onClose: () => void };

/** Write, preview and send a thank-you letter for one gift. */
export default function LetterModal({ gift, onClose }: Props) {
  const theme = useTheme();
  const { data, markGiftThanked } = useData();

  const person = gift.personId ? data.people.find((p) => p.id === gift.personId) : undefined;
  const live = data.gifts.find((g) => g.id === gift.id) ?? gift;
  const thanked = !!live.thankedAt;
  const templates = data.templates.filter((t) => t.kind === 'thankyou');
  const values = buildGiftValues(gift, data);

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const initial = templates.find((t) => t.id === templateId);
  const [subject, setSubject] = useState(initial ? renderTemplate(initial.subject, values) : '');
  const [body, setBody] = useState(initial ? renderTemplate(initial.body, values) : '');
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
    const url = buildMailUrl(data.settings.emailApp, person?.email ?? '', subject, body);
    try {
      await Linking.openURL(url);
      setStatus(`${openedMessage(data.settings.emailApp)} Then tick "Thank-you sent" below.`);
    } catch {
      setStatus('Could not open an email app on this device. Try Share or Copy instead.');
    }
  }

  async function shareIt() {
    try {
      await Share.share({ title: subject, message: `${subject}\n\n${body}` });
    } catch {
      setStatus('Sharing is not available here. Try Email or Copy instead.');
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

  return (
    <FormModal visible title="Thank-you letter" onClose={onClose} footer={<Button title="Close" variant="secondary" onPress={onClose} />}>
      <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.md }}>
        To: {person ? `${person.name} (${person.displayId})` : values.donor_name}
        {person?.email ? ` · ${person.email}` : ' · no email on file'}
      </Text>

      {templates.length === 0 ? (
        <Text style={{ color: theme.danger, marginBottom: spacing.md }}>
          You have no letter templates. Add one in Settings, then Letter templates.
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

      <TextField label="Subject" value={subject} onChangeText={setSubject} />
      <TextField label="Letter (you can edit this before sending)" value={body} onChangeText={setBody} multiline />

      <EmailAppPicker />
      <View style={styles.chips}>
        <Button title="Email" icon="mail-outline" onPress={openEmail} />
        <Button title="Share" icon="share-outline" variant="secondary" onPress={shareIt} />
        {Platform.OS === 'web' ? <Button title="Copy" icon="copy-outline" variant="secondary" onPress={copyIt} /> : null}
      </View>

      {status ? <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.md }}>{status}</Text> : null}

      <View style={{ marginTop: spacing.md }}>
        <Chip
          label={thanked ? 'Thank-you sent ✓' : 'Mark thank-you as sent'}
          selected={thanked}
          onPress={() => markGiftThanked(gift.id, !thanked)}
        />
      </View>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
