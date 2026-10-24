import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, useTheme } from '@/constants/theme';
import { monthKey, monthLabel, shiftMonth, todayStr } from '@/lib/dates';

type Props = {
  /** Selected date, YYYY-MM-DD. */
  value: string | null;
  onSelect: (date: string) => void;
  /** Days to mark with a dot (for example, days that have gifts). */
  markedDates?: Set<string>;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** A simple month calendar that works on Android, web and desktop. */
export default function Calendar({ value, onSelect, markedDates }: Props) {
  const theme = useTheme();
  const today = todayStr();
  const [view, setView] = useState(monthKey(value ?? today));

  const [y, m] = view.split('-').map(Number);
  const leading = new Date(y, m - 1, 1).getDay();
  const count = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dateOf = (d: number) => `${view}-${String(d).padStart(2, '0')}`;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Previous year" onPress={() => setView(shiftMonth(view, -12))} style={styles.nav}>
          <Text style={[styles.navText, { color: theme.primary }]}>«</Text>
        </Pressable>
        <Pressable accessibilityLabel="Previous month" onPress={() => setView(shiftMonth(view, -1))} style={styles.nav}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{monthLabel(view)}</Text>
        <Pressable accessibilityLabel="Next month" onPress={() => setView(shiftMonth(view, 1))} style={styles.nav}>
          <Ionicons name="chevron-forward" size={22} color={theme.primary} />
        </Pressable>
        <Pressable accessibilityLabel="Next year" onPress={() => setView(shiftMonth(view, 12))} style={styles.nav}>
          <Text style={[styles.navText, { color: theme.primary }]}>»</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <View key={`h${i}`} style={styles.cell}>
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '600' }}>{d}</Text>
          </View>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={styles.cell} />;
          const date = dateOf(d);
          const selected = date === value;
          const isToday = date === today;
          return (
            <Pressable key={date} accessibilityLabel={date} onPress={() => onSelect(date)} style={styles.cell}>
              <View
                style={[
                  styles.day,
                  selected && { backgroundColor: theme.primary },
                  !selected && isToday && { borderWidth: 1, borderColor: theme.primary },
                ]}
              >
                <Text style={{ color: selected ? theme.onPrimary : theme.text, fontWeight: selected || isToday ? '700' : '400' }}>
                  {d}
                </Text>
              </View>
              {markedDates?.has(date) ? (
                <View style={[styles.dot, { backgroundColor: selected ? theme.onPrimary : theme.gold }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => onSelect(today)} style={styles.todayBtn}>
        <Text style={{ color: theme.primary, fontWeight: '600' }}>Go to today</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 16, padding: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  nav: { paddingHorizontal: 10, paddingVertical: 6 },
  navText: { fontSize: 22, fontWeight: '700' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center' },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: 3, width: 5, height: 5, borderRadius: 3 },
  todayBtn: { alignSelf: 'center', paddingVertical: spacing.sm },
});
