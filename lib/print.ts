import * as Print from 'expo-print';
import { Platform } from 'react-native';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A gift line produced by the {{gift_list}} field: "03/05/2026 — Tithes — $50.00". */
const GIFT_LINE = /^(\d{2}\/\d{2}\/\d{4}) — (.+) — (-?\$[\d,]+\.\d{2})$/;

/** Turns the statement text into a clean printable page, with the gift lines laid out as a table. */
export function buildStatementHtml(orgName: string, title: string, body: string): string {
  const out: string[] = [];
  let rows: string[] = [];
  const flush = () => {
    if (rows.length) {
      out.push(`<table>${rows.join('')}</table>`);
      rows = [];
    }
  };
  body.split('\n').forEach((line) => {
    const m = line.match(GIFT_LINE);
    if (m) {
      rows.push(`<tr><td>${esc(m[1])}</td><td>${esc(m[2])}</td><td class="amt">${esc(m[3])}</td></tr>`);
    } else {
      flush();
      out.push(line.trim() === '' ? '<div class="sp"></div>' : `<div>${esc(line)}</div>`);
    }
  });
  flush();

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; color: #111; margin: 48px; line-height: 1.45; }
    h1 { font-size: 20pt; margin: 0 0 2px; }
    h2 { font-size: 13pt; font-weight: normal; color: #444; margin: 0 0 24px; padding-bottom: 12px; border-bottom: 2px solid #111; }
    .sp { height: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    td { padding: 5px 8px; border-bottom: 1px solid #ccc; }
    td.amt { text-align: right; white-space: nowrap; }
  </style></head><body><h1>${esc(orgName || 'Giving statement')}</h1><h2>${esc(title)}</h2>${out.join('')}</body></html>`;
}

/** Opens the print dialog (where "Save as PDF" is also available). */
export async function printHtml(html: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await Print.printAsync({ html });
    return;
  }
  // Web and desktop: print from a hidden frame so only the statement is printed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = (globalThis as any).document;
  const iframe = doc.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  doc.body.appendChild(iframe);
  const w = iframe.contentWindow;
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
    setTimeout(() => doc.body.removeChild(iframe), 1500);
  }, 300);
}
