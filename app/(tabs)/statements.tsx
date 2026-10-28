import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import SendQueueModal from '@/components/SendQueueModal';
import IdBadge from '@/components/IdBadge';
import Screen from '@/components/Screen';
import StatementModal from '@/components/StatementModal';
import { spacing, useTheme } from '@/constants/theme';
import { todayStr } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { sumCents, totalsByDonor } from '@/lib/stats';
import { useData } from '@/lib/store';
import { Person } from '@/lib/types';

type Filter = 'all' | 'unsent' | 'sent';

export default function StatementsScreen() {
  const theme = useTheme();
  const { data } = useData();
  const thisYear = Number(todayStr().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Person | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);

  const peopleById = useMemo(() => new Map(data.people.map((p) => [p.id, p])), [data.people]);
  const yearGifts = useMemo(() => data.gifts.filter((g) => g.date.startsWith(`${year}-`)), [data.gifts, year]);

  const rows = useMemo(
    () =>
      totalsByDonor(yearGifts, peopleById)
        .filter((d) => d.personId !== null)
        .map((d) => ({ ...d, person: peopleById.get(d.personId as string) as Person }))
        .filter((d) => d.person),
    [yearGifts, peopleById]
  );

  const isSent = (id: string) => !!data.statementsSent[`${id}:${year}`];
  const sentCount = rows.filter((r) => isSent(r.person.id)).length;
  const anonymous = sumCents(yearGifts.filter((g) => !g.personId));

  const q = query.trim().toLowerCase();
  const visible = rows
    .filter((r) => filter === 'all' || (filter === 'sent' ? isSent(r.person.id) : !isSent(r.person.id)))
    .filter((r) => !q || r.person.name.toLowerCase().includes(q) || r.person.displayId.toLowerCase().includes(q))
    .sort((a, b) => a.person.name.localeCompare(b.person.name));

  return (
    <Screen
      title="Giving statements"
      subtitle="A yearly summary of each donor's gifts"
      back={{ label: 'Settings', to: '/settings' }}
      headerRight={<Button title={rows.length - sentCount > 0 ? `Send statements (${rows.length - sentCount})` : 'Send statements'} icon="mail-outline" disabled={rows.length - sentCount === 0} onPress={() => setQueueOpen(true)} />}
    >
      <View style={styles.yearRow}>
        <Pressable accessibilityLabel="Previous year" onPress={() => setYear(year - 1)} style={styles.arrow}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </Pressable>
        <Text style={[styles.year, { color: theme.text }]}>{year}</Text>
        <Pressable accessibilityLabel="Next year" onPress={() => setYear(year + 1)} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={24} color={theme.primary} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Text style={{ color: theme.textMuted }}>
          {rows.length} {rows.length === 1 ? 'donor' : 'donors'} · {sentCount} sent
        </Text>
      </View>

      <View style={[styles.search, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or ID"
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      {rows.length > 0 && rows.length === sentCount ? (
        <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.md }}>
          All {year} statements are marked as sent, so there is nothing left to send.
        </Text>
      ) : null}

      <View style={styles.chips}>
        <Chip label={`All (${rows.length})`} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`Not sent (${rows.length - sentCount})`} selected={filter === 'unsent'} onPress={() => setFilter('unsent')} />
        <Chip label={`Sent (${sentCount})`} selected={filter === 'sent'} onPress={() => setFilter('sent')} />
      </View>

      {rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="reader-outline" size={44} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No donors with gifts in {year}</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            Statements are made for named donors. Record gifts with a donor selected, or try another year.
          </Text>
        </View>
      ) : visible.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No matches</Text>
        </View>
      ) : (
        <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {visible.map((r, i) => (
            <Pressable
              key={r.key}
              onPress={() => setOpen(r.person)}
              style={({ pressed }) => [
                styles.row,
                i < visible.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <IdBadge displayId={r.person.displayId} type={r.person.type} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{r.person.name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }} numberOfLines={1}>
                  {r.count} {r.count === 1 ? 'gift' : 'gifts'} · {r.person.email || 'no email on file'}
                  {isSent(r.person.id) ? ' · Sent ✓' : ''}
                </Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{formatMoney(r.cents)}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {anonymous > 0 ? (
        <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.md }}>
          {formatMoney(anonymous)} in {year} was given anonymously, so it is not on any statement.
        </Text>
      ) : null}
      <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.sm }}>
        Statements show what you have recorded. If you need tax wording for receipts, add it to the template under Settings, then Letter templates.
      </Text>

      {queueOpen ? <SendQueueModal kind="statement" year={year} onClose={() => setQueueOpen(false)} /> : null}

      {open ? <StatementModal person={open} year={year} onClose={() => setOpen(null)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  arrow: { padding: 6 },
  year: { fontSize: 22, fontWeight: '700', minWidth: 64, textAlign: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: spacing.md },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  list: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderWidth: 1, borderRadius: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyBody: { fontSize: 14, textAlign: 'center', maxWidth: 360 },
});
