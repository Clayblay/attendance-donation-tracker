import { Platform } from 'react-native';

/** Web and desktop only: save text as a file in the browser's downloads. */
export function downloadTextFile(filename: string, text: string, mime = 'text/plain;charset=utf-8;'): boolean {
  if (Platform.OS !== 'web') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis;
  const blob = new g.Blob([text], { type: mime });
  const url = g.URL.createObjectURL(blob);
  const a = g.document.createElement('a');
  a.href = url;
  a.download = filename;
  g.document.body.appendChild(a);
  a.click();
  g.document.body.removeChild(a);
  g.URL.revokeObjectURL(url);
  return true;
}

/** Web and desktop only: let the person choose a file and read it as text. Resolves to null if they cancel. */
export function pickTextFile(accept = '.json,application/json'): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web') return resolve(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis;
    const input = g.document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files && input.files[0];
      resolve(file ? await file.text() : null);
    };
    input.click();
  });
}
