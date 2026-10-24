import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, useTheme } from '@/constants/theme';
import { Report } from '@/lib/reports';

/** On-screen preview of a report (the printed page uses the same content). */
export default function ReportView({ report }: { report: Report }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{report.title}</Text>
      <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>{report.subtitle}</Text>

      {report.sections.map((s) => {
        const t = s.table;
        const right = new Set(t?.right ?? []);
        const cell = (v: string, i: number, bold?: boolean) => (
          <Text
            key={i}
            numberOfLines={2}
            style={[
              { color: theme.text, fontSize: 14, flex: i === 0 || (t && t.columns.length > 3 && i === 1) ? 2 : 1 },
              right.has(i) && { textAlign: 'right' },
              bold && { fontWeight: '700' },
            ]}
          >
            {v}
          </Text>
        );
        return (
          <View key={s.heading} style={{ marginBottom: spacing.lg }}>
            <Text style={[styles.heading, { color: theme.primary }]}>{s.heading}</Text>
            {s.note ? <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.xs }}>{s.note}</Text> : null}
            {t ? (
              <View>
                {t.columns.some((c) => c) ? (
                  <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 2 }]}>
                    {t.columns.map((c, i) => (
                      <Text
                        key={i}
                        style={[
                          { color: theme.textMuted, fontSize: 12, fontWeight: '700', flex: i === 0 || (t.columns.length > 3 && i === 1) ? 2 : 1 },
                          right.has(i) && { textAlign: 'right' },
                        ]}
                      >
                        {c}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {t.rows.map((row, ri) => (
                  <View key={ri} style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    {row.map((c, i) => cell(c, i))}
                  </View>
                ))}
                {t.footer ? (
                  <View style={[styles.row, { borderTopColor: theme.textMuted, borderTopWidth: 1 }]}>
                    {t.footer.map((c, i) => cell(c, i, true))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  heading: { fontSize: 15, fontWeight: '700', marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 6 },
});
