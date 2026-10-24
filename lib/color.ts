/** "7b3fa0", "#7B3FA0" or "#7bf" -> "#7B3FA0", or null if it is not a valid colour. */
export function normalizeHex(input: string): string | null {
  const t = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(t)) {
    return `#${t.split('').map((c) => c + c).join('').toUpperCase()}`;
  }
  return null;
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Dark or white text, whichever reads better on this background. */
export function readableOn(bg: string): string {
  return luminance(bg) > 0.179 ? '#0B1513' : '#FFFFFF';
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  const h = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${h(r1, r2)}${h(g1, g2)}${h(b1, b2)}`.toUpperCase();
}

/** Very dark accents are hard to see on dark backgrounds, so lighten them. */
export function liftForDark(hex: string): string {
  return luminance(hex) < 0.18 ? mix(hex, '#FFFFFF', 0.45) : hex;
}
