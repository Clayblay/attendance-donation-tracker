import React, { useMemo, useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import FormModal from '@/components/FormModal';
import IdBadge from '@/components/IdBadge';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import EmailAppPicker from '@/components/EmailAppPicker';
import { buildGiftValues, buildStatementValues, renderTemplate } from '@/lib/letters';
import { buildMailUrl, openedMessage } from '@/lib/mail';
import { formatMoney } from '@/lib/money';
import { buildStatementHtml, printHtml } from '@/lib/print';
import { Preset, presetRange } from '@/lib/reports';
import { useData } from '@/lib/store';
import { Gift, LetterTemplate, Person } from '@/lib/types';

type Kind = 'thankyou' | 'statement';
type Item = { id: string; person: Person; gift?: Gift };
type EmailFilter = 'withEmail' | 'noEmail' | 'all';

type Props = { kind: Kind; year?: number; onClose: () => void };

const PERIODS: { id: Preset; label: string }[] = [
  { id: 'all', label: 'All unsent' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'thisYear', label: 'This year' },
];

/** One letter, ready to edit and send. Keyed by item so it resets for each person. */
function QueueCard({
  item,
  kind,
  year,
  template,
  onSent,
  onSkip,
}: {
  item: Item;
  kind: Kind;
  year: number;
  template: LetterTemplate | undefined;
  onSent: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const { data } = useData();
  const values = useMemo(
    () => (kind === 'thankyou' && item.gift ? buildGiftValues(item.gift, data) : buildStatementValues(item.person, year, data)),
    [kind, item, year, data]
  );
  const [subject, setSubject] = useState(template ? renderTemplate(template.subject, values) : '');
  const [body, setBody] = useState(template ? renderTemplate(template.body, values) : '');
  const [status, setStatus] = useState<string | undefined>();
  const email = item.person.email;

  async function openEmail() {
    const url = buildMailUrl(data.settings.emailApp, email, subject, body);
    try {
      await Linking.openURL(url);
      setStatus(`${openedMessage(data.settings.emailApp)} Then tap "Mark sent & next" here.`);
    } catch {
      setStatus('Could not open an email app. Try Share or Copy instead.');
    }
  }
  async function shareIt() {
    try {
      await Share.share({ title: subject, message: `${subject}\n\n${body}` });
    } catch {
      setStatus('Sharing is not available here.');
    }
  }
  async function copyIt() {
    try {
      const nav = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
      if (!nav?.clipboard) throw new Error('no clipboard');
      await nav.clipboard.writeText(`${subject}\n\n${body}`);
      setStatus('Copied.');
    } catch {
      setStatus('Copy is not available here.');
    }
  }
  async function printIt() {
    try {
      await printHtml(buildStatementHtml(data.orgName, subject, body));
      setStatus('Choose a printer, or "Save as PDF" to keep a copy.');
    } catch {
      setStatus('Printing is not available here.');
    }
  }

  return (
    <View>
      <View style={styles.who}>
        <IdBadge displayId={item.person.displayId} type={item.person.type} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{item.person.name}</Text>
          <Text style={{ color: email ? theme.textMuted : theme.danger, fontSize: 13 }}>
            {email || 'No email on file'}
            {kind === 'thankyou' && item.gift ? ` · ${formatMoney(item.gift.amountCents)}` : ` · ${values.gift_count} gifts · ${values.year_total}`}
          </Text>
        </View>
      </View>

      <TextField label="Subject" value={subject} onChangeText={setSubject} />
      <TextField label="Letter (you can edit it)" value={body} onChangeText={setBody} multiline />

      <EmailAppPicker />
      <View style={styles.row}>
        <Button title="Open email" icon="mail-outline" onPress={openEmail} />
        <Button title="Share" icon="share-outline" variant="secondary" onPress={shareIt} />
        {Platform.OS === 'web' ? <Button title="Copy" icon="copy-outline" variant="secondary" onPress={copyIt} /> : null}
        {kind === 'statement' ? <Button title="Print / PDF" icon="print-outline" variant="secondary" onPress={printIt} /> : null}
      </View>
      {status ? <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.sm }}>{status}</Text> : null}

      <View style={[styles.row, { marginTop: spacing.lg }]}>
        <Button title="Mark sent & next" icon="checkmark" onPress={onSent} />
        <Button title="Skip" variant="secondary" onPress={onSkip} />
      </View>
    </View>
  );
}

