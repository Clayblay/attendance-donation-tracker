# Attendance Tracker (Expo SDK 58)

React Native + Expo app (Expo Router) for tracking attendance and donations.
Runs on Android (Expo Go or EAS build), in a PC / Mac browser, and as a native
Windows / macOS app (Electron).

Sections: Dashboard (3 numbered placeholder widgets), History, Settings.

## Requirements
- Node.js **22.13 or newer** (get the LTS from https://nodejs.org)
- Android phone with **Expo Go** from the Play Store (must be the SDK 58 version)

## Updating to a newer step
Each new zip contains the whole project. Extract it and copy everything inside the `attendance-tracker-sdk57` folder over your existing project folder (choose "Replace the files"). Update zips after Step 2 do not include `package.json`, so your installed packages are left alone. If a step ever adds a package, the notes for that step say to run `npm run setup`. Your saved data is not affected.

## First-time setup
```bash
npm run setup
```
This installs everything at the exact versions Expo SDK 58 needs. It takes a few minutes.

## Run it
```bash
npm run web        # browser on PC / Mac
npm start          # shows a QR code: scan it from inside the Expo Go app on Android
npm run android    # Android emulator / USB-connected phone
```
If the phone can't connect, use `npx expo start --tunnel`.

## Native desktop app (Windows + macOS)
```bash
npm run desktop:install     # one time
npm run desktop:start       # opens the app in a desktop window
npm run desktop:dist:win    # Windows installer (build on Windows)
npm run desktop:dist:mac    # macOS .dmg (build on a Mac)
```
Installers are unsigned until you add code-signing certificates.

## EAS builds
The `development` profile needs `npx expo install expo-dev-client` first (it is not installed by default because it makes `npm start` open a development build instead of Expo Go).

Change `android.package` / `ios.bundleIdentifier` in `app.json` first.
```bash
npm install -g eas-cli
eas login
eas init
eas build --platform android --profile development
eas build --platform android --profile preview
eas build --platform android --profile production
```

## Checks
```bash
npm run typecheck
npm run doctor
```

## Structure
```
app/_layout.tsx            root layout
app/(tabs)/_layout.tsx     tabs: bottom on phones, left sidebar on wide screens
app/(tabs)/index.tsx       Dashboard (widgets 1-3)
app/(tabs)/history.tsx     History
app/(tabs)/settings.tsx    Settings
components/                Screen shell, Widget
constants/theme.ts         light/dark colors
desktop/                   Electron shell for Windows / macOS
scripts/setup.js           one-time dependency setup
scripts/copy-web.js        copies the web export into desktop/web
```

## Roadmap (built step by step)
1. Foundation, organization name, People (add/edit/delete, Member/Contributor/Visitor, auto IDs M1001/C0001/V0001) - done
2. Giving opportunities (tithes, offerings, dues, special occasions)  **<- done**
3. Recording gifts, daily auto-sum, History - done
4. Dashboard widgets, year-to-date totals by occasion and donor - done
5. Attendance (event types, check-off list plus headcount) - done
6. Notes (general, or attached to a person, gift or attendance record) - done
7. Templates: 7a colour palettes + dashboard layout - done; 7b thank-you letters - done; 7c yearly giving statements - done; 7d printable reports - done
8. Logins, forgotten username/password recovery, emailing thank-you letters
9. Extras (export, backup, statements, charts)

## Where data is stored
Data is saved on the device you use (browser storage on web, app storage on Android, the app window on
desktop). Each device has its own copy until online sync is added in Step 8.
