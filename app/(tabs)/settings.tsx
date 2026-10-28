import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormModal from '@/components/FormModal';
import BackupModal from '@/components/BackupModal';
import EmailAppPicker from '@/components/EmailAppPicker';
import OnlineAccountModal from '@/components/OnlineAccountModal';
import { EMAIL_APP_LABEL } from '@/lib/mail';
import ReportsModal from '@/components/ReportsModal';
import Screen from '@/components/Screen';
import TextField from '@/components/TextField';
import { getPalette } from '@/constants/palettes';
import { spacing, useTheme } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { syncLabel, useSync } from '@/lib/sync';
import { useData } from '@/lib/store';

type IconName = keyof typeof Ionicons.glyphMap;

function Row({ icon, title, value, onPress }: { icon: IconName; title: string; value?: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={theme.primary} />
      <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
      {value ? <Text style={{ color: theme.textMuted }} numberOfLines={1}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={theme.textMuted} /> : null}
    </Pressable>
  );
}

function OrgNameForm({ initial, onSave, onClose }: { initial: string; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial);
  return (
    <FormModal
      visible
      title="Organization name"
      onClose={onClose}
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
          <Button title="Save" onPress={() => onSave(name)} />
        </>
      }
    >
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Grace Community Church" autoFocus autoCapitalize="words" onSubmitEditing={() => onSave(name)} />
    </FormModal>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, setOrgName, resetAll } = useData();
  const [editingOrg, setEditingOrg] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [emailAppOpen, setEmailAppOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const auth = useAuth();
  const sync = useSync();
  const [erasing, setErasing] = useState(false);

  return (
    <Screen title="Settings" subtitle="Preferences and app information">
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Row
          icon="cloud-outline"
          title="Online account"
          value={auth.status === 'signedIn' ? `${auth.email}${syncLabel(sync.info.state) ? ` · ${syncLabel(sync.info.state)}` : ''}` : auth.configured ? 'Not signed in' : 'Not connected'}
          onPress={() => setAccountOpen(true)}
        />
        <Row icon="business-outline" title="Organization name" value={data.orgName || 'Not set'} onPress={() => setEditingOrg(true)} />
        <Row
          icon="gift-outline"
          title="Giving opportunities"
          value={String(data.givingOpportunities.length)}
          onPress={() => router.push('/giving')}
        />
        <Row
          icon="calendar-outline"
          title="Event types"
          value={String(data.eventTypes.length)}
          onPress={() => router.push('/events')}
        />
        <Row icon="document-text-outline" title="Notes" value={String(data.notes.length)} onPress={() => router.push('/notes')} />
        <Row
          icon="color-palette-outline"
          title="Appearance"
          value={`${getPalette(data.settings.paletteId).name}${data.settings.customAccent ? ' + custom' : ''}`}
          onPress={() => router.push('/appearance')}
        />
        <Row icon="bar-chart-outline" title="Reports" onPress={() => setReportsOpen(true)} />
        <Row icon="reader-outline" title="Giving statements" onPress={() => router.push('/statements')} />
        <Row icon="mail-outline" title="Letter templates" value={String(data.templates.length)} onPress={() => router.push('/templates')} />
        <Row icon="download-outline" title="Backup & restore" onPress={() => setBackupOpen(true)} />
        <Row icon="send-outline" title="Email app" value={EMAIL_APP_LABEL[data.settings.emailApp]} onPress={() => setEmailAppOpen(true)} />
        <Row icon="grid-outline" title="Dashboard layout" onPress={() => router.push('/dashboard-layout')} />
        <Row icon="cash-outline" title="Currency" value="USD" />
        <Row icon="people-outline" title="People on record" value={String(data.people.length)} />
        <Row icon="receipt-outline" title="Gifts recorded" value={String(data.gifts.length)} />
        <Row icon="checkbox-outline" title="Attendance records" value={String(data.attendance.length)} />
        <Row icon="information-circle-outline" title="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Danger zone</Text>
      <View style={styles.danger}>
        <Button title="Erase all data" variant="danger" icon="trash-outline" onPress={() => setErasing(true)} />
      </View>

      {backupOpen ? <BackupModal onClose={() => setBackupOpen(false)} /> : null}

      {emailAppOpen ? (
        <FormModal visible title="Email app" onClose={() => setEmailAppOpen(false)} footer={<Button title="Done" onPress={() => setEmailAppOpen(false)} />}>
          <Text style={{ color: theme.textMuted, lineHeight: 21, marginBottom: spacing.md }}>
            Choose which mail program opens when you tap Email on a letter or statement. Gmail and Outlook.com open in your web browser, so you need to be signed in there. This choice is saved on this device.
          </Text>
          <EmailAppPicker />
        </FormModal>
      ) : null}

      {accountOpen ? <OnlineAccountModal onClose={() => setAccountOpen(false)} /> : null}

      {reportsOpen ? <ReportsModal onClose={() => setReportsOpen(false)} /> : null}

      {editingOrg ? (
        <OrgNameForm
          initial={data.orgName}
          onClose={() => setEditingOrg(false)}
          onSave={(name) => {
            setOrgName(name);
            setEditingOrg(false);
          }}
        />
      ) : null}

      {erasing ? (
        <ConfirmDialog
          title="Erase all data?"
          message="This removes your organization name, everyone on record, your giving opportunities, event types, all recorded gifts, all attendance records, and all notes from this device. Your colours and dashboard layout are kept. If you are signed in to your online account, the online copy is erased too the next time it syncs. It cannot be undone."
          confirmLabel="Erase everything"
          destructive
          onCancel={() => setErasing(false)}
          onConfirm={async () => {
            await resetAll();
            setErasing(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { flex: 1, fontSize: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  danger: { flexDirection: 'row' },
});
