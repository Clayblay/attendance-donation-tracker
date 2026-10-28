import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormModal from '@/components/FormModal';
import { spacing, useTheme } from '@/constants/theme';
import { useSync } from '@/lib/sync';
import { Counts } from '@/lib/syncEngine';

function Column({ title, subtitle, counts }: { title: string; subtitle: string; counts: Counts | null }) {
  const theme = useTheme();
  return (
    <View style={[styles.col, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{title}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.sm }}>{subtitle}</Text>
      {counts ? (
        <>
          <Text style={{ color: theme.text }}>{counts.people} people</Text>
          <Text style={{ color: theme.text }}>{counts.gifts} gifts</Text>
          <Text style={{ color: theme.text }}>{counts.attendance} attendance records</Text>
          <Text style={{ color: theme.text }}>{counts.notes} notes</Text>
        </>
      ) : null}
    </View>
  );
}

/** Shown when this device and the online copy have both changed. Nothing is overwritten until you choose. */
export default function SyncConflictModal() {
  const theme = useTheme();
  const sync = useSync();
  const [confirm, setConfirm] = useState<'device' | 'online' | null>(null);
  const { remote, localCounts } = sync.info;
  const when = remote?.updatedAt ? new Date(remote.updatedAt).toLocaleString() : '';

  return (
    <>
      <FormModal
        visible
        wide
        title="Two different versions"
        onClose={sync.postponeConflict}
        footer={<Button title="Decide later" variant="secondary" onPress={sync.postponeConflict} />}
      >
        <Text style={{ color: theme.textMuted, lineHeight: 21, marginBottom: spacing.md }}>
          This device and your online copy both have changes the other one does not. Nothing has been overwritten. Choose which version to keep.
        </Text>
        <View style={styles.cols}>
          <Column title="This device" subtitle="What is saved here now" counts={localCounts} />
          <Column
            title="Online copy"
            subtitle={`Last saved ${when || 'earlier'}${remote?.device ? ` from ${remote.device}` : ''}`}
            counts={remote?.counts ?? null}
          />
        </View>
        <View style={styles.buttons}>
          <Button title="Keep this device's version" onPress={() => setConfirm('device')} />
          <Button title="Use the online copy" variant="secondary" onPress={() => setConfirm('online')} />
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.md }}>
          If you use the online copy, a backup of this device's data is kept, and you can bring it back from Settings, then Online account.
        </Text>
      </FormModal>

      {confirm === 'device' ? (
        <ConfirmDialog
          title="Replace the online copy?"
          message="The online copy will be replaced with this device's version. Changes that only exist online will be lost."
          confirmLabel="Replace online copy"
          destructive
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            sync.keepThisDevice();
          }}
        />
      ) : null}
      {confirm === 'online' ? (
        <ConfirmDialog
          title="Replace this device's data?"
          message="This device will be updated to match the online copy. A backup of what is here now is saved first."
          confirmLabel="Use online copy"
          destructive
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            sync.useOnlineCopy();
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  col: { flexGrow: 1, flexBasis: 220, borderWidth: 1, borderRadius: 14, padding: spacing.md },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
});
