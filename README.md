# Rashi backend

Firebase backend for the Rashi Android app: Cloud Functions (Node 22, TypeScript) + Firestore + FCM. All readings, kundli narratives, chat replies and notification copy are generated through OpenRouter's Auto Router (`openrouter/auto`), which picks a model per request from the cheapest cost tier.

Astrology math is deterministic and server-side. It computes the sidereal (Lahiri) Moon and Mars with `astronomy-engine`, the ascendant when birth time is known, nakshatra/pada, and Ashtakoot Guna Milan. The LLM only writes the words around those facts.

## Layout

```
firebase.json, firestore.rules, firestore.indexes.json
functions/src/
  config.ts          models, product catalog, limits, secrets/params
  astro/             ephemeris, nakshatra, chart, ashtakoot (8 kootas / 36), manglik
  prompts/           versioned prompt templates (en + hi) and output schemas
  lib/               OpenRouter client, AES-GCM PII encryption, dates/slots, rate limit, Play API
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
| `createMatch` | `userRole: groom\|bride, other: {name, birthDate, birthTime?, placeName, lat, lng}` | Deterministic score plus an LLM-written narrative, cached per pair |
| `sendChatMessage` | `text` | Costs 1 credit, which is refunded if generation fails |
| `deleteAccount` | `confirm: true` | Deletes profile, readings, chat and matches. Purchase records are kept but unlinked from the user |
| `dailyPush` | (scheduled) | Users whose `notify.utcSlot` matches the current 15-minute slot: pre-generate today's reading, send the push, prune dead tokens |
| `playRtdn` | (Pub/Sub `play-rtdn`) | Subscription renewals, expiry and holds; revokes refunded purchases |

The app reads `users/{uid}`, `users/{uid}/chat`, `readings/{id}` (teaser only), `entitlements/{uid}` and `matches/{id}` directly from Firestore. Clients cannot write anything, and birth data (`users/{uid}/private/birth`), full reading content and purchases are server-only. See `firestore.rules`.

The client sends `lat`/`lng` from its place picker. The server derives the IANA timezone (`geo-tz`) and uses historical offsets (`luxon`) to convert the birth time.

## Setup

1. The Firebase project is `rashi-astro` (set in `.firebaserc`). It must be on the **Blaze** plan, because the free plan blocks outbound calls to OpenRouter.
2. Enable Firestore, Phone Auth, App Check (Play Integrity) and Cloud Messaging.
3. Set secrets:
   ```sh
   firebase functions:secrets:set OPENROUTER_API_KEY
   openssl rand -base64 32 | firebase functions:secrets:set PII_ENC_KEY --data-file=-
   # Play Billing comes later. Until then, set a placeholder so the deploy succeeds:
   echo '{}' | firebase functions:secrets:set PLAY_SERVICE_ACCOUNT --data-file=-
   ```
   Keep a backup of `PII_ENC_KEY`: without it, stored birth data can't be decrypted.
4. Play Console (later):
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
npm run test:integration    # Firestore emulator (needs Java); OpenRouter, Play and FCM are mocked
npm run serve               # local emulators (put OPENROUTER_API_KEY in functions/.secret.local for real calls)
```

## Live smoke test (real AI calls)

`functions/scripts/smoke.ts` sends 6 real OpenRouter requests through the same prompts, schemas and client the deployed functions use. It generates today's reading in English and Hindi, a kundli match in Hindi, a chat reply, and two push notifications. At the end it prints each output and a table showing which model the Auto Router picked, its latency, tokens and cost. It doesn't touch Firestore and needs no credentials other than the OpenRouter key.

```sh
cd functions
OPENROUTER_API_KEY=$(firebase functions:secrets:access OPENROUTER_API_KEY) npm run smoke
npm run smoke -- --only=match     # or reading | chat | notification
```

## Notes

- **Models and cost:** every call uses `openrouter/auto` with `cost_tier: "low"`, restricted to endpoints that support the parameters we send (JSON schema output). A hard price ceiling of $1 input / $4 output per million tokens is also set. Change these in `LLM` (`functions/src/config.ts`), or in your OpenRouter workspace's Routing settings. Each call logs the model picked and its cost (`llm.call`). Chat passes a `session_id` so a conversation stays on one model.
- **Prompt versions:** each generated document stores `promptVersion`. Bumping `READING_PROMPT_VERSION` regenerates readings on the next open. Profile edits also invalidate cached readings through `profileRev`.
- **Latency:** the 3-second target is mostly met by pre-generating `today` in `dailyPush`, so the morning open is a cache hit.
- **Ashtakoot:** dosha cancellation rules (parihara) are not applied. Manglik is checked from the Moon and, when the birth time is known, from the lagna.
