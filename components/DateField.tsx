import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Calendar from '@/components/Calendar';
import Chip from '@/components/Chip';
import { spacing, useTheme } from '@/constants/theme';
import { addDays, formatUs, parseUsDate, todayStr } from '@/lib/dates';

type Props = {
  label?: string;
  /** YYYY-MM-DD, or null while the typed text is not a valid date. */
  value: string | null;
  onChange: (value: string | null) => void;
};

/** Date entry without a calendar library: type it, step by day, or tap Today / Yesterday. */
export default function DateField({ label = 'Date', value, onChange }: Props) {
  const theme = useTheme();
  const [text, setText] = useState(value ? formatUs(value) : '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value && parseUsDate(text) !== value) setText(formatUs(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const invalid = text.trim() !== '' && parseUsDate(text) === null;
  const base = value ?? todayStr();
  const today = todayStr();

  function type(t: string) {
    setText(t);
    onChange(parseUsDate(t));
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <View style={styles.row}>
        <Pressable accessibilityLabel="Previous day" onPress={() => onChange(addDays(base, -1))} style={styles.arrow}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={type}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            { backgroundColor: theme.inputBg, color: theme.text, borderColor: invalid ? theme.danger : theme.border },
          ]}
        />
        <Pressable accessibilityLabel="Next day" onPress={() => onChange(addDays(base, 1))} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={22} color={theme.primary} />
        </Pressable>
        <Pressable accessibilityLabel="Open calendar" onPress={() => setOpen((o) => !o)} style={styles.arrow}>
          <Ionicons name={open ? 'calendar' : 'calendar-outline'} size={24} color={theme.primary} />
        </Pressable>
      </View>
      {open ? (
        <View style={styles.cal}>
          <Calendar
            value={value}
            onSelect={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        </View>
      ) : null}
      <View style={styles.chips}>
        <Chip label="Today" selected={value === today} onPress={() => onChange(today)} />
        <Chip label="Yesterday" selected={value === addDays(today, -1)} onPress={() => onChange(addDays(today, -1))} />
      </View>
      {invalid ? <Text style={[styles.error, { color: theme.danger }]}>Use the format MM/DD/YYYY.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  arrow: { padding: 6 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16 },
  cal: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  error: { fontSize: 12, marginTop: 4 },
});
