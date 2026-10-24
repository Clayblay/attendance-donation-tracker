import { Gift, Person } from '@/lib/types';

export const sumCents = (gifts: Gift[]): number => gifts.reduce((s, g) => s + g.amountCents, 0);

export type GivingTotal = { givingId: string; cents: number; count: number };

/** Totals per giving opportunity, biggest first. */
export function totalsByGiving(gifts: Gift[]): GivingTotal[] {
  const map = new Map<string, GivingTotal>();
  gifts.forEach((g) => {
    const cur = map.get(g.givingId) ?? { givingId: g.givingId, cents: 0, count: 0 };
    cur.cents += g.amountCents;
    cur.count += 1;
    map.set(g.givingId, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.cents - a.cents);
}

export type DonorTotal = {
  key: string;
  personId: string | null;
  label: string;
  cents: number;
  count: number;
  anonymous: boolean;
};

/** Totals per donor, biggest first. Gifts with no donor are grouped as "Anonymous" and listed last. */
export function totalsByDonor(gifts: Gift[], peopleById: Map<string, Person>): DonorTotal[] {
  const map = new Map<string, DonorTotal>();
  gifts.forEach((g) => {
    const person = g.personId ? peopleById.get(g.personId) : undefined;
    let key: string;
    let label: string;
    let anonymous = false;
    if (person) {
      key = person.id;
      label = person.name;
    } else if (g.donorLabel) {
      key = `label:${g.donorLabel}`; // a donor who was deleted but whose gifts were kept
      label = g.donorLabel;
    } else {
      key = 'anonymous';
      label = 'Anonymous / unnamed';
      anonymous = true;
    }
    const cur = map.get(key) ?? { key, personId: person ? person.id : null, label, cents: 0, count: 0, anonymous };
    cur.cents += g.amountCents;
    cur.count += 1;
    map.set(key, cur);
  });
  return Array.from(map.values()).sort((a, b) =>
    a.anonymous !== b.anonymous ? (a.anonymous ? 1 : -1) : b.cents - a.cents
  );
}
