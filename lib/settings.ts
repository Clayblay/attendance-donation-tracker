import { DEFAULT_PALETTE_ID, PALETTES } from '@/constants/palettes';
import { normalizeHex } from '@/lib/color';
import { DashboardItemId, DashboardItemPref, EmailApp, Settings, ThemeMode } from '@/lib/types';

export const DASHBOARD_ITEMS: { id: DashboardItemId; label: string; description: string }[] = [
  { id: 'shortcuts', label: 'Quick links', description: 'Buttons for Reports and Giving statements' },
  { id: 'people', label: 'People counts', description: 'Members, contributors and visitors' },
  { id: 'lastAttendance', label: 'Last attendance', description: 'The most recent event and its total' },
  { id: 'notes', label: 'Notes summary', description: 'Open to-dos and pinned notes' },
  { id: 'today', label: "Widget 1: Today's giving", description: "Today's total and this month so far" },
  { id: 'byOccasion', label: 'Widget 2: Giving by occasion', description: 'Year totals for tithes, offerings and more' },
  { id: 'byDonor', label: 'Widget 3: Giving by donor', description: 'Year totals for each donor' },
];

export const DEFAULT_DASHBOARD: DashboardItemPref[] = DASHBOARD_ITEMS.map((i) => ({ id: i.id, visible: true }));

export function defaultSettings(): Settings {
  return {
    themeMode: 'system',
    paletteId: DEFAULT_PALETTE_ID,
    customAccent: '',
    emailApp: 'default',
    dashboard: DEFAULT_DASHBOARD.map((i) => ({ ...i })),
  };
}

const MODES: ThemeMode[] = ['system', 'light', 'dark'];
const EMAIL_APPS: EmailApp[] = ['default', 'gmail', 'outlook'];

/** Fills in anything missing or invalid, so older saved data and bad values never break the app. */
export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  const base = defaultSettings();
  if (!raw) return base;

  const known = new Set<string>(DASHBOARD_ITEMS.map((i) => i.id));
  const seen = new Set<string>();
  const dashboard: DashboardItemPref[] = [];
  (Array.isArray(raw.dashboard) ? raw.dashboard : []).forEach((p) => {
    if (p && known.has(p.id) && !seen.has(p.id)) {
      seen.add(p.id);
      dashboard.push({ id: p.id, visible: p.visible !== false });
    }
  });
  DASHBOARD_ITEMS.forEach((i) => {
    if (seen.has(i.id)) return;
    // Newly added sections go to the top (Quick links) or the end.
    if (i.id === 'shortcuts') dashboard.unshift({ id: i.id, visible: true });
    else dashboard.push({ id: i.id, visible: true });
  });

  return {
    themeMode: MODES.includes(raw.themeMode as ThemeMode) ? (raw.themeMode as ThemeMode) : base.themeMode,
    paletteId: PALETTES.some((p) => p.id === raw.paletteId) ? (raw.paletteId as string) : base.paletteId,
    customAccent: raw.customAccent ? normalizeHex(raw.customAccent) ?? '' : '',
    emailApp: EMAIL_APPS.includes(raw.emailApp as EmailApp) ? (raw.emailApp as EmailApp) : 'default',
    dashboard,
  };
}