/** Step through everyone who still needs a thank-you letter or yearly statement. */
export default function SendQueueModal({ kind, year, onClose }: Props) {
  const theme = useTheme();
  const { data, markGiftThanked, markStatementSent } = useData();
  const statementYear = year ?? new Date().getFullYear();

  const templates = data.templates.filter((t) => t.kind === kind);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const template = templates.find((t) => t.id === templateId) ?? templates[0];

  const [period, setPeriod] = useState<Preset>('all');
  const [emailFilter, setEmailFilter] = useState<EmailFilter>('withEmail');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [sentCount, setSentCount] = useState(0);
  const [last, setLast] = useState<{ item: Item } | null>(null);

  const all = useMemo<Item[]>(() => {
    const byId = new Map(data.people.map((p) => [p.id, p]));
    if (kind === 'thankyou') {
      const range = presetRange(period);
      return data.gifts
        .filter((g) => g.personId && !g.thankedAt && byId.has(g.personId) && (!range || (g.date >= range.start && g.date <= range.end)))
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
        .map((g) => ({ id: g.id, person: byId.get(g.personId as string) as Person, gift: g }));
    }
    const ids = new Set(data.gifts.filter((g) => g.personId && g.date.startsWith(`${statementYear}-`)).map((g) => g.personId as string));
    return Array.from(ids)
      .filter((id) => byId.has(id) && !data.statementsSent[`${id}:${statementYear}`])
      .map((id) => ({ id, person: byId.get(id) as Person }))
      .sort((a, b) => a.person.name.localeCompare(b.person.name));
  }, [data, kind, period, statementYear]);

  const open = all.filter((i) => !skipped.has(i.id));
  const withEmail = open.filter((i) => !!i.person.email).length;
  const noEmail = open.length - withEmail;
  const queue = open.filter((i) => (emailFilter === 'all' ? true : emailFilter === 'withEmail' ? !!i.person.email : !i.person.email));
  const current = queue[0];

  const done = sentCount + skipped.size;
  const noun = kind === 'thankyou' ? 'Thank-you letters' : `${statementYear} statements`;

  function markSent(item: Item) {
    if (kind === 'thankyou') markGiftThanked(item.id, true);
    else markStatementSent(item.person.id, statementYear, true);
    setSentCount((n) => n + 1);
    setLast({ item });
  }

  function undo() {
    if (!last) return;
    if (kind === 'thankyou') markGiftThanked(last.item.id, false);
    else markStatementSent(last.item.person.id, statementYear, false);
    setSentCount((n) => Math.max(0, n - 1));
    setLast(null);
  }

  return (
    <FormModal
      visible
      wide
      title={noun}
      onClose={onClose}
      footer={<Button title="Close" variant="secondary" onPress={onClose} />}
    >
      <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.md }}>
        {current
          ? `${done + 1} of ${done + queue.length} · ${sentCount} sent${skipped.size ? `, ${skipped.size} skipped` : ''}`
          : `${sentCount} sent${skipped.size ? `, ${skipped.size} skipped` : ''}`}
      </Text>

      {templates.length > 1 ? (
        <>
          <Text style={[styles.label, { color: theme.textMuted }]}>Template</Text>
          <View style={styles.row}>
            {templates.map((t) => (
              <Chip key={t.id} label={t.name} selected={template?.id === t.id} onPress={() => setTemplateId(t.id)} />
            ))}
          </View>
          <View style={{ height: spacing.md }} />
        </>
      ) : null}

      {kind === 'thankyou' ? (
        <>
          <Text style={[styles.label, { color: theme.textMuted }]}>Gifts from</Text>
          <View style={styles.row}>
            {PERIODS.map((p) => (
              <Chip key={p.id} label={p.label} selected={period === p.id} onPress={() => setPeriod(p.id)} />
            ))}
          </View>
          <View style={{ height: spacing.md }} />
        </>
      ) : null}

      <Text style={[styles.label, { color: theme.textMuted }]}>Show</Text>
      <View style={styles.row}>
        <Chip label={`With email (${withEmail})`} selected={emailFilter === 'withEmail'} onPress={() => setEmailFilter('withEmail')} />
        <Chip label={`No email (${noEmail})`} selected={emailFilter === 'noEmail'} onPress={() => setEmailFilter('noEmail')} />
        <Chip label={`All (${open.length})`} selected={emailFilter === 'all'} onPress={() => setEmailFilter('all')} />
      </View>
      <View style={{ height: spacing.lg }} />

      {templates.length === 0 ? (
        <Text style={{ color: theme.danger }}>
          You have no {kind === 'thankyou' ? 'thank-you' : 'statement'} templates. Add one in Settings, then Letter templates.
        </Text>
      ) : current ? (
        <QueueCard
          key={current.id}
          item={current}
          kind={kind}
          year={statementYear}
          template={template}
          onSent={() => markSent(current)}
          onSkip={() => setSkipped((s) => new Set(s).add(current.id))}
        />
      ) : (
        <View style={[styles.doneBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
            {open.length === 0 ? 'All caught up!' : 'Nothing to show with this filter'}
          </Text>
          <Text style={{ color: theme.textMuted, marginTop: spacing.xs }}>
            {open.length === 0
              ? `${sentCount} sent${skipped.size ? `, ${skipped.size} skipped` : ''}.`
              : `${open.length} still waiting. Choose "All" or "No email" above to see them.`}
          </Text>
          {skipped.size > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <Button title={`Bring back the ${skipped.size} skipped`} variant="secondary" onPress={() => setSkipped(new Set())} />
            </View>
          ) : null}
        </View>
      )}

      {last ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title={`Undo: mark ${last.item.person.name} as not sent`} variant="ghost" onPress={undo} />
        </View>
      ) : null}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  doneBox: { borderWidth: 1, borderRadius: 14, padding: spacing.lg },
});
