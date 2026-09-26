# Rashi backend

Firebase backend for the Rashi Android app: Cloud Functions (Node 22, TypeScript) + Firestore + FCM, with Claude generating all readings, kundli narratives, chat replies and notification copy.

Astrology math is deterministic and server-side. It computes the sidereal (Lahiri) Moon and Mars with `astronomy-engine`, the ascendant when birth time is known, nakshatra/pada, and Ashtakoot Guna Milan. Claude only writes the words around those facts.

## Layout

```
firebase.json, firestore.rules, firestore.indexes.json
functions/src/
  config.ts          models, product catalog, limits, secrets/params
  astro/             ephemeris, nakshatra, chart, ashtakoot (8 kootas / 36), manglik
  prompts/           versioned prompt templates (en + hi) and output schemas
  lib/               claude wrapper, AES-GCM PII encryption, dates/slots, rate limit, Play API
  services/          profile, readings, entitlements, billing, notifications, match, chat
  handlers/          callable functions (auth + App Check + rate limit + zod)
  scheduled/         dailyPush (every 15 min)
  pubsub/            playRtdn (Play real-time developer notifications)
functions/test/unit, functions/test/integration (Firestore emulator)
```

## Functions

All callables run in `asia-south1` and require Firebase Auth plus App Check. App Check is not enforced in the emulator.

| Function | Input | Notes |
|---|---|---|
| `upsertProfile` | `name, birthDate, birthTime?, placeName, lat, lng, focusArea, language` | Computes the chart and encrypts birth data. The first call grants 3 free chat credits |
| `getProfile` | — | Profile, chart labels, entitlements, and the `playAccountId` to pass as Play Billing `obfuscatedAccountId` |
| `getReading` | `period: today\|week\|month` | Cache-or-generate. Returns the teaser always and `content` when unlocked (`today` is free; see `FREE_FULL_PERIODS`) |
| `verifyPurchase` | `productId, purchaseToken, readingId?` | Verifies with Play, grants once per token, then acknowledges or consumes |
| `registerDevice` | `fcmToken, tz?` | Enables the daily push at the user's local 8 am |
| `updateNotificationPrefs` | `enabled, localHour?` | |
| `createMatch` | `userRole: groom\|bride, other: {name, birthDate, birthTime?, placeName, lat, lng}` | Deterministic score plus a Claude narrative, cached per pair |
| `sendChatMessage` | `text` | Costs 1 credit, which is refunded if generation fails |
| `deleteAccount` | `confirm: true` | Deletes profile, readings, chat and matches. Purchase records are kept but unlinked from the user |
| `dailyPush` | (scheduled) | Users whose `notify.utcSlot` matches the current 15-minute slot: pre-generate today's reading, send the push, prune dead tokens |
| `playRtdn` | (Pub/Sub `play-rtdn`) | Subscription renewals, expiry and holds; revokes refunded purchases |

The app reads `users/{uid}`, `users/{uid}/chat`, `readings/{id}` (teaser only), `entitlements/{uid}` and `matches/{id}` directly from Firestore. Clients cannot write anything, and birth data (`users/{uid}/private/birth`), full reading content and purchases are server-only. See `firestore.rules`.

The client sends `lat`/`lng` from its place picker. The server derives the IANA timezone (`geo-tz`) and uses historical offsets (`luxon`) to convert the birth time.

## Setup

1. Create a Firebase project on the **Blaze** plan (needed for outbound calls to Claude) and put its id in `.firebaserc`.
2. Enable Firestore, Phone Auth, App Check (Play Integrity) and Cloud Messaging.
3. Set secrets:
   ```sh
   firebase functions:secrets:set ANTHROPIC_API_KEY
   openssl rand -base64 32 | firebase functions:secrets:set PII_ENC_KEY --data-file=-
   firebase functions:secrets:set PLAY_SERVICE_ACCOUNT --data-file=play-service-account.json
   ```
   Keep a backup of `PII_ENC_KEY`: without it, stored birth data can't be decrypted.
4. Play Console:
   - Create the products listed in `PRODUCTS` (`functions/src/config.ts`).
   - Grant the service account "View financial data" and "Manage orders and subscriptions".
   - Point Real-time developer notifications at the Pub/Sub topic `projects/<id>/topics/play-rtdn`.
5. Set `PLAY_PACKAGE_NAME` in `functions/.env` (see `functions/.env.example`).
6. Optional: add a Firestore TTL policy on `rateLimits.expireAt` and `locks.expiresAt`.
7. Deploy: `cd functions && npm ci && npm run deploy`.

## Development

```sh
cd functions
npm ci
npm run typecheck && npm run lint
npm test                    # unit: astro, dates, crypto, prompts, chat
npm run test:integration    # Firestore emulator (needs Java); Claude, Play and FCM are mocked
npm run serve               # local emulators
```

## Notes

- **Models:** readings, matches and chat use `claude-sonnet-5` at low effort. Notification copy uses `claude-haiku-4-5`. Change them in `MODELS`.
- **Prompt versions:** each generated document stores `promptVersion`. Bumping `READING_PROMPT_VERSION` regenerates readings on the next open. Profile edits also invalidate cached readings through `profileRev`.
- **Latency:** the 3-second target is mostly met by pre-generating `today` in `dailyPush`, so the morning open is a cache hit.
- **Ashtakoot:** dosha cancellation rules (parihara) are not applied. Manglik is checked from the Moon and, when the birth time is known, from the lagna.
