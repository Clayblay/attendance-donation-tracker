import { formatFull, formatUs, todayStr } from '@/lib/dates';
import { METHOD_LABEL } from '@/lib/gifts';
import { newUid } from '@/lib/ids';
import { formatMoney } from '@/lib/money';
import { sumCents, totalsByGiving } from '@/lib/stats';
import { AppData, Gift, LetterTemplate, Person, TemplateKind } from '@/lib/types';

export type MergeKey =
  | 'first_name'
  | 'donor_name'
  | 'donor_id'
  | 'amount'
  | 'date'
  | 'giving_name'
  | 'method'
  | 'org_name'
  | 'year_total'
  | 'today'
  | 'year'
  | 'gift_count'
  | 'gift_list'
  | 'giving_summary';

type Field = { key: MergeKey; label: string; description: string; scopes: TemplateKind[] };

export const MERGE_FIELDS: Field[] = [
  { key: 'first_name', label: 'First name', description: "The donor's first name", scopes: ['thankyou', 'statement'] },
  { key: 'donor_name', label: 'Full name', description: "The donor's full name", scopes: ['thankyou', 'statement'] },
  { key: 'donor_id', label: 'Donor ID', description: 'Such as M1001', scopes: ['thankyou', 'statement'] },
  { key: 'amount', label: 'Amount', description: 'The gift amount', scopes: ['thankyou'] },
  { key: 'date', label: 'Gift date', description: 'The date of the gift', scopes: ['thankyou'] },
  { key: 'giving_name', label: 'Giving for', description: 'Tithes, Offerings, a special fund...', scopes: ['thankyou'] },
  { key: 'method', label: 'Method', description: 'Cash, check, card...', scopes: ['thankyou'] },
  { key: 'year_total', label: 'Year total', description: "The donor's total for the year", scopes: ['thankyou', 'statement'] },
  { key: 'year', label: 'Year', description: 'The statement year', scopes: ['statement'] },
  { key: 'gift_count', label: 'Number of gifts', description: 'How many gifts in the year', scopes: ['statement'] },
  { key: 'gift_list', label: 'List of gifts', description: 'Every gift: date, what it was for, amount', scopes: ['statement'] },
  { key: 'giving_summary', label: 'Totals by category', description: 'Total for each giving type', scopes: ['statement'] },
  { key: 'org_name', label: 'Organization', description: 'Your organization name', scopes: ['thankyou', 'statement'] },
  { key: 'today', label: "Today's date", description: 'The date the letter is written', scopes: ['thankyou', 'statement'] },
];

export const fieldsFor = (kind: TemplateKind): Field[] => MERGE_FIELDS.filter((f) => f.scopes.includes(kind));

export type MergeValues = Record<MergeKey, string>;

const BLANK: MergeValues = {
  first_name: '', donor_name: '', donor_id: '', amount: '', date: '', giving_name: '', method: '',
  org_name: '', year_total: '', today: '', year: '', gift_count: '', gift_list: '', giving_summary: '',
};

/** Replaces {{field}} with real values. Unknown fields are left as they are. */
export function renderTemplate(text: string, values: MergeValues): string {
  return text.replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (match, key: string) => {
    const k = key.toLowerCase() as MergeKey;
    return k in values ? values[k] : match;
  });
}

