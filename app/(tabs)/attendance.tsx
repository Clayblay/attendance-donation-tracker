import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AttendanceForm from '@/components/AttendanceForm';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import NoteButton from '@/components/NoteButton';
import NotesHost from '@/components/NotesHost';
import ConfirmDialog from '@/components/ConfirmDialog';
import Screen from '@/components/Screen';
import { spacing, useTheme } from '@/constants/theme';
import { totalAttendance } from '@/lib/attendance';
import { currentMonthKey, formatLong, monthKey, monthLabel, shiftMonth, todayStr } from '@/lib/dates';
import { countNotes } from '@/lib/notes';
import { useData } from '@/lib/store';
import { AttendanceInput, AttendanceRecord } from '@/lib/types';

export default function AttendanceScreen() {
  const theme = useTheme();
  const { data, addAttendance, updateAttendance, deleteAttendance } = useData();

  const [month, setMonth] = useState<string | null>(currentMonthKey()); // null = all time
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<AttendanceRecord | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AttendanceRecord | null>(null);
  const [notesFor, setNotesFor] = useState<AttendanceRecord | null>(null);
  const [lastUsed, setLastUsed] = useState({ date: todayStr(), eventTypeId: '' });

  const peopleById = useMemo(() => new Map(data.people.map((p) => [p.id, p])), [data.people]);
  const eventById = useMemo(() => new Map(data.eventTypes.map((e) => [e.id, e])), [data.eventTypes]);

  const records = useMemo(
    () =>
      data.attendance
        .filter((r) => month === null || monthKey(r.date) === month)
        .filter((r) => eventFilter === null || r.eventTypeId === eventFilter)
        .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date))),
    [data.attendance, month, eventFilter]
  );

  const grand = records.reduce((s, r) => s + totalAttendance(r), 0);
  const average = records.length ? Math.round(grand / records.length) : 0;

  function save(input: AttendanceInput, recordId: string | null) {
    if (recordId) updateAttendance(recordId, input);
    else addAttendance(input);
    setLastUsed({ date: input.date, eventTypeId: input.eventTypeId });
    // Make sure the record you just saved is visible.
    if (month !== null) setMonth(monthKey(input.date));
    if (eventFilter !== null && eventFilter !== input.eventTypeId) setEventFilter(null);
    setEditing(null);
  }

  return (
    <Screen
      title="Attendance"
      subtitle="Who was there, and how many in all"
      headerRight={<Button title="Take attendance" icon="add" onPress={() => setEditing('new')} />}
    >
      <View style={styles.monthRow}>
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
        <Chip label={month === null ? 'By month' : 'All time'} selected={false} onPress={() => setMonth(month === null ? currentMonthKey() : null)} />
      </View>

      <View style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.primary }]}>{grand}</Text>
          <Text style={{ color: theme.textMuted }}>Total attendance</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{records.length}</Text>
          <Text style={{ color: theme.textMuted }}>{records.length === 1 ? 'Event' : 'Events'}</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{average}</Text>
          <Text style={{ color: theme.textMuted }}>Average per event</Text>
        </View>
      </View>

      <View style={styles.chips}>
        <Chip label="All events" selected={eventFilter === null} onPress={() => setEventFilter(null)} />
        {data.eventTypes.map((e) => (
          <Chip key={e.id} label={e.name} selected={eventFilter === e.id} onPress={() => setEventFilter(e.id)} />
        ))}
      </View>

      {records.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="checkbox-outline" size={44} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {data.attendance.length === 0 ? 'No attendance recorded yet' : 'No attendance matches'}
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            {data.attendance.length === 0
              ? 'Take attendance for a service or event: check off people and add a headcount for everyone else.'
              : 'Try another month or event.'}
          </Text>
          {data.attendance.length === 0 ? <Button title="Take attendance" icon="add" onPress={() => setEditing('new')} /> : null}
        </View>
      ) : (
        records.map((r) => {
          const names = r.personIds.map((id) => peopleById.get(id)?.name).filter(Boolean) as string[];
          const shown = names.sort((a, b) => a.localeCompare(b)).slice(0, 6);
          const more = names.length - shown.length;
          return (
            <View key={r.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{eventById.get(r.eventTypeId)?.name ?? 'Unknown event'}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>{formatLong(r.date)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.cardTotal, { color: theme.primary }]}>{totalAttendance(r)}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                    {r.personIds.length} named · {r.otherCount} others
                  </Text>
                </View>
              </View>
              {shown.length > 0 ? (
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.sm }} numberOfLines={3}>
                  {shown.join(', ')}
                  {more > 0 ? ` and ${more} more` : ''}
                </Text>
              ) : null}
              {r.note ? <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 4 }}>Note: {r.note}</Text> : null}
              <View style={styles.actions}>
                <NoteButton count={countNotes(data, 'attendance', r.id)} onPress={() => setNotesFor(r)} />
                <Pressable accessibilityLabel="Edit attendance" onPress={() => setEditing(r)} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={22} color={theme.primary} />
                </Pressable>
                <Pressable accessibilityLabel="Delete attendance" onPress={() => setDeleting(r)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={22} color={theme.danger} />
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      {notesFor ? (
        <NotesHost
          target={{ kind: 'attendance', id: notesFor.id }}
          title={`Notes: ${eventById.get(notesFor.eventTypeId)?.name ?? 'Event'} ${formatLong(notesFor.date)}`}
          onClose={() => setNotesFor(null)}
        />
      ) : null}

      {editing !== null ? (
        <AttendanceForm
          record={editing === 'new' ? null : editing}
          defaults={lastUsed}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this attendance record?"
          message={`${eventById.get(deleting.eventTypeId)?.name ?? 'This event'} on ${formatLong(deleting.date)} (${totalAttendance(deleting)} people) will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteAttendance(deleting.id);
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
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  stat: { flexGrow: 1, flexBasis: 150, borderWidth: 1, borderRadius: 16, padding: spacing.md },
  statNumber: { fontSize: 30, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardTotal: { fontSize: 30, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs, marginTop: spacing.xs },
  iconBtn: { padding: 6 },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderWidth: 1, borderRadius: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyBody: { fontSize: 14, textAlign: 'center', marginBottom: spacing.sm, maxWidth: 360 },
});
