# ធៀបអនឡាញ · Theab Online — Khmer digital invitations & event management

A Khmer-first SaaS for building cinematic digital invitations (ធៀប), sending every guest a private link, collecting RSVPs and running the event day: seating, QR check-in, gifts and budget.

## Quick start (local)

Requirements: **Node 20+** (22 recommended). No database server needed — local dev uses an embedded PostgreSQL (PGlite) stored in `./.data/`.

```bash
npm install
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='choose-a-password' npm run setup
#   ↳ creates .env.local with a random APP_SECRET, runs migrations, and seeds plans, templates, and your super-admin
npm run dev            # http://localhost:3000
```

Then register, open **បង្កើតកម្មវិធីថ្មី / New event**, and choose an event type. Browse and preview the matching invitation designs directly in the form. Add an invitation message, agenda, or link cover if needed, then create the event and edit it in the builder. After publishing, add guests and open a copied guest link in a private window to check the invitation.

> PGlite allows one process at a time. Stop `npm run dev` before running `npm run db:migrate` / `db:seed`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / production server |
| `npm run setup` | `.env.local` (APP_SECRET) + migrate + seed |
| `npm run db:generate` | Generate a SQL migration after editing `src/lib/db/schema.ts` |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Vitest unit tests (27) |
| `npm run test:e2e` | Playwright end-to-end journey (uses your installed Chrome; start the app first) |

## Production (Vercel + Supabase/Neon Postgres)