/** {{fields}} in the text that are not available for this kind of template. */
export function unknownFields(text: string, kind: TemplateKind = 'thankyou'): string[] {
  const known = new Set<string>(fieldsFor(kind).map((f) => f.key));
  const found = new Set<string>();
  const re = /\{\{\s*([A-Za-z_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!known.has(m[1].toLowerCase())) found.add(m[0]);
  }
  return Array.from(found);
}

export function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

export function sampleValues(data: AppData): MergeValues {
  return {
    first_name: 'Jane',
    donor_name: 'Jane Smith',
    donor_id: 'M1001',
    amount: '$100.00',
    date: formatFull(todayStr()),
    giving_name: 'Tithes',
    method: 'Check',
    org_name: data.orgName || 'Your Organization',
    year_total: '$1,250.00',
    today: formatFull(todayStr()),
    year: todayStr().slice(0, 4),
    gift_count: '3',
    gift_list: '01/07/2026 — Tithes — $500.00\n03/04/2026 — Offerings — $250.00\n05/12/2026 — Tithes — $500.00',
    giving_summary: 'Tithes: $1,000.00\nOfferings: $250.00',
  };
}

export function buildGiftValues(gift: Gift, data: AppData): MergeValues {
  const person = gift.personId ? data.people.find((p) => p.id === gift.personId) : undefined;
  const name = person?.name ?? gift.donorLabel ?? '';
  const year = gift.date.slice(0, 4);
  const yearTotal = person
    ? data.gifts
        .filter((g) => g.personId === person.id && g.date.startsWith(`${year}-`) && g.date <= gift.date)
        .reduce((t, g) => t + g.amountCents, 0)
    : gift.amountCents;
  return {
    ...BLANK,
    first_name: name ? firstName(name) : 'Friend',
    donor_name: name || 'Friend',
    donor_id: person?.displayId ?? '',
    amount: formatMoney(gift.amountCents),
    date: formatFull(gift.date),
    giving_name: data.givingOpportunities.find((g) => g.id === gift.givingId)?.name ?? 'our work',
    method: METHOD_LABEL[gift.method],
    org_name: data.orgName || 'our organization',
    year_total: formatMoney(yearTotal),
    today: formatFull(todayStr()),
  };
}

/** Everything a yearly statement needs for one donor. */
export function buildStatementValues(person: Person, year: number, data: AppData): MergeValues {
  const gifts = data.gifts
    .filter((g) => g.personId === person.id && g.date.startsWith(`${year}-`))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const givingName = (id: string) => data.givingOpportunities.find((g) => g.id === id)?.name ?? 'Other';
  return {
    ...BLANK,
    first_name: firstName(person.name),
    donor_name: person.name,
    donor_id: person.displayId,
    org_name: data.orgName || 'our organization',
    year_total: formatMoney(sumCents(gifts)),
    today: formatFull(todayStr()),
    year: String(year),
    gift_count: String(gifts.length),
    gift_list: gifts.map((g) => `${formatUs(g.date)} — ${givingName(g.givingId)} — ${formatMoney(g.amountCents)}`).join('\n'),
    giving_summary: totalsByGiving(gifts).map((t) => `${givingName(t.givingId)}: ${formatMoney(t.cents)}`).join('\n'),
  };
}

export function defaultStatementTemplates(): LetterTemplate[] {
  return [
    {
      id: newUid(),
      kind: 'statement',
      name: 'Annual giving statement',
      subject: 'Your {{year}} giving statement from {{org_name}}',
      body:
        'Dear {{first_name}},\n\n' +
        'Thank you for your faithful support of {{org_name}} in {{year}}. Below is a summary of the gifts we recorded from you this year.\n\n' +
        '{{gift_list}}\n\n' +
        'Total given in {{year}}: {{year_total}}\n\n' +
        'By category:\n{{giving_summary}}\n\n' +
        'With gratitude,\n{{org_name}}',
      createdAt: new Date().toISOString(),
    },
  ];
}

/** Starting templates for a new install. They can be edited or deleted. */
export function defaultTemplates(): LetterTemplate[] {
  const now = new Date().toISOString();
  return [
    {
      id: newUid(),
      kind: 'thankyou',
      name: 'Standard thank-you',
      subject: 'Thank you for your gift to {{org_name}}',
      body:
        'Dear {{first_name}},\n\n' +
        'Thank you for your generous gift of {{amount}} to {{giving_name}} on {{date}}. ' +
        'Your support helps {{org_name}} continue its work, and we are truly grateful.\n\n' +
        'With appreciation,\n{{org_name}}',
      createdAt: now,
    },
    {
      id: newUid(),
      kind: 'thankyou',
      name: 'Short and warm',
      subject: 'Thank you, {{first_name}}!',
      body: 'Dear {{first_name}},\n\nThank you so much for your {{amount}} gift on {{date}}. It means a great deal to us.\n\nBlessings,\n{{org_name}}',
      createdAt: now,
    },
    ...defaultStatementTemplates(),
  ];
}
