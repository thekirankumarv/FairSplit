<div align="center">

<img src="public/icon-192.png" width="96" height="96" alt="FairSplit">

# FairSplit

Split group expenses and settle up without rounding errors. Works fully offline.

</div>

## What it does

FairSplit keeps track of who paid for what on a group trip, works out what everyone owes, and tells you the smallest set of payments that clears all the debts.

Everything runs on your device. There is no account to create, no server to talk to, and no network request after the app loads. Your trip data lives in browser storage and never leaves the phone.

## Why the math is different

Most splitting apps hold money as floating point numbers, so `0.1 + 0.2` quietly becomes `0.30000000000000004` and a few paise go missing across a long trip.

FairSplit stores every amount as a whole number of paise and never divides in floating point. When an amount cannot be divided evenly, the remainder is handed out one unit at a time instead of being rounded away. Three people splitting one rupee get 34, 33 and 33 paise, which adds back up to exactly 100.

Three rules hold after every operation:

- Each expense's shares add up to the expense total, exactly
- All member balances add up to zero, exactly
- Recommended settlements add up to the total outstanding debt, exactly

The app ships with 17 tests covering these rules. Open Settings and tap Run Tests to run them against the live engine on your own device.

## Features

**Splitting**

- Equal, exact amounts, percentages, shares, or line by line from a bill
- More than one person can pay for a single expense
- Ten expense categories with their own icons
- Rupees, dollars, euros and pounds

**Settling up**

- Net balance per person, and who each balance is owed to
- Debt simplification that cuts the number of transfers to a minimum
- Record part payments and keep a settlement history

**Your data**

- Stored on device, readable offline, no sign in
- Export a full JSON backup or a single trip
- Import a backup to restore or move to another device
- Versioned storage schema with migrations, so old backups keep working

## Running it locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

The dev server runs on http://localhost:3000.

Other scripts:

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build
npm run lint     # TypeScript type check
npm run assets   # regenerate icons and splash screens from assets/logo.svg
```

## Building the Android APK

You need the Android SDK and a JDK between 17 and 21. Gradle will reject newer JDKs.

Point Gradle at the SDK once:

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

Then build:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
npm run android:apk
```

The APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to a phone and install it, or push it to a connected device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

To open the project in Android Studio instead, run `npm run android:open`.

The debug APK is signed with the default debug key, which is fine for testing but not for the Play Store. A release build needs your own keystore, and that keystore must stay out of the repository.

## How it is put together

```
src/
  engine/        money math, with no knowledge of React
    precision.ts          paise conversion, even and ratio distribution
    calculationEngine.ts  shares, balances, debt simplification
    engineTests.ts        invariant tests the app can run on itself
  storage/       localStorage persistence, schema versions, migrations
  components/    screens and dialogs
  types.ts       shared types
scripts/
  generate-assets.mjs     all icons and splash art from one SVG
assets/          logo source and generated launcher art
android/         Capacitor Android project
```

The engine is deliberately separate from the UI. It takes a trip and returns numbers, with no React, no storage and no side effects, which is what makes the invariant tests meaningful.

## Handling system bars

The app draws edge to edge, and every screen edge is padded using the safe area insets the platform reports. Those insets are read once in `src/index.css` and applied through a small set of utility classes, so the top bar clears the status bar and the bottom bar clears the gesture pill on any device. On Android versions that still allow it, the native theme also insets the web view, which covers the same ground from the other side.

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS 4, Capacitor 7, Lucide icons. Plus Jakarta Sans and JetBrains Mono are bundled rather than fetched, so typography is correct with no network.

## License

MIT. See [LICENSE](LICENSE).
