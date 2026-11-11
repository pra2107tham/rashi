# Rashi — Android app

Expo (SDK 57) + React Native app for the Rashi backend in `../functions`. Screens follow the
"Rashi — App UI/UX" design: dark night sky, gold `#E8A33D`, Cormorant / Work Sans / Hind Vadodara.

```
src/app/            screens (Expo Router)
  onboarding/       language → welcome → name → birth date → time → place → focus → phone → OTP → reveal
  (tabs)/           home · match · ask
  reading/[period]  full daily/weekly/monthly reading
  paywall, settings
src/components/     Txt (picks Latin/Devanagari font), Art (backdrop, constellation), ui, cards
src/lib/            firebase.ts (all native Firebase), api.ts (typed callables), store, i18n, query cache
```

How it fits together:
- **Sign-in**: anonymous on first launch, so onboarding can already call the backend. The phone OTP step
  links the number to that account; a number that already has an account signs into it instead.
- **Data**: every call goes through Cloud Functions (`src/lib/api.ts`). TanStack Query caches responses
  in MMKV, so the last readings open offline.
- **Push**: after onboarding the app asks for notification permission and registers its FCM token
  with your timezone; `dailyPush` sends the morning reading.
- **Payments**: the paywall is built, but buying shows "coming soon". Play Billing only works for apps
  installed from the Play Store; it gets wired when the Play Console is set up.

## One-time setup

1. **Firebase console → Authentication → Sign-in method**: enable **Anonymous** and **Phone**.
   Under Phone, add a test number (e.g. `+91 99999 00000` / `123456`) to log in without SMS.
2. **Deploy the backend** (adds `searchPlaces` and `getChatHistory`):
   `cd ../functions && npm ci && firebase deploy --only functions`
3. **Link the app to your Expo account** (once): `npm ci && npx eas-cli@latest login && npx eas-cli@latest init`.
   This writes your EAS project id into `app.json`; commit that change.

## Build an APK to install

```sh
npm run build:apk          # = eas build --profile preview --platform android
```

EAS builds in the cloud (~10–15 min) and prints a link/QR code; open it on your phone to install.

After the first build, add the signing key's fingerprints to Firebase so phone sign-in works without
a captcha: `npx eas-cli@latest credentials -p android` → copy **SHA-1** and **SHA-256** →
Firebase console → Project settings → your Android app → *Add fingerprint*.

## Development

```sh
npm run typecheck && npm run lint
npm run web                # browser preview with canned data (src/lib/firebase.web.ts)
npm run build:dev          # dev-client APK once, then `npm start` for live reload on the phone
```

The app can't run in Expo Go: React Native Firebase and MMKV need a development build.
