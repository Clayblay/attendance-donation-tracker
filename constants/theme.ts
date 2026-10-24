import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, getPalette } from '@/constants/palettes';
import { liftForDark, normalizeHex, readableOn } from '@/lib/color';
import { useData } from '@/lib/store';
import { NoteCategory, PersonType } from '@/lib/types';

export type Theme = Colors & { isDark: boolean };

/** The colours currently in use, based on the chosen palette, mode and custom accent. */
export function useTheme(): Theme {
  const system = useColorScheme();
  const { data } = useData();
  const { themeMode, paletteId, customAccent } = data.settings;
  const isDark = themeMode === 'system' ? system === 'dark' : themeMode === 'dark';

  return useMemo(() => {
    const palette = getPalette(paletteId);
    let colors: Colors = isDark ? palette.dark : palette.light;
    const accent = normalizeHex(customAccent);
    if (accent) {
      const primary = isDark ? liftForDark(accent) : accent;
      colors = { ...colors, primary, onPrimary: readableOn(primary) };
    }
    return { ...colors, isDark };
  }, [isDark, paletteId, customAccent]);
}

/** Colour used for each kind of person (badges, chips). */
export function typeColor(theme: Theme, type: PersonType): string {
  if (type === 'member') return theme.primary;
  if (type === 'contributor') return theme.gold;
  return theme.blue;
}

export function noteColor(theme: Theme, category: NoteCategory): string {
  if (category === 'followup') return theme.gold;
  if (category === 'prayer') return theme.blue;
  if (category === 'reminder') return theme.primary;
  return theme.textMuted;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const MAX_CONTENT_WIDTH = 1040;
