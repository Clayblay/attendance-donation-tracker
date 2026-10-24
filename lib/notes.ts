import { formatLong } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { AppData, Note, NoteCategory, NoteInput, NoteTargetKind } from '@/lib/types';

export const NOTE_CATEGORIES: NoteCategory[] = ['general', 'followup', 'prayer', 'reminder'];

export const NOTE_CATEGORY_LABEL: Record<NoteCategory, string> = {
  general: 'General',
  followup: 'Follow-up',
  prayer: 'Prayer',
  reminder: 'Reminder',
};

export const TARGET_KIND_LABEL: Record<NoteTargetKind, string> = {
  none: 'Nothing (general note)',
  person: 'A person',
  gift: 'A gift',
  attendance: 'An attendance record',
};

/** Follow-ups and reminders can be marked done. */
export const isTodo = (n: Pick<Note, 'category'>): boolean => n.category === 'followup' || n.category === 'reminder';

export const noteToInput = (n: Note): NoteInput => ({
  text: n.text,
  category: n.category,
  pinned: n.pinned,
  done: n.done,
  targetKind: n.targetKind,
  targetId: n.targetId,
});

export function countNotes(data: AppData, kind: NoteTargetKind, id: string): number {
  return data.notes.filter((n) => n.targetKind === kind && n.targetId === id).length;
}

/** A readable description of the thing a note is attached to, or null if it no longer exists. */
export function describeTarget(kind: NoteTargetKind, id: string, data: AppData): string | null {
  if (kind === 'person') {
    const p = data.people.find((x) => x.id === id);
    return p ? `${p.name} (${p.displayId})` : null;
  }
  if (kind === 'gift') {
    const g = data.gifts.find((x) => x.id === id);
    if (!g) return null;
    const donor = g.personId ? data.people.find((x) => x.id === g.personId)?.name : g.donorLabel;
    return `${formatMoney(g.amountCents)} · ${donor || 'Anonymous'} · ${formatLong(g.date)}`;
  }
  if (kind === 'attendance') {
    const r = data.attendance.find((x) => x.id === id);
    if (!r) return null;
    return `${data.eventTypes.find((e) => e.id === r.eventTypeId)?.name ?? 'Event'} · ${formatLong(r.date)}`;
  }
  return null;
}

const KIND_PREFIX: Record<Exclude<NoteTargetKind, 'none'>, string> = {
  person: 'Person',
  gift: 'Gift',
  attendance: 'Attendance',
};

/** Text shown under a note, such as "Person: Jane Smith (M1001)". */
export function attachLabel(note: Note, data: AppData): string | null {
  if (note.targetKind === 'none') return note.targetLabel ? `Was attached to ${note.targetLabel}` : null;
  const d = describeTarget(note.targetKind, note.targetId, data);
  return `${KIND_PREFIX[note.targetKind]}: ${d ?? '(no longer available)'}`;
}
