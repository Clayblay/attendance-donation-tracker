import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import EventForm from '@/components/EventForm';
import Screen from '@/components/Screen';
import { spacing, useTheme } from '@/constants/theme';
import { totalAttendance } from '@/lib/attendance';
import { useData } from '@/lib/store';
import { EventInput, EventType } from '@/lib/types';

export default function EventsScreen() {
  const theme = useTheme();
  const { data, addEventType, updateEventType, deleteEventType } = useData();
  const [editing, setEditing] = useState<EventType | 'new' | null>(null);
  const [deleting, setDeleting] = useState<EventType | null>(null);

  const recordsFor = (id: string) => data.attendance.filter((r) => r.eventTypeId === id);
  const items = data.eventTypes;
  const sorted = [...items.filter((e) => e.active), ...items.filter((e) => !e.active)];

  const takenNames = items
    .filter((e) => editing === 'new' || (editing !== null && e.id !== editing.id))
    .map((e) => e.name);

  function save(input: EventInput) {
    if (editing === 'new') addEventType(input);
    else if (editing) updateEventType(editing.id, input);
    setEditing(null);
  }

  return (
    <Screen
      title="Event types"
      subtitle="Services, classes and events you take attendance for"
      back={{ label: 'Settings', to: '/settings' }}
      headerRight={<Button title="Add" icon="add" onPress={() => setEditing('new')} />}
    >
      {items.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="calendar-outline" size={44} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No event types</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>Add the services or events you meet for, such as Sunday Service.</Text>
          <Button title="Add one" icon="add" onPress={() => setEditing('new')} />
        </View>
      ) : (
        <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {sorted.map((e, i) => {
            const recs = recordsFor(e.id);
            const details = [
              e.active ? null : 'Inactive',
              e.description,
              recs.length ? `${recs.length} ${recs.length === 1 ? 'record' : 'records'}, ${recs.reduce((t, r) => t + totalAttendance(r), 0)} total attendance` : null,
            ].filter(Boolean).join('  ·  ');
            return (
              <View
                key={e.id}
                style={[
                  styles.row,
                  i < sorted.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                  !e.active && { opacity: 0.6 },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
                  <Ionicons name="calendar-outline" size={22} color={theme.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{e.name}</Text>
                  {details ? <Text style={[styles.details, { color: theme.textMuted }]} numberOfLines={2}>{details}</Text> : null}
                </View>
                <Pressable accessibilityLabel={`Edit ${e.name}`} onPress={() => setEditing(e)} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={22} color={theme.primary} />
                </Pressable>
                <Pressable accessibilityLabel={`Delete ${e.name}`} onPress={() => setDeleting(e)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={22} color={theme.danger} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {editing !== null ? (
        <EventForm item={editing === 'new' ? null : editing} takenNames={takenNames} onSave={save} onClose={() => setEditing(null)} />
      ) : null}

      {deleting && recordsFor(deleting.id).length > 0 ? (
        <ConfirmDialog
          title="This has attendance records"
          message={`"${deleting.name}" has ${recordsFor(deleting.id).length} attendance records, so it can't be deleted. You can make it Inactive instead: it will be hidden when taking attendance, and past records stay.`}
          confirmLabel="Make inactive"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            updateEventType(deleting.id, { name: deleting.name, description: deleting.description, active: false });
            setDeleting(null);
          }}
        />
      ) : null}

      {deleting && recordsFor(deleting.id).length === 0 ? (
        <ConfirmDialog
          title="Delete this event type?"
          message={`"${deleting.name}" will be removed. If you only want to stop using it, edit it and set it to Inactive instead.`}
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteEventType(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  details: { fontSize: 13, marginTop: 2 },
  iconBtn: { padding: 6 },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderWidth: 1, borderRadius: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyBody: { fontSize: 14, textAlign: 'center', marginBottom: spacing.sm, maxWidth: 360 },
});
