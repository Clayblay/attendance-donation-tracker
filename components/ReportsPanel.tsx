import React, { useMemo, useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Chip from '@/components/Chip';
import DateField from '@/components/DateField';
import ReportView from '@/components/ReportView';
import { spacing, useTheme } from '@/constants/theme';
import { addDays, todayStr } from '@/lib/dates';
import { printHtml } from '@/lib/print';
import {
  buildAttendanceReport,
  buildGivingReport,
  buildReportHtml,
  Preset,
  presetRange,
  PRESETS,
  rangeLabel,
  reportToText,
  toCsv,
} from '@/lib/reports';
import { useData } from '@/lib/store';

type Kind = 'giving' | 'attendance';

export default function ReportsPanel() {
  const theme = useTheme();
  const { data } = useData();
  const [kind, setKind] = useState<Kind>('giving');
  const [preset, setPreset] = useState<Preset>('thisMonth');
  const [from, setFrom] = useState<string | null>(addDays(todayStr(), -30));
  const [to, setTo] = useState<string | null>(todayStr());
  const [status, setStatus] = useState<string | undefined>();

  const range = useMemo(() => {
    if (preset !== 'custom') return presetRange(preset);
    if (!from || !to) return null;
    return from <= to ? { start: from, end: to, label: rangeLabel(from, to) } : null;
  }, [preset, from, to]);

  const report = useMemo(() => {
    if (!range) return null;
    return kind === 'giving'
      ? buildGivingReport(data, range.start, range.end, range.label)
      : buildAttendanceReport(data, range.start, range.end, range.label);
  }, [data, kind, range]);

  async function print() {
    if (!report) return;
    try {
      await printHtml(buildReportHtml(data.orgName, report));
      setStatus('In the print window you can choose a printer, or "Save as PDF" to keep a copy.');
    } catch {
      setStatus('Printing is not available here. Try Share or Copy instead.');
    }
  }

  async function shareText() {
    if (!report) return;
    try {
      await Share.share({ title: report.title, message: reportToText(data.orgName, report) });
    } catch {
      setStatus('Sharing is not available here. Try Copy or Print instead.');
    }
  }

  async function copyText() {
    if (!report) return;
    try {
      const nav = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
      if (!nav?.clipboard) throw new Error('no clipboard');
      await nav.clipboard.writeText(reportToText(data.orgName, report));
      setStatus('Copied. Paste it into an email or document.');
    } catch {
      setStatus('Copy is not available here.');
    }
  }

  async function exportCsv() {
    if (!report) return;
    const csv = toCsv(report.csv.rows);
    if (Platform.OS === 'web') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g: any = globalThis;
      const blob = new g.Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = g.URL.createObjectURL(blob);
      const a = g.document.createElement('a');
      a.href = url;
      a.download = report.csv.filename;
      g.document.body.appendChild(a);
      a.click();
      g.document.body.removeChild(a);
      g.URL.revokeObjectURL(url);
      setStatus(`Saved ${report.csv.filename} to your downloads. Open it with Excel or Sheets.`);
    } else {
      try {
        await Share.share({ title: report.csv.filename, message: csv });
      } catch {
        setStatus('Sharing is not available here.');
      }
    }
  }

  return (
    <View>
      <Text style={[styles.label, { color: theme.textMuted }]}>Report</Text>
      <View style={styles.chips}>
        <Chip label="Giving" selected={kind === 'giving'} onPress={() => setKind('giving')} />
        <Chip label="Attendance" selected={kind === 'attendance'} onPress={() => setKind('attendance')} />
      </View>

      <Text style={[styles.label, styles.gap, { color: theme.textMuted }]}>Period</Text>
      <View style={styles.chips}>
        {PRESETS.map((p) => (
          <Chip key={p.id} label={p.label} selected={preset === p.id} onPress={() => setPreset(p.id)} />
        ))}
      </View>

      {preset === 'custom' ? (
        <View style={{ marginTop: spacing.md }}>
          <DateField label="From" value={from} onChange={setFrom} />
          <DateField label="To" value={to} onChange={setTo} />
          {!range ? (
            <Text style={{ color: theme.danger, fontSize: 13 }}>Enter two valid dates, with "From" on or before "To".</Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.chips, styles.gap]}>
        <Button title="Print / PDF" icon="print-outline" onPress={print} disabled={!report} />
        <Button title="Spreadsheet (CSV)" icon="grid-outline" variant="secondary" onPress={exportCsv} disabled={!report} />
        <Button title="Share" icon="share-outline" variant="secondary" onPress={shareText} disabled={!report} />
        {Platform.OS === 'web' ? <Button title="Copy" icon="copy-outline" variant="secondary" onPress={copyText} disabled={!report} /> : null}
      </View>
      {status ? <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.sm }}>{status}</Text> : null}

      <View style={{ marginTop: spacing.lg }}>{report ? <ReportView report={report} /> : null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
  gap: { marginTop: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
