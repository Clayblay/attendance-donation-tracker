import { PersonType } from '@/lib/types';

export const ID_PREFIX: Record<PersonType, string> = {
  member: 'M',
  contributor: 'C',
  visitor: 'V',
};

export const TYPE_LABEL: Record<PersonType, string> = {
  member: 'Member',
  contributor: 'Contributor',
  visitor: 'Visitor',
};

export const TYPE_LABEL_PLURAL: Record<PersonType, string> = {
  member: 'Members',
  contributor: 'Contributors',
  visitor: 'Visitors',
};

/** Last number "used" before the first person of each type. Members start at M1001. */
export const ID_START: Record<PersonType, number> = {
  member: 1000,
  contributor: 0,
  visitor: 0,
};

export const PERSON_TYPES: PersonType[] = ['member', 'contributor', 'visitor'];

/** formatId('member', 7) -> "M0007" */
export function formatId(type: PersonType, n: number): string {
  return ID_PREFIX[type] + String(n).padStart(4, '0');
}

export function newUid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
