import { toCsv } from '@/lib/reports';
import { Counts, countsOf } from '@/lib/syncEngine';
import { AppData } from '@/lib/types';

export const BACKUP_APP = 'attendance-tracker';

export type BackupFile = { app: typeof BACKUP_APP; version: 1; exportedAt: string; data: AppData };

export function buildBackup(data: AppData, now: Date = new Date()): string {
  const file: BackupFile = { app: BACKUP_APP, version: 1, exportedAt: now.toISOString(), data };
  return JSON.stringify(file, null, 2);
}

export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `attendance-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

export type ParsedBackup =
  | { ok: true; data: Partial<AppData>; counts: Counts; exportedAt: string }
  | { ok: false; error: string };

/** Checks that text really is a backup from this app, and counts what is inside. */
export function parseBackup(text: string): ParsedBackup {
  const t = text.trim();
  if (!t) return { ok: false, error: 'Nothing to check yet. Choose a backup file or paste the backup text.' };
  let obj: unknown;
  try {
    obj = JSON.parse(t);
  } catch {
    return { ok: false, error: 'That does not look like a backup. It may be cut off or copied incompletely.' };
  }
  const o = obj as { app?: string; exportedAt?: string; data?: Partial<AppData> };
  const data: Partial<AppData> | undefined = o && o.data && typeof o.data === 'object' ? o.data : (obj as Partial<AppData>);
  if (!data || !Array.isArray(data.people) || !Array.isArray(data.gifts)) {
    return { ok: false, error: 'That file is not a backup from this app (no people or gifts were found in it).' };
  }
  if (o.app && o.app !== BACKUP_APP) return { ok: false, error: 'That file was made by a different app.' };
  return { ok: true, data, counts: countsOf(data), exportedAt: o.exportedAt ?? '' };
}

/** A spreadsheet of everyone on record. */
export function peopleCsv(data: AppData): string {
  const typeLabel = { member: 'Member', contributor: 'Contributor', visitor: 'Visitor' } as const;
  return toCsv([
    ['ID', 'Name', 'Type', 'Email', 'Phone', 'Added'],
    ...[...data.people]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => [p.displayId, p.name, typeLabel[p.type], p.email, p.phone, p.createdAt.slice(0, 10)]),
  ]);
}
