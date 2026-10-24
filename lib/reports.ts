import { totalAttendance } from '@/lib/attendance';
import { currentMonthKey, formatFull, formatLong, formatUs, monthEnd, monthKey, monthLabel, monthStart, shiftMonth, todayStr } from '@/lib/dates';
import { METHOD_LABEL } from '@/lib/gifts';
import { formatMoney } from '@/lib/money';
import { sumCents, totalsByDonor, totalsByGiving } from '@/lib/stats';
import { AppData } from '@/lib/types';

export type ReportTable = {
  columns: string[];
  rows: string[][];
  /** Column numbers (starting at 0) that are right-aligned, such as amounts. */
  right?: number[];
  footer?: string[];
};
export type ReportSection = { heading: string; note?: string; table?: ReportTable };
export type Report = {
  title: string;
  subtitle: string;
  sections: ReportSection[];
  csv: { filename: string; rows: string[][] };
};

export type Preset = 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'all' | 'custom';

export const PRESETS: { id: Preset; label: string }[] = [
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'thisYear', label: 'This year' },
  { id: 'lastYear', label: 'Last year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom dates' },
];

export function presetRange(p: Preset, today: string = todayStr()): { start: string; end: string; label: string } | null {
  const ym = monthKey(today);
  const year = Number(today.slice(0, 4));
  switch (p) {
    case 'thisMonth':
      return { start: monthStart(ym), end: monthEnd(ym), label: monthLabel(ym) };
    case 'lastMonth': {
      const k = shiftMonth(ym, -1);
      return { start: monthStart(k), end: monthEnd(k), label: monthLabel(k) };
    }
    case 'thisYear':
      return { start: `${year}-01-01`, end: `${year}-12-31`, label: String(year) };
    case 'lastYear':
      return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31`, label: String(year - 1) };
    case 'all':
      return { start: '0000-01-01', end: '9999-12-31', label: 'All time' };
    default:
      return null;
  }
}

export function rangeLabel(start: string, end: string, presetLabel?: string): string {
  if (presetLabel) return presetLabel;
  return `${formatFull(start)} to ${formatFull(end)}`;
}

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%');

export function buildGivingReport(data: AppData, start: string, end: string, label: string): Report {
  const gifts = data.gifts
    .filter((g) => g.date >= start && g.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const total = sumCents(gifts);
  const peopleById = new Map(data.people.map((p) => [p.id, p]));
  const givingName = (id: string) => data.givingOpportunities.find((g) => g.id === id)?.name ?? 'Other';
  const anonymous = sumCents(gifts.filter((g) => !g.personId && !g.donorLabel));
  const sections: ReportSection[] = [];

  sections.push({
    heading: 'Summary',
    table: {
      columns: ['', ''],
      right: [1],
      rows: [
        ['Total given', formatMoney(total)],
        ['Number of gifts', String(gifts.length)],
        ['Average gift', formatMoney(gifts.length ? Math.round(total / gifts.length) : 0)],
        ['Given anonymously', formatMoney(anonymous)],
      ],
    },
    note: gifts.length === 0 ? 'No gifts were recorded in this period.' : undefined,
  });

  if (gifts.length > 0) {
    const byGiving = totalsByGiving(gifts);
    sections.push({
      heading: 'By giving type',
      table: {
        columns: ['Giving type', 'Gifts', 'Total', 'Share'],
        right: [1, 2, 3],
        rows: byGiving.map((t) => [givingName(t.givingId), String(t.count), formatMoney(t.cents), pct(t.cents, total)]),
        footer: ['Total', String(gifts.length), formatMoney(total), '100%'],
      },
    });

    const months = new Map<string, number>();
    gifts.forEach((g) => months.set(monthKey(g.date), (months.get(monthKey(g.date)) ?? 0) + g.amountCents));
    if (months.size > 1) {
      sections.push({
        heading: 'By month',
        table: {
          columns: ['Month', 'Total'],
          right: [1],
          rows: Array.from(months.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([k, c]) => [monthLabel(k), formatMoney(c)]),
          footer: ['Total', formatMoney(total)],
        },
      });
    }

    const donors = totalsByDonor(gifts, peopleById);
    sections.push({
      heading: 'By donor',
      table: {
        columns: ['ID', 'Donor', 'Gifts', 'Total'],
        right: [2, 3],
        rows: donors.map((d) => [d.personId ? peopleById.get(d.personId)?.displayId ?? '' : '', d.label, String(d.count), formatMoney(d.cents)]),
        footer: ['', 'Total', String(gifts.length), formatMoney(total)],
      },
    });

    const days = new Map<string, { n: number; c: number }>();
    gifts.forEach((g) => {
      const cur = days.get(g.date) ?? { n: 0, c: 0 };
      days.set(g.date, { n: cur.n + 1, c: cur.c + g.amountCents });
    });
    sections.push({
      heading: 'By day',
      table: {
        columns: ['Date', 'Gifts', 'Total'],
        right: [1, 2],
        rows: Array.from(days.entries()).map(([d, v]) => [formatLong(d), String(v.n), formatMoney(v.c)]),
        footer: ['Total', String(gifts.length), formatMoney(total)],
      },
    });
  }

  return {
    title: 'Giving report',
    subtitle: label,
    sections,
    csv: {
      filename: 'giving-report.csv',
      rows: [
        ['Date', 'Donor ID', 'Donor', 'Giving type', 'Method', 'Reference', 'Amount', 'Note'],
        ...gifts.map((g) => {
          const p = g.personId ? peopleById.get(g.personId) : undefined;
          return [
            g.date,
            p?.displayId ?? '',
            p?.name ?? (g.donorLabel || 'Anonymous'),
            givingName(g.givingId),
            METHOD_LABEL[g.method],
            g.reference,
            (g.amountCents / 100).toFixed(2),
            g.note,
          ];
        }),
      ],
    },
  };
}

export function buildAttendanceReport(data: AppData, start: string, end: string, label: string): Report {
  const records = data.attendance
    .filter((r) => r.date >= start && r.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const eventName = (id: string) => data.eventTypes.find((e) => e.id === id)?.name ?? 'Event';
  const total = records.reduce((s, r) => s + totalAttendance(r), 0);
  const named = records.reduce((s, r) => s + r.personIds.length, 0);
  const others = records.reduce((s, r) => s + r.otherCount, 0);
  const best = records.reduce<typeof records[number] | undefined>((b, r) => (!b || totalAttendance(r) > totalAttendance(b) ? r : b), undefined);
  const sections: ReportSection[] = [];

  sections.push({
    heading: 'Summary',
    table: {
      columns: ['', ''],
      right: [1],
      rows: [
        ['Events held', String(records.length)],
        ['Total attendance', String(total)],
        ['Average per event', String(records.length ? Math.round(total / records.length) : 0)],
        ['Checked off by name', String(named)],
        ['Others (headcount)', String(others)],
        ['Highest attendance', best ? `${totalAttendance(best)} (${eventName(best.eventTypeId)}, ${formatUs(best.date)})` : '—'],
      ],
    },
    note: records.length === 0 ? 'No attendance was recorded in this period.' : undefined,
  });

  if (records.length > 0) {
    const byEvent = new Map<string, { n: number; t: number }>();
    records.forEach((r) => {
      const cur = byEvent.get(r.eventTypeId) ?? { n: 0, t: 0 };
      byEvent.set(r.eventTypeId, { n: cur.n + 1, t: cur.t + totalAttendance(r) });
    });
    sections.push({
      heading: 'By event type',
      table: {
        columns: ['Event', 'Times held', 'Total', 'Average'],
        right: [1, 2, 3],
        rows: Array.from(byEvent.entries())
          .sort((a, b) => b[1].t - a[1].t)
          .map(([id, v]) => [eventName(id), String(v.n), String(v.t), String(Math.round(v.t / v.n))]),
        footer: ['Total', String(records.length), String(total), String(Math.round(total / records.length))],
      },
    });

    sections.push({
      heading: 'Every event',
      table: {
        columns: ['Date', 'Event', 'Named', 'Others', 'Total'],
        right: [2, 3, 4],
        rows: records.map((r) => [formatLong(r.date), eventName(r.eventTypeId), String(r.personIds.length), String(r.otherCount), String(totalAttendance(r))]),
        footer: ['', 'Total', String(named), String(others), String(total)],
      },
    });

    const counts = new Map<string, number>();
    records.forEach((r) => r.personIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
    const people = Array.from(counts.entries())
      .map(([id, n]) => ({ p: data.people.find((x) => x.id === id), n }))
      .filter((x) => x.p)
      .sort((a, b) => b.n - a.n || (a.p?.name ?? '').localeCompare(b.p?.name ?? ''));
    if (people.length > 0) {
      sections.push({
        heading: 'Who came',
        note: 'Times each named person was checked off, out of all events held in this period.',
        table: {
          columns: ['ID', 'Name', 'Times present', 'Of events'],
          right: [2, 3],
          rows: people.map((x) => [x.p?.displayId ?? '', x.p?.name ?? '', String(x.n), pct(x.n, records.length)]),
        },
      });
    }
  }

  return {
    title: 'Attendance report',
    subtitle: label,
    sections,
    csv: {
      filename: 'attendance-report.csv',
      rows: [
        ['Date', 'Event', 'Named', 'Others', 'Total', 'Names', 'Note'],
        ...records.map((r) => [
          r.date,
          eventName(r.eventTypeId),
          String(r.personIds.length),
          String(r.otherCount),
          String(totalAttendance(r)),
          r.personIds.map((id) => data.people.find((p) => p.id === id)?.name ?? '').filter(Boolean).join('; '),
          r.note,
        ]),
      ],
    },
  };
}

/** Spreadsheet-ready text. Cells that could be read as formulas are made safe. */
export function toCsv(rows: string[][]): string {
  const cell = (v: string) => {
    let s = v;
    if (/^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

/** Plain-text version for sharing or copying. */
export function reportToText(orgName: string, r: Report): string {
  const out: string[] = [orgName || 'Report', r.title, r.subtitle, ''];
  r.sections.forEach((s) => {
    out.push(s.heading.toUpperCase());
    if (s.note) out.push(s.note);
    if (s.table) {
      if (s.table.columns.some((c) => c)) out.push(s.table.columns.join(' | '));
      s.table.rows.forEach((row) => out.push(row.join(' | ')));
      if (s.table.footer) out.push(s.table.footer.join(' | '));
    }
    out.push('');
  });
  return out.join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A clean printable page for a report. */
export function buildReportHtml(orgName: string, r: Report): string {
  const sections = r.sections
    .map((s) => {
      let html = `<h3>${esc(s.heading)}</h3>`;
      if (s.note) html += `<p class="note">${esc(s.note)}</p>`;
      if (s.table) {
        const right = new Set(s.table.right ?? []);
        const cells = (row: string[], tag: string) =>
          row.map((c, i) => `<${tag}${right.has(i) ? ' class="r"' : ''}>${esc(c)}</${tag}>`).join('');
        const head = s.table.columns.some((c) => c) ? `<thead><tr>${cells(s.table.columns, 'th')}</tr></thead>` : '';
        const body = s.table.rows.map((row) => `<tr>${cells(row, 'td')}</tr>`).join('');
        const foot = s.table.footer ? `<tfoot><tr>${cells(s.table.footer, 'td')}</tr></tfoot>` : '';
        html += `<table>${head}<tbody>${body}</tbody>${foot}</table>`;
      }
      return html;
    })
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(r.title)}</title><style>
    body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11pt; color: #111; margin: 40px; }
    h1 { font-size: 20pt; margin: 0 0 2px; }
    h2 { font-size: 13pt; font-weight: normal; color: #444; margin: 0 0 20px; padding-bottom: 10px; border-bottom: 2px solid #111; }
    h3 { font-size: 12pt; margin: 22px 0 6px; }
    .note { color: #555; font-size: 10pt; margin: 0 0 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; border-bottom: 2px solid #999; padding: 5px 8px; font-size: 10pt; }
    td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
    tr { page-break-inside: avoid; }
    tfoot td { font-weight: bold; border-top: 2px solid #999; border-bottom: none; }
    .r { text-align: right; white-space: nowrap; }
  </style></head><body><h1>${esc(orgName || 'Report')}</h1><h2>${esc(r.title)} · ${esc(r.subtitle)}</h2>${sections}</body></html>`;
}

export { currentMonthKey };
