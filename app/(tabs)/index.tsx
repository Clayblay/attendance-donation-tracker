import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import GiftForm from '@/components/GiftForm';
import IdBadge from '@/components/IdBadge';
import ReportsModal from '@/components/ReportsModal';
import SendQueueModal from '@/components/SendQueueModal';
import Screen from '@/components/Screen';
import Widget from '@/components/Widget';
import { spacing, typeColor, useTheme } from '@/constants/theme';
import { totalAttendance } from '@/lib/attendance';
import { formatLong, monthKey, monthLabel, todayStr } from '@/lib/dates';
import { PERSON_TYPES, TYPE_LABEL_PLURAL } from '@/lib/ids';
import { formatMoney } from '@/lib/money';
import { isTodo } from '@/lib/notes';
import { sumCents, totalsByDonor, totalsByGiving } from '@/lib/stats';
import { useData } from '@/lib/store';
import { DashboardItemId, GiftInput, PaymentMethod } from '@/lib/types';

const DONOR_PREVIEW = 8;

function YearStepper({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.yearStepper}>
      <Pressable accessibilityLabel="Previous year" onPress={() => onChange(year - 1)} style={styles.arrow}>
        <Ionicons name="chevron-back" size={20} color={theme.primary} />
      </Pressable>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15, minWidth: 44, textAlign: 'center' }}>{year}</Text>
      <Pressable accessibilityLabel="Next year" onPress={() => onChange(year + 1)} style={styles.arrow}>
        <Ionicons name="chevron-forward" size={20} color={theme.primary} />
      </Pressable>
    </View>
  );
}

