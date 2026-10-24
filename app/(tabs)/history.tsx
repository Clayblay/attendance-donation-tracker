import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '@/components/Button';
import Calendar from '@/components/Calendar';
import FormModal from '@/components/FormModal';
import Chip from '@/components/Chip';
import ConfirmDialog from '@/components/ConfirmDialog';
import GiftForm from '@/components/GiftForm';
import LetterModal from '@/components/LetterModal';
import IdBadge from '@/components/IdBadge';
import NoteButton from '@/components/NoteButton';
import NotesHost from '@/components/NotesHost';
import Screen from '@/components/Screen';
import { spacing, useTheme } from '@/constants/theme';
import { currentMonthKey, formatLong, monthKey, monthLabel, shiftMonth, todayStr } from '@/lib/dates';
import { METHOD_LABEL } from '@/lib/gifts';
import { formatMoney } from '@/lib/money';
import { countNotes } from '@/lib/notes';
import { useData } from '@/lib/store';
import { Gift, GiftInput, PaymentMethod } from '@/lib/types';

export default function HistoryScreen() {
  const theme = useTheme();
  const { data, addGift, updateGift, deleteGift } = useData();

  const [month, setMonth] = useState<string | null>(currentMonthKey()); // null = all time
  const [day, setDay] = useState<string | null>(null); // a single chosen date
  const [pickingDate, setPickingDate] = useState(false);
  const [givingFilter, setGivingFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Gift | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Gift | null>(null);
  const [notesFor, setNotesFor] = useState<Gift | null>(null);
  const [letterFor, setLetterFor] = useState<Gift | null>(null);
  const [needsThanks, setNeedsThanks] = useState(false);
  const [lastUsed, setLastUsed] = useState<{ date: string; givingId: string; method: PaymentMethod }>({
    date: todayStr(),
    givingId: '',
    method: 'cash',
  });

  const peopleById = useMemo(() => new Map(data.people.map((p) => [p.id, p])), [data.people]);
  const givingById = useMemo(() => new Map(data.givingOpportunities.map((g) => [g.id, g])), [data.givingOpportunities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.gifts
      .filter((g) => (day !== null ? g.date === day : month === null || monthKey(g.date) === month))
      .filter((g) => givingFilter === null || g.givingId === givingFilter)
      .filter((g) => !needsThanks || (g.personId !== null && !g.thankedAt))
      .filter((g) => {
        if (!q) return true;
        const p = g.personId ? peopleById.get(g.personId) : undefined;
        const hay = [p?.name, p?.displayId, g.donorLabel, g.note, g.reference].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  }, [data.gifts, month, day, givingFilter, needsThanks, query, peopleById]);

  // Group by day and add up each day automatically.
  const days = useMemo(() => {
    const map = new Map<string, Gift[]>();
    filtered.forEach((g) => map.set(g.date, [...(map.get(g.date) ?? []), g]));
    return Array.from(map.entries()).map(([date, gifts]) => {
      const byGiving = new Map<string, number>();
      gifts.forEach((g) => byGiving.set(g.givingId, (byGiving.get(g.givingId) ?? 0) + g.amountCents));
      return {
        date,
        gifts,
        total: gifts.reduce((s, g) => s + g.amountCents, 0),
        breakdown: Array.from(byGiving.entries()).map(([id, cents]) => `${givingById.get(id)?.name ?? 'Unknown'} ${formatMoney(cents)}`),
      };
    });
  }, [filtered, givingById]);

  const giftDates = useMemo(() => new Set(data.gifts.map((g) => g.date)), [data.gifts]);
  const grandTotal = filtered.reduce((s, g) => s + g.amountCents, 0);

  function save(input: GiftInput, addAnother: boolean) {
    if (editing === 'new') addGift(input);
    else if (editing) updateGift(editing.id, input);
    setLastUsed({ date: input.date, givingId: input.givingId, method: input.method });
    // Make sure the gift you just saved is visible: jump to its day/month and clear filters hiding it.
    if (day !== null) setDay(input.date);
    else if (month !== null) setMonth(monthKey(input.date));
    if (givingFilter !== null && givingFilter !== input.givingId) setGivingFilter(null);
    setQuery('');
    if (!addAnother) setEditing(null);
  }

  return (
    <Screen
      title="History"
      subtitle="Recorded gifts, added up for you"
      headerRight={<Button title="Record gift" icon="add" onPress={() => setEditing('new')} />}
    >
      <View style={styles.monthRow}>
        {day !== null ? (
          <>
            <Text style={[styles.monthLabel, { color: theme.text }]}>{formatLong(day)}</Text>
            <View style={{ flex: 1 }} />
            <Chip label="Clear date" selected={false} onPress={() => setDay(null)} />
          </>
        ) : (
          <>
            {month !== null ? (
              <>
                <Pressable accessibilityLabel="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} style={styles.arrow}>
                  <Ionicons name="chevron-back" size={24} color={theme.primary} />
                </Pressable>
                <Text style={[styles.monthLabel, { color: theme.text }]}>{monthLabel(month)}</Text>
                <Pressable accessibilityLabel="Next month" onPress={() => setMonth(shiftMonth(month, 1))} style={styles.arrow}>
                  <Ionicons name="chevron-forward" size={24} color={theme.primary} />
                </Pressable>
              </>
            ) : (
              <Text style={[styles.monthLabel, { color: theme.text }]}>All time</Text>
            )}
            <View style={{ flex: 1 }} />
            <Chip
              label={month === null ? 'By month' : 'All time'}
              selected={false}
              onPress={() => setMonth(month === null ? currentMonthKey() : null)}
            />
          </>
        )}
        <Pressable accessibilityLabel="Pick a date" onPress={() => setPickingDate(true)} style={styles.arrow}>
          <Ionicons name={day !== null ? 'calendar' : 'calendar-outline'} size={26} color={theme.primary} />
        </Pressable>
      </View>

      <View style={[styles.total, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted }}>
          {day !== null ? `Total for ${formatLong(day)}` : month === null ? 'Total, all time' : `Total for ${monthLabel(month)}`} · {filtered.length}{' '}
          {filtered.length === 1 ? 'gift' : 'gifts'}
        </Text>
        <Text style={[styles.totalAmount, { color: theme.primary }]}>{formatMoney(grandTotal)}</Text>
      </View>

      <View style={styles.chips}>
        <Chip label="All giving" selected={givingFilter === null} onPress={() => setGivingFilter(null)} />
        {data.givingOpportunities.map((g) => (
          <Chip key={g.id} label={g.name} selected={givingFilter === g.id} onPress={() => setGivingFilter(g.id)} />
        ))}
        <Chip label="Needs thank-you" selected={needsThanks} color={theme.gold} onPress={() => setNeedsThanks((v) => !v)} />
      </View>

      <View style={[styles.search, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search donor, ID, note or check number"
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {query ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {days.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="time-outline" size={44} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {data.gifts.length === 0 ? 'No gifts recorded yet' : 'No gifts match'}
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            {data.gifts.length === 0
              ? 'Record your first gift and it will show up here with daily totals.'
              : 'Try another month, filter or search.'}
          </Text>
          {data.gifts.length === 0 ? <Button title="Record gift" icon="add" onPress={() => setEditing('new')} /> : null}
        </View>
      ) : (
        days.map((day) => (
          <View key={day.date} style={[styles.dayCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.dayHeader, { backgroundColor: theme.surfaceAlt }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dayTitle, { color: theme.text }]}>{formatLong(day.date)}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }} numberOfLines={2}>
                  {day.gifts.length} {day.gifts.length === 1 ? 'gift' : 'gifts'} · {day.breakdown.join(' · ')}
                </Text>
              </View>
              <Text style={[styles.dayTotal, { color: theme.primary }]}>{formatMoney(day.total)}</Text>
            </View>
            {day.gifts.map((g, i) => {
              const p = g.personId ? peopleById.get(g.personId) : undefined;
              const donor = p ? p.name : g.donorLabel || 'Anonymous';
              const details = [
                givingById.get(g.givingId)?.name ?? 'Unknown',
                METHOD_LABEL[g.method] + (g.reference ? ` #${g.reference}` : ''),
                g.thankedAt ? 'Thanked ✓' : null,
                g.note,
              ].filter(Boolean).join('  ·  ');
              return (
                <View
                  key={g.id}
                  style={[styles.row, i < day.gifts.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
                >
                  <Text style={[styles.amount, { color: theme.text }]}>{formatMoney(g.amountCents)}</Text>
                  <View style={styles.rowText}>
                    <View style={styles.donorLine}>
                      {p ? <IdBadge displayId={p.displayId} type={p.type} /> : null}
                      <Text style={[styles.donor, { color: theme.text }]} numberOfLines={1}>{donor}</Text>
                    </View>
                    <Text style={[styles.details, { color: theme.textMuted }]} numberOfLines={2}>{details}</Text>
                  </View>
                  {p ? (
                    <Pressable accessibilityLabel="Thank-you letter" onPress={() => setLetterFor(g)} style={styles.iconBtn}>
                      <Ionicons name={g.thankedAt ? 'mail' : 'mail-outline'} size={22} color={theme.primary} />
                    </Pressable>
                  ) : null}
                  <NoteButton count={countNotes(data, 'gift', g.id)} onPress={() => setNotesFor(g)} />
                  <Pressable accessibilityLabel="Edit gift" onPress={() => setEditing(g)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={22} color={theme.primary} />
                  </Pressable>
                  <Pressable accessibilityLabel="Delete gift" onPress={() => setDeleting(g)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={22} color={theme.danger} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))
      )}

      {letterFor ? <LetterModal gift={letterFor} onClose={() => setLetterFor(null)} /> : null}

      {notesFor ? (
        <NotesHost target={{ kind: 'gift', id: notesFor.id }} title={`Notes: ${formatMoney(notesFor.amountCents)} gift`} onClose={() => setNotesFor(null)} />
      ) : null}

      {pickingDate ? (
        <FormModal
          visible
          title="Find gifts by date"
          onClose={() => setPickingDate(false)}
          footer={<Button title="Cancel" variant="secondary" onPress={() => setPickingDate(false)} />}
        >
          <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
            Days with a dot have recorded gifts.
          </Text>
          <Calendar
            value={day}
            markedDates={giftDates}
            onSelect={(d) => {
              setDay(d);
              setPickingDate(false);
            }}
          />
        </FormModal>
      ) : null}

      {editing !== null ? (
        <GiftForm
          gift={editing === 'new' ? null : editing}
          defaults={lastUsed}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this gift?"
          message={`The ${formatMoney(deleting.amountCents)} gift on ${formatLong(deleting.date)} will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteGift(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  arrow: { padding: 6 },
  monthLabel: { fontSize: 20, fontWeight: '700' },
  total: { borderWidth: 1, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  totalAmount: { fontSize: 34, fontWeight: '700', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  dayCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: spacing.md },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  dayTitle: { fontSize: 16, fontWeight: '700' },
  dayTotal: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  amount: { fontSize: 17, fontWeight: '700', minWidth: 92 },
  rowText: { flex: 1 },
  donorLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  donor: { flexShrink: 1, fontSize: 15, fontWeight: '600' },
  details: { fontSize: 13, marginTop: 2 },
  iconBtn: { padding: 6 },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderWidth: 1, borderRadius: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyBody: { fontSize: 14, textAlign: 'center', marginBottom: spacing.sm, maxWidth: 360 },
});
