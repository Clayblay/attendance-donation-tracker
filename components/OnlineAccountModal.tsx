import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import FormModal from '@/components/FormModal';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/lib/auth';
import { SETUP_SQL } from '@/lib/syncSql';
import { syncLabel, useSync } from '@/lib/sync';

/** Connect the app to your online account, sign out, or change your password. */
export default function OnlineAccountModal({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const auth = useAuth();
  const sync = useSync();
  const [showSql, setShowSql] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  async function run(task: () => Promise<string | null>, success?: string) {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    const err = await task();
    setBusy(false);
    if (err) setError(err);
    else if (success) setNotice(success);
  }

  const close = <Button title="Close" variant="secondary" onPress={onClose} />;

  if (!auth.configured) {
    return (
      <FormModal visible title="Connect your online account" onClose={onClose} footer={close}>
        <Text style={[styles.help, { color: theme.textMuted }]}>
          Follow the setup guide (docs/SUPABASE_SETUP.md in your project folder), then paste the two values it asks for.
          Once connected, the app asks you to sign in.
        </Text>
        <TextField label="Project URL" value={url} onChangeText={setUrl} placeholder="https://abcdefgh.supabase.co" autoCapitalize="none" />
        <TextField label="Public (anon) key" value={key} onChangeText={setKey} placeholder="Starts with eyJ... or sb_publishable_..." autoCapitalize="none" />
        <Button
          title={busy ? 'Connecting...' : 'Connect'}
          disabled={busy}
          onPress={() => run(() => auth.connect(url, key), 'Connected.')}
        />
        {error ? <Text style={[styles.msg, { color: theme.danger }]}>{error}</Text> : null}
        <Text style={[styles.help, { color: theme.textMuted, marginTop: spacing.md }]}>
          Only paste the public "anon" key. Never paste the secret "service_role" key.
        </Text>
      </FormModal>
    );
  }

  if (auth.status !== 'signedIn') {
    return (
      <FormModal visible title="Online account" onClose={onClose} footer={close}>
        <Text style={[styles.help, { color: theme.textMuted }]}>You are connected but not signed in.</Text>
        <Button
          title="Go to sign in"
          onPress={() => {
            auth.resume();
            onClose();
          }}
        />
        <View style={{ height: spacing.md }} />
        <Button title="Disconnect (use this device only)" variant="secondary" onPress={() => auth.disconnect().then(onClose)} />
      </FormModal>
    );
  }

  const label = syncLabel(sync.info.state);
  const last = sync.info.lastSyncedAt ? new Date(sync.info.lastSyncedAt).toLocaleString() : 'not yet';

  return (
    <>
      <FormModal visible title="Online account" onClose={onClose} footer={close}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Signed in as {auth.email}</Text>

        <Text style={[styles.section, { color: theme.textMuted }]}>Sync</Text>
        <Text style={{ color: theme.text, fontWeight: '600' }}>{label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Not syncing'}</Text>
        {sync.info.message ? <Text style={[styles.help, { color: theme.textMuted, marginBottom: spacing.sm }]}>{sync.info.message}</Text> : null}
        <Text style={[styles.help, { color: theme.textMuted }]}>Last synced: {last}</Text>
        <View style={styles.row}>
          <Button title="Sync now" variant="secondary" onPress={sync.syncNow} />
          {sync.info.state === 'conflict' ? <Button title="Resolve" onPress={() => { sync.reopenConflict(); onClose(); }} /> : null}
        </View>
        <View style={styles.row}>
          <Button title={showSql ? 'Hide setup SQL' : 'Show setup SQL'} variant="ghost" onPress={() => setShowSql((v) => !v)} />
          {sync.backupAt ? <Button title="Restore earlier data" variant="ghost" onPress={() => setConfirmRestore(true)} /> : null}
        </View>
        {showSql ? (
          <View style={[styles.sql, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Text style={[styles.help, { color: theme.textMuted }]}>
              Paste this into Supabase (SQL Editor, then Run) one time. It creates the private place your data is saved.
            </Text>
            <Text selectable style={{ color: theme.text, fontSize: 12 }}>{SETUP_SQL}</Text>
          </View>
        ) : null}

        <Text style={[styles.section, { color: theme.textMuted }]}>Change password</Text>
        <TextField label="New password" value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" />
        <TextField label="Type it again" value={pw2} onChangeText={setPw2} secureTextEntry autoCapitalize="none" />
        <Button
          title={busy ? 'Saving...' : 'Change password'}
          disabled={busy || !pw}
          variant="secondary"
          onPress={() => {
            if (pw !== pw2) return setError('The two passwords do not match.');
            run(() => auth.setNewPassword(pw), 'Password changed.').then(() => {
              setPw('');
              setPw2('');
            });
          }}
        />
        {error ? <Text style={[styles.msg, { color: theme.danger }]}>{error}</Text> : null}
        {notice ? <Text style={[styles.msg, { color: theme.primary }]}>{notice}</Text> : null}

        <View style={[styles.row, { marginTop: spacing.lg }]}>
          <Button title="Sign out" variant="secondary" onPress={() => auth.signOut().then(onClose)} />
          <Button title="Disconnect" variant="danger" onPress={() => auth.disconnect().then(onClose)} />
        </View>
      </FormModal>

      {confirmRestore ? (
        <ConfirmDialog
          title="Restore the earlier data?"
          message={`This puts back what this device had before it last took the online copy (saved ${new Date(sync.backupAt).toLocaleString()}). Your current data here is replaced, and the restored data is sent online.`}
          confirmLabel="Restore"
          destructive
          onCancel={() => setConfirmRestore(false)}
          onConfirm={() => {
            setConfirmRestore(false);
            sync.restoreBackup();
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  section: { fontSize: 13, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  msg: { fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  sql: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginTop: spacing.sm },
});
