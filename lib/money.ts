/** "1,250.5" -> 125050 (cents). Returns null if the text is not a valid amount. */
export function parseAmount(text: string): number | null {
  const t = text.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return null;
  const [whole, frac = ''] = t.split('.');
  const cents = parseInt(whole, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
  return Number.isFinite(cents) ? cents : null;
}

/** 125050 -> "$1,250.50" */
export function formatMoney(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = String(abs % 100).padStart(2, '0');
  return `${neg ? '-' : ''}$${whole}.${frac}`;
}

/** 125050 -> "1250.50" (for editing in a text box) */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
