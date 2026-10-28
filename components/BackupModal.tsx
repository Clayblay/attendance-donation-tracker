import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormModal from '@/components/FormModal';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import { backupFileName, buildBackup, ParsedBackup, parseBackup, peopleCsv } from '@/lib/backup';
import { downloadTextFile, pickTextFile } from '@/lib/files';
import { useData } from '@/lib/store';

const LAST_BACKUP_KEY = 'attendance-tracker:lastBackup';
const SAFETY_KEY = 'attendance-tracker:backup';

/** Save everything to a file, and restore from one. */
export default function BackupModal({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const { data, getData, replaceData } = useData();
  const [lastBackup, setLastBackup] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [pasted, setPasted] = useState('');
  const [checked, setChecked] = useState<ParsedBackup | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LAST_BACKUP_KEY).then((v) => setLastBackup(v ?? '')).catch(() => {});
  }, []);

  async function markBackedUp() {
    const now = new Date().toISOString();
    setLastBackup(now);
    await AsyncStorage.setItem(LAST_BACKUP_KEY, now).catch(() => {});
  }

  async function saveBackup() {
    const text = buildBackup(getData());
    if (downloadTextFile(backupFileName(), text, 'application/json;charset=utf-8;')) {
      setStatus(`Saved ${backupFileName()} to your downloads folder. Keep it somewhere safe.`);
      await markBackedUp();
      return;
    }
    try {
      await Share.share({ title: backupFileName(), message: text });
      setStatus('Choose where to keep the backup (for example email it to yourself, or save it to Drive).');
      await markBackedUp();
    } catch {
      setStatus('Sharing is not available here.');
    }
  }

  async function copyBackup() {
    try {
      const nav = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
      if (!nav?.clipboard) throw new Error('no clipboard');
      await nav.clipboard.writeText(buildBackup(getData()));
      setStatus('Backup text copied. Paste it into a safe note or document.');
      await markBackedUp();
    } catch {
      setStatus('Copy is not available here. Use Download or Share instead.');
    }
  }

  function exportPeople() {
    const csv = peopleCsv(getData());
    if (downloadTextFile('people.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8;')) {
      setStatus('Saved people.csv to your downloads. Open it with Excel or Sheets.');
    } else {
      Share.share({ title: 'people.csv', message: csv }).catch(() => setStatus('Sharing is not available here.'));
    }
  }

  async function chooseFile() {
    const text = await pickTextFile();
    if (text === null) return;
    setPasted(text);
    setChecked(parseBackup(text));
  }

  async function doRestore() {
    if (!checked || !checked.ok) return;
    // Keep a copy of what is here now, in case you change your mind.
    await AsyncStorage.setItem(SAFETY_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data: getData() })).catch(() => {});
    replaceData(checked.data, true);
    setConfirm(false);
    setChecked(null);
    setPasted('');
    setStatus('Restored. If you use an online account, the restored data will be sent online shortly.');
  }

  const when = lastBackup ? new Date(lastBackup).toLocaleString() : 'never on this device';
  const total = data.people.length + data.gifts.length;

  return (
    <>
      <FormModal visible wide title="Backup & restore" onClose={onClose} footer={<Button title="Close" variant="secondary" onPress={onClose} />}>
        <Text style={[styles.help, { color: theme.textMuted }]}>
          A backup is one file with everything: people, gifts, attendance, notes and templates. It contains donors' names, emails and amounts, so keep it somewhere private.
        </Text>

        <Text style={[styles.section, { color: theme.textMuted }]}>Save a backup</Text>
        <Text style={[styles.help, { color: theme.textMuted }]}>Last backup: {when}{total === 0 ? ' (nothing to back up yet)' : ''}</Text>
        <View style={styles.row}>
          <Button title={Platform.OS === 'web' ? 'Download backup file' : 'Share backup'} icon="download-outline" onPress={saveBackup} disabled={total === 0} />
          {Platform.OS === 'web' ? <Button title="Copy backup text" icon="copy-outline" variant="secondary" onPress={copyBackup} disabled={total === 0} /> : null}
          <Button title="Export people (CSV)" icon="people-outline" variant="secondary" onPress={exportPeople} disabled={data.people.length === 0} />
        </View>

        <Text style={[styles.section, { color: theme.textMuted }]}>Restore from a backup</Text>
        <Text style={[styles.help, { color: theme.textMuted }]}>
          This replaces everything on this device with the backup. Your colours and layout are kept. A copy of what is here now is saved first.
        </Text>
        {Platform.OS === 'web' ? (
          <View style={[styles.row, { marginBottom: spacing.md }]}>
            <Button title="Choose backup file..." icon="folder-open-outline" variant="secondary" onPress={chooseFile} />
          </View>
        ) : null}
        <TextField label="Or paste the backup text here" value={pasted} onChangeText={(t) => { setPasted(t); setChecked(null); }} placeholder='{ "app": "attendance-tracker", ... }' multiline />
        <Button title="Check backup" variant="secondary" onPress={() => setChecked(parseBackup(pasted))} disabled={!pasted.trim()} />

        {checked && !checked.ok ? <Text style={[styles.msg, { color: theme.danger }]}>{checked.error}</Text> : null}
        {checked && checked.ok ? (
          <View style={[styles.box, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>This backup contains</Text>
            <Text style={{ color: theme.text }}>
              {checked.counts.people} people, {checked.counts.gifts} gifts, {checked.counts.attendance} attendance records, {checked.counts.notes} notes
            </Text>
            {checked.exportedAt ? <Text style={{ color: theme.textMuted, fontSize: 13 }}>Saved {new Date(checked.exportedAt).toLocaleString()}</Text> : null}
            <View style={{ marginTop: spacing.sm }}>
              <Button title="Replace everything with this backup" variant="danger" onPress={() => setConfirm(true)} />
            </View>
          </View>
        ) : null}

        {status ? <Text style={[styles.msg, { color: theme.primary }]}>{status}</Text> : null}
      </FormModal>

      {confirm && checked && checked.ok ? (
        <ConfirmDialog
          title="Replace everything?"
          message={`This device will be changed to match the backup (${checked.counts.people} people, ${checked.counts.gifts} gifts). What is here now is saved first, but this is a big change.`}
          confirmLabel="Restore"
          destructive
          onCancel={() => setConfirm(false)}
          onConfirm={doRestore}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  section: { fontSize: 13, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  msg: { fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  box: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginTop: spacing.md, gap: 2 },
});
