import { Ionicons } from '@expo/vector-icons';
import { newUid } from '@/lib/ids';
import { GivingKind, GivingOpportunity } from '@/lib/types';

export const GIVING_KINDS: GivingKind[] = ['tithe', 'offering', 'dues', 'special', 'other'];

export const GIVING_KIND_LABEL: Record<GivingKind, string> = {
  tithe: 'Tithe',
  offering: 'Offering',
  dues: 'Dues',
  special: 'Special occasion',
  other: 'Other',
};

export const GIVING_KIND_ICON: Record<GivingKind, keyof typeof Ionicons.glyphMap> = {
  tithe: 'wallet-outline',
  offering: 'gift-outline',
  dues: 'card-outline',
  special: 'star-outline',
  other: 'ellipse-outline',
};

/** Starting list for a new install. All of these can be edited or deleted. */
export function defaultGiving(): GivingOpportunity[] {
  const now = new Date().toISOString();
  const make = (name: string, kind: GivingKind): GivingOpportunity => ({
    id: newUid(),
    name,
    kind,
    description: '',
    active: true,
    createdAt: now,
  });
  return [make('Tithes', 'tithe'), make('Offerings', 'offering'), make('Dues', 'dues')];
}