function Bar({ fraction, color }: { fraction: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.barTrack, { backgroundColor: theme.surfaceAlt }]}>
      <View style={{ width: `${Math.max(2, Math.round(fraction * 100))}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, addGift } = useData();

  const today = todayStr();
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [showAllDonors, setShowAllDonors] = useState(false);
  const [recording, setRecording] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [lastUsed, setLastUsed] = useState<{ date: string; givingId: string; method: PaymentMethod }>({
    date: today,
    givingId: '',
    method: 'cash',
  });

  const peopleById = useMemo(() => new Map(data.people.map((p) => [p.id, p])), [data.people]);
  const givingById = useMemo(() => new Map(data.givingOpportunities.map((g) => [g.id, g])), [data.givingOpportunities]);

  const lastAttendance = useMemo(
    () => [...data.attendance].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))[0],
    [data.attendance]
  );

  const needThanks = data.gifts.filter((g) => g.personId && !g.thankedAt && peopleById.has(g.personId)).length;
  const openTodos = data.notes.filter((n) => isTodo(n) && !n.done).length;
  const pinnedNotes = data.notes.filter((n) => n.pinned).length;

  // Widget 1: today
  const todays = useMemo(() => data.gifts.filter((g) => g.date === today), [data.gifts, today]);
  const todayTotal = sumCents(todays);
  const todayByGiving = useMemo(() => totalsByGiving(todays), [todays]);
  const monthTotal = useMemo(
    () => sumCents(data.gifts.filter((g) => monthKey(g.date) === monthKey(today))),
    [data.gifts, today]
  );

  // Widgets 2 and 3: the chosen year
  const yearGifts = useMemo(() => data.gifts.filter((g) => g.date.startsWith(`${year}-`)), [data.gifts, year]);
  const yearTotal = sumCents(yearGifts);
  const givingRows = useMemo(() => totalsByGiving(yearGifts), [yearGifts]);
  const donorRows = useMemo(() => totalsByDonor(yearGifts, peopleById), [yearGifts, peopleById]);
  const maxGiving = givingRows[0]?.cents ?? 1;
  const maxDonor = Math.max(1, ...donorRows.filter((d) => !d.anonymous).map((d) => d.cents));
  const yearWord = year === thisYear ? 'Year to date' : 'Full year';
  const shownDonors = showAllDonors ? donorRows : donorRows.slice(0, DONOR_PREVIEW);

  const layout = data.settings.dashboard.filter((i) => i.visible);

  function save(input: GiftInput, addAnother: boolean) {
    addGift(input);
    setLastUsed({ date: input.date, givingId: input.givingId, method: input.method });
    if (!addAnother) setRecording(false);
  }

  const empty = (text: string) => <Text style={{ color: theme.textMuted, fontSize: 14 }}>{text}</Text>;

  function renderItem(id: DashboardItemId): React.ReactNode {
    switch (id) {
      case 'shortcuts':
        return (
          <View style={styles.shortcuts}>
            <Button title="Reports" icon="bar-chart-outline" variant="secondary" onPress={() => setReportsOpen(true)} />
            <Button title="Giving statements" icon="reader-outline" variant="secondary" onPress={() => router.push('/statements')} />
            <Button title={`Send thank-yous${needThanks ? ` (${needThanks})` : ''}`} icon="mail-outline" variant="secondary" onPress={() => setQueueOpen(true)} />
          </View>
        );

      case 'people':
        return (
          <View style={styles.stats}>
            {PERSON_TYPES.map((t) => (
              <View key={t} style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.statNumber, { color: typeColor(theme, t) }]}>
                  {data.people.filter((p) => p.type === t).length}
                </Text>
                <Text style={{ color: theme.textMuted }}>{TYPE_LABEL_PLURAL[t]}</Text>
              </View>
            ))}
          </View>
        );

      case 'lastAttendance':
        return (
          <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="checkbox-outline" size={26} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>Last attendance</Text>
              <Text style={{ color: theme.text, fontWeight: '600' }} numberOfLines={1}>
                {lastAttendance
                  ? `${data.eventTypes.find((e) => e.id === lastAttendance.eventTypeId)?.name ?? 'Event'} · ${formatLong(lastAttendance.date)}`
                  : 'None recorded yet'}
              </Text>
            </View>
            {lastAttendance ? (
              <Text style={{ color: theme.primary, fontSize: 28, fontWeight: '700' }}>{totalAttendance(lastAttendance)}</Text>
            ) : null}
          </View>
        );

      case 'notes':
        return (
          <Pressable
            onPress={() => router.push('/notes')}
            style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Ionicons name="document-text-outline" size={26} color={theme.gold} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>Notes</Text>
              <Text style={{ color: theme.text, fontWeight: '600' }}>
                {data.notes.length === 0
                  ? 'No notes yet. Tap to add one.'
                  : `${openTodos} open to-do${openTodos === 1 ? '' : 's'} · ${pinnedNotes} pinned`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </Pressable>
        );

      case 'today':
        return (
          <Widget number={1} title="Today's giving" subtitle={today}>
            <Text style={[styles.big, { color: theme.primary }]}>{formatMoney(todayTotal)}</Text>
            <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
              {todays.length} {todays.length === 1 ? 'gift' : 'gifts'} today
            </Text>
            {todayByGiving.length === 0
              ? empty('No gifts recorded today yet.')
              : todayByGiving.map((r) => (
                  <View key={r.givingId} style={styles.lineRow}>
                    <Text style={[styles.lineName, { color: theme.text }]} numberOfLines={1}>
                      {givingById.get(r.givingId)?.name ?? 'Unknown'}
                    </Text>
                    <Text style={{ color: theme.text, fontWeight: '600' }}>{formatMoney(r.cents)}</Text>
                  </View>
                ))}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.lineRow}>
              <Text style={{ color: theme.textMuted, flex: 1 }}>{monthLabel(monthKey(today))} so far</Text>
              <Text style={{ color: theme.text, fontWeight: '600' }}>{formatMoney(monthTotal)}</Text>
            </View>
          </Widget>
        );

      case 'byOccasion':
        return (
          <Widget
            number={2}
            title="Giving by occasion"
            subtitle={`${yearWord} ${year}`}
            headerRight={<YearStepper year={year} onChange={setYear} />}
          >
            <Text style={[styles.big, { color: theme.primary }]}>{formatMoney(yearTotal)}</Text>
            <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
              {yearGifts.length} {yearGifts.length === 1 ? 'gift' : 'gifts'} in {year}
            </Text>
            {givingRows.length === 0
              ? empty(`No gifts recorded in ${year}.`)
              : givingRows.map((r) => (
                  <View key={r.givingId} style={styles.barRow}>
                    <View style={styles.lineRow}>
                      <Text style={[styles.lineName, { color: theme.text }]} numberOfLines={1}>
                        {givingById.get(r.givingId)?.name ?? 'Unknown'}
                      </Text>
                      <Text style={{ color: theme.text, fontWeight: '600' }}>{formatMoney(r.cents)}</Text>
                    </View>
                    <Bar fraction={r.cents / maxGiving} color={theme.primary} />
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                      {Math.round((r.cents / yearTotal) * 100)}% · {r.count} {r.count === 1 ? 'gift' : 'gifts'}
                    </Text>
                  </View>
                ))}
          </Widget>
        );

      case 'byDonor':
        return (
          <Widget
            number={3}
            title="Giving by donor"
            subtitle={`${yearWord} ${year}`}
            full
            headerRight={<YearStepper year={year} onChange={setYear} />}
          >
            {donorRows.length === 0
              ? empty(`No gifts recorded in ${year}.`)
              : shownDonors.map((d) => {
                  const person = d.personId ? peopleById.get(d.personId) : undefined;
                  return (
                    <View key={d.key} style={styles.donorRow}>
                      <View style={styles.donorTop}>
                        {person ? <IdBadge displayId={person.displayId} type={person.type} /> : null}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.lineName, { color: theme.text }]} numberOfLines={1}>{d.label}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                            {d.count} {d.count === 1 ? 'gift' : 'gifts'}
                          </Text>
                        </View>
                        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{formatMoney(d.cents)}</Text>
                      </View>
                      {!d.anonymous ? <Bar fraction={d.cents / maxDonor} color={theme.gold} /> : null}
                    </View>
                  );
                })}
            {donorRows.length > DONOR_PREVIEW ? (
              <Pressable onPress={() => setShowAllDonors((v) => !v)} style={styles.more}>
                <Text style={{ color: theme.primary, fontWeight: '600' }}>
                  {showAllDonors ? 'Show fewer' : `Show all ${donorRows.length} donors`}
                </Text>
              </Pressable>
            ) : null}
          </Widget>
        );
    }
  }

  return (
    <Screen
      title="Dashboard"
      subtitle={data.orgName || 'Your attendance and donations at a glance'}
      headerRight={<Button title="Record gift" icon="add" onPress={() => setRecording(true)} />}
    >
      {!data.orgName ? (
        <Pressable
          onPress={() => router.push('/settings')}
          style={[styles.banner, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
        >
          <Text style={{ color: theme.text, fontWeight: '600' }}>Set your organization name</Text>
          <Text style={{ color: theme.textMuted }}>Go to Settings to add it.</Text>
        </Pressable>
      ) : null}

      <View style={styles.grid}>
        {layout.map((item) => (
          <View key={item.id} style={item.id === 'today' || item.id === 'byOccasion' ? styles.gridWidget : styles.gridFull}>
            {renderItem(item.id)}
          </View>
        ))}
      </View>

      {layout.length === 0 ? (
        <View style={[styles.banner, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>Everything on the Dashboard is hidden</Text>
          <Text style={{ color: theme.textMuted }}>Go to Settings, then Dashboard layout, to show sections again.</Text>
        </View>
      ) : null}

      {reportsOpen ? <ReportsModal onClose={() => setReportsOpen(false)} /> : null}
      {queueOpen ? <SendQueueModal kind="thankyou" onClose={() => setQueueOpen(false)} /> : null}

      {recording ? (
        <GiftForm gift={null} defaults={lastUsed} onSave={save} onClose={() => setRecording(false)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { borderWidth: 1, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridFull: { flexBasis: '100%', flexGrow: 1 },
  gridWidget: { flexBasis: 320, flexGrow: 1, flexDirection: 'row' },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: 160, borderWidth: 1, borderRadius: 16, padding: spacing.md },
  statNumber: { fontSize: 32, fontWeight: '700' },
  tile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 16, padding: spacing.md },
  yearStepper: { flexDirection: 'row', alignItems: 'center' },
  arrow: { padding: 4 },
  big: { fontSize: 36, fontWeight: '700' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 3 },
  lineName: { flex: 1, fontSize: 15, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  barRow: { marginBottom: spacing.md, gap: 4 },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  donorRow: { marginBottom: spacing.md, gap: 6 },
  donorTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  more: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
});
