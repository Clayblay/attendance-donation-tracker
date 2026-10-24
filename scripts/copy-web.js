// Copies the Expo web export (./dist) into ./desktop/web for Electron.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'dist');
const dest = path.join(__dirname, '..', 'desktop', 'web');

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error('dist/index.html not found. Run "npx expo export --platform web" first.');
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Copied web build to desktop/web');
