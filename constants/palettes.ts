import { readableOn } from '@/lib/color';

export type Colors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  gold: string;
  blue: string;
  danger: string;
  overlay: string;
  tabBar: string;
  inputBg: string;
};

export type PaletteDef = { id: string; name: string; light: Colors; dark: Colors };

type Spec = {
  lbg: string; lalt: string; lborder: string; ltext: string; lmuted: string; lprimary: string; lgold: string; lblue: string;
  dbg: string; dsurface: string; dalt: string; dborder: string; dtext: string; dmuted: string; dprimary: string; dgold: string; dblue: string; dtab: string;
};

function make(id: string, name: string, s: Spec): PaletteDef {
  return {
    id,
    name,
    light: {
      background: s.lbg, surface: '#FFFFFF', surfaceAlt: s.lalt, border: s.lborder, text: s.ltext, textMuted: s.lmuted,
      primary: s.lprimary, onPrimary: readableOn(s.lprimary), gold: s.lgold, blue: s.lblue,
      danger: '#C0392B', overlay: 'rgba(10, 25, 22, 0.45)', tabBar: '#FFFFFF', inputBg: '#FFFFFF',
    },
    dark: {
      background: s.dbg, surface: s.dsurface, surfaceAlt: s.dalt, border: s.dborder, text: s.dtext, textMuted: s.dmuted,
      primary: s.dprimary, onPrimary: readableOn(s.dprimary), gold: s.dgold, blue: s.dblue,
      danger: '#F0766A', overlay: 'rgba(0, 0, 0, 0.6)', tabBar: s.dtab, inputBg: s.dbg,
    },
  };
}

export const PALETTES: PaletteDef[] = [
  make('forest', 'Forest', {
    lbg: '#F4F6F2', lalt: '#EBF0E9', lborder: '#DDE3DC', ltext: '#14302B', lmuted: '#5B6F69', lprimary: '#1F7A6B', lgold: '#B9831F', lblue: '#3F63C4',
    dbg: '#0E1917', dsurface: '#16262A', dalt: '#1D3236', dborder: '#24403C', dtext: '#EAF1EE', dmuted: '#9DB3AC', dprimary: '#4DB8A3', dgold: '#E0AE4A', dblue: '#8FA9F0', dtab: '#12211F',
  }),
  make('ocean', 'Ocean', {
    lbg: '#F2F6FA', lalt: '#E5EDF5', lborder: '#D3DEE9', ltext: '#0F2A43', lmuted: '#566B80', lprimary: '#1565C0', lgold: '#B7791F', lblue: '#00838F',
    dbg: '#0B1620', dsurface: '#122434', dalt: '#1A3247', dborder: '#25445E', dtext: '#E8F1F8', dmuted: '#9FB5C8', dprimary: '#64B5F6', dgold: '#E5B25D', dblue: '#4DD0E1', dtab: '#0F1E2C',
  }),
  make('sunset', 'Sunset', {
    lbg: '#FAF5F0', lalt: '#F3E8DE', lborder: '#E8D9CB', ltext: '#3A2218', lmuted: '#7A6354', lprimary: '#C4491A', lgold: '#A8741A', lblue: '#3E5FB8',
    dbg: '#1A110C', dsurface: '#271A13', dalt: '#35241A', dborder: '#4A3426', dtext: '#F6EBE3', dmuted: '#C0A998', dprimary: '#FF8A50', dgold: '#F0B957', dblue: '#8FA8F0', dtab: '#21150F',
  }),
  make('royal', 'Royal', {
    lbg: '#F6F3FA', lalt: '#ECE6F5', lborder: '#DDD3EA', ltext: '#261438', lmuted: '#6B5A80', lprimary: '#6A3FA0', lgold: '#B07D1A', lblue: '#2F6FB5',
    dbg: '#130D1C', dsurface: '#1E1530', dalt: '#2A1F42', dborder: '#3B2D5A', dtext: '#F0EAF8', dmuted: '#B5A6CC', dprimary: '#B58CFF', dgold: '#E6B650', dblue: '#7FB0F0', dtab: '#19112A',
  }),
  make('rose', 'Rose', {
    lbg: '#FBF4F6', lalt: '#F5E6EA', lborder: '#EBD5DB', ltext: '#3B1824', lmuted: '#7D5A66', lprimary: '#B0305A', lgold: '#A9741B', lblue: '#3F63C4',
    dbg: '#1B0F14', dsurface: '#281822', dalt: '#36202D', dborder: '#4D2E3D', dtext: '#F8EAEF', dmuted: '#CBA9B6', dprimary: '#FF7A9E', dgold: '#EDB85A', dblue: '#8FA9F0', dtab: '#22131A',
  }),
  make('graphite', 'Graphite', {
    lbg: '#F3F4F5', lalt: '#E8EAEC', lborder: '#D8DBDE', ltext: '#1C2227', lmuted: '#5D676F', lprimary: '#37474F', lgold: '#A67A1B', lblue: '#3A62B8',
    dbg: '#101214', dsurface: '#1A1E21', dalt: '#252A2E', dborder: '#343A40', dtext: '#ECEFF1', dmuted: '#A3ADB5', dprimary: '#90A4AE', dgold: '#E0B04F', dblue: '#8FA9F0', dtab: '#15181A',
  }),
];

export const DEFAULT_PALETTE_ID = 'forest';

export function getPalette(id: string): PaletteDef {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