1. Create a Postgres database (Supabase, Neon, RDS…). Set `DATABASE_URL`.
2. Set `APP_SECRET` (`openssl rand -base64 32`) and `APP_URL` (your https domain). **Never change APP_SECRET later** — it encrypts the stored copy of guest links.
3. `DATABASE_URL=… npm run db:migrate && npm run db:seed`
4. Uploads: `src/lib/storage/files.ts` writes to local disk. On Vercel (read-only FS) swap its 3 functions for S3 / Cloudflare R2 / Supabase Storage before launch.
5. Optional: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` (then register the webhook — see `src/app/api/telegram/webhook/route.ts`), `ANTHROPIC_API_KEY` for the AI wording assistant.

See `.env.example` for every variable.

## What's built (and verified)

| Area | Status |
|---|---|
| Marketing site (home, templates marketplace, template preview with device frames, pricing, FAQ, about, privacy) | ✅ Khmer + English |
| **16 Khmer templates in 11 genuinely different layout families** (royal frame, ivory arch, Angkor night, lotus, emerald split, sampot silk bands, palm-leaf manuscript, editorial, festive, rice-field village, memorial) | ✅ |
| Original SVG kbach ornament library (chan flower, phni pleung flames, vong hien spirals, lotus, prasat silhouette, sugar palms, hol weave, wax seal) | ✅ drawn in code — no copied artwork |
| Cinematic invitation: envelope + wax seal opening, skip, reduced-motion, music only after tap, countdown (Khmer numerals), schedule, story, gallery + lightbox/swipe, venue/map/ICS/Google Calendar, KHQR gift, RSVP, moderated wishes, thank-you/share | ✅ |
| Email/password auth (scrypt, hashed DB sessions, rate-limited), roles, event team roles (owner/editor/staff/viewer) | ✅ |
| Event wizard (no invented personal details), visual builder: drag-sort sections, add/duplicate/hide/delete, bilingual fields, theme colours, template switch, uploads, music, **undo/redo + coalescing**, autosave with **conflict detection**, version snapshots + restore, mobile/tablet/desktop canvas (real breakpoints via iframe), mobile editor | ✅ |
| Guests: CRUD, groups, CSV import with preview + duplicate detection, CSV export (formula-injection safe), unguessable links (copy, Telegram share, QR, regenerate, revoke) | ✅ |
| RSVP: one-tap, allowance limit, deadline, maybe toggle, dietary/message, history, owner override, row-locked against races | ✅ |
| Seating planner (drag tables & guests, capacity warnings, VIP, list-based accessible mode, print, CSV) | ✅ |
| QR check-in (camera: BarcodeDetector + jsQR fallback, manual search, partial check-in, duplicate warning, staff log) | ✅ online-only |
| Gifts & budget (integer minor units, USD/KHR kept separate, no assumed exchange rate) | ✅ |
| Analytics (opens, conversion, groups, seating occupancy) without third-party trackers | ✅ |
| Notifications: in-app + Telegram adapter with idempotency keys & job claiming | ✅ (Telegram needs your bot token) |
| Plans & limits enforced server-side; manual payment flow with admin approval + audit | ✅ |
| Super-admin: overview, users (plan/role), events, template flags, plans/pricing, billing review, audit logs | ✅ |
| Account: profile, language, password change, Telegram link, JSON data export, account deletion | ✅ |
| **Animation on every template**: ambient effects per template (rose petals, lotus petals, gold dust, twinkling stars, confetti, leaves), scroll reveals (up/zoom/blur/fade/slide), Ken Burns photos, ornament draw-in, gold shimmer, glowing names, parallax; owner can pick Full / Subtle / Off and change the effect; respects “reduce motion” | ✅ CSS-driven, deferred until idle |
| **Video**: Video section (upload MP4/MOV/WebM or YouTube link, click-to-load, poster) + cinematic full-screen opening video on the hero; HTTP Range (206) streaming for iPhone Safari | ✅ |
| Bulk photo upload to the gallery (up to 40 at once), photo re-encoding & EXIF/GPS stripping, background music | ✅ |
| Marble & Burgundy Rose template with uploadable hand-drawn directions map, tap-to-call host phones, location QR | ✅ |
| AI wording assistant (never invents names/dates, user must insert manually) | ✅ disabled state until `ANTHROPIC_API_KEY` is set |

**Verification run in development:** typecheck ✓ · production build ✓ · 27 unit tests ✓ · Playwright journey ✓ (register → wizard → edit/autosave → publish → CSV import → guest link → envelope → RSVP → tampered link rejected → dashboard → check-in → seating → exact money totals → cross-tenant 404s) · no horizontal overflow on 24 routes × 7 viewport sizes (320 → 1920).

## Security notes

- Guest links: 144-bit CSPRNG tokens; only SHA-256 hash used for lookup; owner copy stored AES-256-GCM encrypted. Pages send `noindex`, `no-referrer`, `no-store`; guest names never appear in titles/OG previews.
- Every page/action/route re-checks the user's event role on the server (`src/lib/auth/permissions.ts` matrix). Unauthorized = 404 (no existence leak).
- Invitation content is Zod-validated JSON; media references must be internal asset IDs — no user HTML, script or external URLs.
- Uploads: magic-byte sniffing (SVG rejected), size limit, re-encoded with sharp (EXIF/GPS stripped), served with `nosniff` + sandbox CSP.
- Gift QR: lockable; changes require `giftqr.edit`, are audited and notify the owner.
- Rate limits (Postgres-backed) on login, register, RSVP, wishes, uploads, AI.

## Known limitations / next steps

- Google OAuth, email verification & password-reset emails need an email provider (not wired yet).
- File storage is local-disk — replace with S3/R2/Supabase Storage for serverless hosting. Videos are stored as uploaded (no transcoding); ask hosts for MP4 (H.264). On Vercel, request bodies are capped (~4.5 MB), so large videos need direct-to-storage (presigned) uploads — `MAX_VIDEO_MB` (default 60) applies to self-hosted servers.
- Image cropping UI, team-member invitations UI, custom domains, white-label and the Telegram Mini App are not built yet (data model supports team roles).
- Online payment provider not connected (manual ABA/KHQR flow with admin approval is).
- Templates are versioned in code (`registry.ts`) + snapshotted in `template_versions`; a visual template-authoring tool for admins is future work.
- Offline check-in is intentionally not offered (no safe reconciliation yet).
- Template preview photos are illustrated placeholders labelled “Sample”. Drop your own licensed art into templates if you wish.

## Project layout

```
src/app/(marketing)  public site       src/app/(dashboard)  owner app       src/app/(admin)  super admin
src/app/i/[token]    guest invitation  src/app/t/[slug]     template demo   src/app/api/*    media, export, telegram
src/components/invitation  renderer, envelope, ornaments, sections
src/components/builder     visual editor      src/components/dashboard   app screens
src/features/*             server actions + domain logic (events, guests, rsvp, seating, checkin, finance, admin, ai)
src/lib                    db (Drizzle schema), auth, security, storage, telegram, money
drizzle/                   SQL migrations      tests/unit, tests/e2e
```
# e-invitation-online
