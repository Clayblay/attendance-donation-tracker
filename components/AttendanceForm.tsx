import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import DateField from '@/components/DateField';
import FormModal from '@/components/FormModal';
import IdBadge from '@/components/IdBadge';
import Stepper from '@/components/Stepper';
import TextField from '@/components/TextField';
import { spacing, typeColor, useTheme } from '@/constants/theme';
import { formatLong } from '@/lib/dates';
import { PERSON_TYPES, TYPE_LABEL_PLURAL } from '@/lib/ids';
import { useData } from '@/lib/store';
import { AttendanceInput, AttendanceRecord, PersonType } from '@/lib/types';

type Props = {
  /** null = taking attendance for a new event. */
  record: AttendanceRecord | null;
  defaults: { date: string; eventTypeId: string };
  /** recordId is set when an existing record is being changed. */
  onSave: (input: AttendanceInput, recordId: string | null) => void;
  onClose: () => void;
};

export default function AttendanceForm({ record, defaults, onSave, onClose }: Props) {
  const theme = useTheme();
  const { data, addPerson } = useData();

  const events = data.eventTypes.filter((e) => e.active || e.id === record?.eventTypeId);

  const [recordId, setRecordId] = useState<string | null>(record?.id ?? null);
  const [eventTypeId, setEventTypeId] = useState<string>(
    record?.eventTypeId ?? (events.some((e) => e.id === defaults.eventTypeId) ? defaults.eventTypeId : events[0]?.id ?? '')
  );
  const [date, setDate] = useState<string | null>(record?.date ?? defaults.date);
  const [checked, setChecked] = useState<string[]>(record?.personIds ?? []);
  const [others, setOthers] = useState(record?.otherCount ?? 0);
  const [note, setNote] = useState(record?.note ?? '');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | PersonType>('all');
  const [error, setError] = useState<string | undefined>();

  const checkedSet = useMemo(() => new Set(checked), [checked]);
  const q = query.trim().toLowerCase();

  const shown = useMemo(
    () =>
      data.people
        .filter((p) => filter === 'all' || p.type === filter)
        .filter((p) => !q || p.name.toLowerCase().includes(q) || p.displayId.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.people, filter, q]
  );

  const exactMatch = data.people.some((p) => p.name.toLowerCase() === q);

  // Attendance may already exist for this event on this date.
  const conflict =
    date && eventTypeId
      ? data.attendance.find((r) => r.date === date && r.eventTypeId === eventTypeId && r.id !== recordId)
      : undefined;

  function load(r: AttendanceRecord) {
    setRecordId(r.id);
    setEventTypeId(r.eventTypeId);
    setDate(r.date);
    setChecked(r.personIds);
    setOthers(r.otherCount);
    setNote(r.note);
  }

  function toggle(id: string) {
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  function toggleAllShown() {
    const ids = shown.map((p) => p.id);
    const allOn = ids.length > 0 && ids.every((id) => checkedSet.has(id));
    setChecked((c) => (allOn ? c.filter((id) => !ids.includes(id)) : Array.from(new Set([...c, ...ids]))));
  }

  function submit() {
    if (!eventTypeId) return setError('Choose the event. Add event types in Settings if the list is empty.');
    if (!date) return setError('Enter a valid date.');
    if (conflict) return setError('Attendance for this event and date already exists. Tap "Edit that record" above.');
    setError(undefined);
    onSave({ date, eventTypeId, personIds: checked, otherCount: others, note: note.trim() }, recordId);
  }

  const total = checked.length + others;

  return (
    <FormModal
      visible
      title={recordId ? 'Edit attendance' : 'Take attendance'}
      onClose={onClose}
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button title="Save attendance" onPress={submit} />
        </>
      }
    >
      <Text style={[styles.label, { color: theme.textMuted }]}>Event</Text>
      {events.length === 0 ? (
        <Text style={{ color: theme.danger, fontSize: 13 }}>No active event types. Add one in Settings first.</Text>
      ) : (
        <View style={styles.chips}>
          {events.map((e) => (
            <Chip key={e.id} label={e.name} selected={eventTypeId === e.id} onPress={() => setEventTypeId(e.id)} />
          ))}
        </View>
      )}
      <View style={{ height: spacing.md }} />

      <DateField value={date} onChange={setDate} />

      {conflict ? (
        <View style={[styles.conflict, { borderColor: theme.gold, backgroundColor: theme.surfaceAlt }]}>
          <Text style={{ color: theme.text, fontSize: 13, marginBottom: spacing.sm }}>
            Attendance was already recorded for this event on {formatLong(conflict.date)}.
          </Text>
          <Button title="Edit that record" variant="secondary" onPress={() => load(conflict)} />
        </View>
      ) : null}

      <Text style={[styles.label, { color: theme.textMuted }]}>Who was there? ({checked.length} checked)</Text>
      <TextField value={query} onChangeText={setQuery} placeholder="Search by name or ID" />
      <View style={styles.chips}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {PERSON_TYPES.map((t) => (
          <Chip key={t} label={TYPE_LABEL_PLURAL[t]} selected={filter === t} color={typeColor(theme, t)} onPress={() => setFilter(t)} />
        ))}
      </View>
      <Pressable onPress={toggleAllShown} style={styles.selectAll}>
        <Text style={{ color: theme.primary, fontWeight: '600' }}>
          {shown.length > 0 && shown.every((p) => checkedSet.has(p.id)) ? 'Uncheck everyone shown' : 'Check everyone shown'}
        </Text>
      </Pressable>

      <View style={[styles.list, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {shown.length === 0 ? (
            <Text style={{ color: theme.textMuted, padding: spacing.md }}>
              {data.people.length === 0 ? 'No people yet. Add them on the People tab, or type a name above.' : 'No one matches.'}
            </Text>
          ) : (
            shown.map((p) => {
              const on = checkedSet.has(p.id);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(p.id)}
                  style={({ pressed }) => [styles.person, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? theme.primary : theme.textMuted} />
                  <IdBadge displayId={p.displayId} type={p.type} />
                  <Text style={{ color: theme.text, flex: 1, fontSize: 15 }} numberOfLines={1}>{p.name}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>

      {q && !exactMatch ? (
        <Pressable
          onPress={() => {
            const person = addPerson({ name: query.trim(), type: 'visitor', email: '', phone: '' });
            setChecked((c) => [...c, person.id]);
            setQuery('');
          }}
          style={({ pressed }) => [styles.quickAdd, { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="person-add-outline" size={20} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
            Add "{query.trim()}" as a new visitor and check them in
          </Text>
        </Pressable>
      ) : null}

      <View style={{ height: spacing.md }} />
      <Stepper label="Others present (not checked off by name)" value={others} onChange={setOthers} />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Guest speaker, rainy day" />

      <View style={[styles.total, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted }}>Total attendance</Text>
        <Text style={{ color: theme.primary, fontSize: 28, fontWeight: '700' }}>{total}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{checked.length} checked + {others} others</Text>
      </View>
      {error ? <Text style={{ color: theme.danger, fontSize: 13, marginTop: spacing.sm }}>{error}</Text> : null}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  conflict: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  selectAll: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginBottom: spacing.xs },
  list: { borderWidth: 1, borderRadius: 12, maxHeight: 260, overflow: 'hidden' },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  quickAdd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: 12, marginTop: spacing.sm },
  total: { borderWidth: 1, borderRadius: 14, padding: spacing.md, alignItems: 'center' },
});
