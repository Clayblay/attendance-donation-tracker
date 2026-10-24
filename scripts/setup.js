// One-time setup: installs everything at the exact versions Expo SDK 58 expects.
const { execSync } = require('child_process');

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(
    `\nYour Node.js is v${process.versions.node}. Expo SDK 58 needs v22.13 or newer.\n` +
      'Download the LTS version from https://nodejs.org, install it, open a NEW terminal, and try again.\n'
  );
  process.exit(1);
}

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  run('npm install');
  run(
    'npx expo install expo-router expo-constants expo-linking expo-status-bar expo-font ' +
      'expo-splash-screen expo-system-ui @react-native-async-storage/async-storage react-native-screens ' +
      'react-native-safe-area-context react-native-gesture-handler react-native-web react-dom ' +
      '@expo/vector-icons expo-print'
  );
  run('npm install --save-dev typescript@~6.0.3 @types/react@~19.2.0');
  run('npx expo install --fix');
  console.log('\nSetup finished. Start the app with:  npm run web\n');
} catch (e) {
  console.error('\nSetup stopped because a step failed. Copy the red text above and ask for help.\n');
  process.exit(1);
}
