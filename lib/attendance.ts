import { newUid } from '@/lib/ids';
import { AttendanceRecord, EventType } from '@/lib/types';

/** Starting list for a new install. All of these can be edited or deleted. */
export function defaultEvents(): EventType[] {
  const now = new Date().toISOString();
  const make = (name: string): EventType => ({ id: newUid(), name, description: '', active: true, createdAt: now });
  return [make('Sunday Service'), make('Midweek Service')];
}

/** Named people checked off, plus the unnamed headcount. */
export const totalAttendance = (r: AttendanceRecord): number => r.personIds.length + r.otherCount;
