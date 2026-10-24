import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import GivingForm from '@/components/GivingForm';
import Screen from '@/components/Screen';
import { spacing, useTheme } from '@/constants/theme';
import { GIVING_KIND_ICON, GIVING_KIND_LABEL } from '@/lib/giving';
import { formatMoney } from '@/lib/money';
import { useData } from '@/lib/store';
import { GivingInput, GivingOpportunity } from '@/lib/types';

export default function GivingScreen() {
  const theme = useTheme();
  const { data, addGiving, updateGiving, deleteGiving } = useData();
  const giftsFor = (id: string) => data.gifts.filter((x) => x.givingId === id);
  const [editing, setEditing] = useState<GivingOpportunity | 'new' | null>(null);
  const [deleting, setDeleting] = useState<GivingOpportunity | null>(null);

  const items = data.givingOpportunities;
  // Active first, then inactive; each group keeps the order you created them.
  const sorted = [...items.filter((g) => g.active), ...items.filter((g) => !g.active)];

  const takenNames = items
    .filter((g) => editing === 'new' || (editing !== null && g.id !== editing.id))
    .map((g) => g.name);

  function save(input: GivingInput) {
    if (editing === 'new') addGiving(input);
    else if (editing) updateGiving(editing.id, input);
    setEditing(null);
  }

  return (
    <Screen
      title="Giving opportunities"
      subtitle="Tithes, offerings, dues and special occasions"
      back={{ label: 'Settings', to: '/settings' }}
      headerRight={<Button title="Add" icon="add" onPress={() => setEditing('new')} />}
    >
      {items.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="gift-outline" size={44} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No giving opportunities</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            Add the kinds of giving you collect, such as Tithes, Offerings or a special fund.
          </Text>
          <Button title="Add one" icon="add" onPress={() => setEditing('new')} />
        </View>
      ) : (
        <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {sorted.map((g, i) => (
            <View
              key={g.id}
              style={[
                styles.row,
                i < sorted.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                !g.active && { opacity: 0.6 },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name={GIVING_KIND_ICON[g.kind]} size={22} color={theme.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{g.name}</Text>
                <Text style={[styles.details, { color: theme.textMuted }]} numberOfLines={1}>
                  {[GIVING_KIND_LABEL[g.kind], g.active ? null : 'Inactive', g.description, giftsFor(g.id).length ? `${giftsFor(g.id).length} gifts, ${formatMoney(giftsFor(g.id).reduce((t, x) => t + x.amountCents, 0))}` : null].filter(Boolean).join('  ·  ')}
                </Text>
              </View>
              <Pressable accessibilityLabel={`Edit ${g.name}`} onPress={() => setEditing(g)} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={22} color={theme.primary} />
              </Pressable>
              <Pressable accessibilityLabel={`Delete ${g.name}`} onPress={() => setDeleting(g)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={22} color={theme.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {editing !== null ? (
        <GivingForm
          item={editing === 'new' ? null : editing}
          takenNames={takenNames}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {deleting && giftsFor(deleting.id).length > 0 ? (
        <ConfirmDialog
          title="This has recorded gifts"
          message={`"${deleting.name}" has ${giftsFor(deleting.id).length} recorded gifts, so it can't be deleted. You can make it Inactive instead: it will be hidden when recording new gifts, and its past gifts stay in History.`}
          confirmLabel="Make inactive"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            updateGiving(deleting.id, { name: deleting.name, kind: deleting.kind, description: deleting.description, active: false });
            setDeleting(null);
          }}
        />
      ) : null}

      {deleting && giftsFor(deleting.id).length === 0 ? (
        <ConfirmDialog
          title="Delete this giving opportunity?"
          message={`"${deleting.name}" will be removed. If you only want to stop using it, edit it and set it to Inactive instead.`}
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteGiving(deleting.id);
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
