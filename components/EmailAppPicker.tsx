import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Chip from '@/components/Chip';
import { spacing, useTheme } from '@/constants/theme';
import { EMAIL_APP_LABEL } from '@/lib/mail';
import { useData } from '@/lib/store';
import { EmailApp } from '@/lib/types';

const APPS: EmailApp[] = ['default', 'gmail', 'outlook'];

/** Choose which mail program the Email buttons open (saved on this device). */
export default function EmailAppPicker() {
  const theme = useTheme();
  const { data, updateSettings } = useData();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.label, { color: theme.textMuted }]}>Open email with</Text>
      <View style={styles.row}>
        {APPS.map((a) => (
          <Chip key={a} label={EMAIL_APP_LABEL[a]} selected={data.settings.emailApp === a} onPress={() => updateSettings({ emailApp: a })} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
