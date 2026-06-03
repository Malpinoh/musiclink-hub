# MDISTRO LINK Major Upgrade — Implementation Plan

This is a large multi-area upgrade. I'll split it into 7 tracks, sequenced by risk and dependency. Several items (analytics fix, audio fix, performance) are bug fixes I can ship quickly. Others (true Spotify pre-save, ad monetization, full customization) are net-new systems that need scoping decisions before I touch code.

---

## Track 1 — Analytics Total Clicks Fix (CRITICAL, ship first)

**Diagnosis**

- DB has ~2,437 clicks, dashboard shows 1,000 → classic PostgREST 1k row cap.
- Last upgrade already added `get_campaign_totals` RPC for the **Campaign** dashboard, but the **Artist Dashboard** (`src/pages/Dashboard.tsx`) and `FanlinkAnalytics.tsx` / `PreSaveAnalytics.tsx` still do `.select("...").eq(...)` and count the returned array.

**Fix**

- Audit every analytics query in: `Dashboard.tsx`, `FanlinkAnalytics.tsx`, `PreSaveAnalytics.tsx`, `CampaignDashboard.tsx`, `ArtistBioPage` analytics.
- Replace counting-by-array with `select("*", { count: "exact", head: true })`.
- Add RPCs for the artist dashboard totals (clicks + analytics_events + artist_link_clicks + pre_save_actions) in a single round trip.
- Add a small **"Analytics verification"** card (raw DB count vs dashboard count vs diff) — owner-only.
- Wire a Supabase Realtime subscription on `clicks` + `pre_save_actions` to invalidate the dashboard query so totals refresh live.
- Ensure all analytics are calculated from actual database records and never from paginated query results.
- Audit every dashboard card showing clicks, views, pre-saves, conversions, fan captures, and campaign performance.
- Add a system-wide analytics integrity checker for adm

---

## Track 2 — Preview Audio Fix (CRITICAL, ship with Track 1)

**Diagnosis**

- Player already stops at `previewEnd`, but actual processed preview blob may be shorter than expected because `audioProcessing.ts` trims to `end - start` only if the source decodes fully; on M4A/some MP3s decoding fails silently and we upload a clipped file.

**Fix**

- Rewrite `audioProcessing.ts`:
  - Decode via `OfflineAudioContext` with full-duration buffer; if decode fails, fall back to server-side trim via a new edge function (`process-audio-preview`) using ffmpeg-wasm or just upload original + use `previewStart/End` on playback.
  - Verify output blob duration === `end - start` ± 50ms; log + toast on mismatch.
- Make `AudioPreviewPlayer` always trust `previewEnd` from DB (already does) but clamp to actual audio duration once metadata loads.
- Accept MP3/WAV/M4A explicitly; reject others with a clear error.
- The selected preview must always play the exact duration selected by the artist.
- If artist selects 30 seconds, fan must hear the full 30 seconds.
- If artist selects 20 seconds, fan must hear the full 20 seconds.
- Audio preview should preload quickly and not buffer excessively.

---

## Track 3 — True Spotify Pre-Save System (NEW, biggest item)

This is a real product, not a quick fix. I want to confirm scope before building.

**What I'll build by default:**

1. **Fan capture before OAuth**: gate the Spotify auth button behind a Name + Email form. Store in `presave_fans` (already exists), then redirect to Spotify OAuth.
2. **OAuth scopes**: `user-library-modify user-follow-modify playlist-modify-public playlist-modify-private user-read-email`.
3. **Token storage**: already in `pre_save_actions` (access + refresh + expiry). Add `fan_id` FK linking back to `presave_fans`.
4. **Release-day worker** (`execute-presave-library-saves` exists — needs hardening):
  - Refresh expired tokens.
  - `PUT /me/tracks` (Liked Songs) for every fan.
  - Optional: `PUT /me/following` (artist follow) + `POST /playlists/{id}/tracks` if the artist configured a target playlist.
  - Per-fan status row (success / failure / error_message) in new `presave_save_results` table.
5. **Dashboard metrics**: Total Pre-Saves, Saves Completed, Failed, Delivery Rate, Conversion Rate (presaves / page views), Top Countries, fan email export (CSV).

**Open questions before I build:**

- Confirm we want Name + Email **required before** the Spotify button (vs. after auth, prefilled from Spotify profile)? Spec says before — I'll go with that. 
- Auto-follow artist + auto-add to playlist: toggle per campaign, default **off**? yes
- Spotify dev app: redirect URI must include production + preview domains. I'll list what needs to be added in Spotify Dashboard. ok list it 
  and also do this
- Name and Email are mandatory before Spotify authentication.
- Store fan country, device type, browser, and referral source.
- Support automatic release-day save to:
  - Spotify Liked Songs
  - Artist Follow (optional)
  - Playlist Add (optional)
- Artist must be able to export fan data as CSV.

---

## Track 4 — Pre-Save Page Customization

New table `pre_save_themes` (mirrors `link_themes`):

- background_image_url, hero_image_url, artist_image_url
- background_color, text_color, button_color, accent_color
- font_family, countdown_enabled, cta_text
- section_order (jsonb array)

UI:

- New "Customize" tab in `EditPreSave.tsx` with live preview iframe (renders `PreSavePage` with draft theme via URL param or context).
- Reuse the `ThemeCustomizer` pattern from fanlinks.
- Add multiple professional templates.
- Allow artist branding:
  - Logo
  - Artist image
  - Background image
  - Colors
  - Fonts
  - CTA text
- Mobile responsive on all devices.

---

## Track 5 — Ad Monetization Infrastructure

Foundation only (no live ad network until artist opts in):

- New tables: `ad_placements` (where), `ad_impressions` (when/who), `ad_revenue` (calculated), `artist_revenue_share` (config).
- `AdSlot` React component with placements: `preview-pre-roll`, `presave-pre-complete`.
- Pluggable provider interface; ship a `HouseAdProvider` (own promo) by default, scaffold for `GoogleAdManagerProvider` (requires GAM account — user adds when ready).
- Revenue dashboard: impressions, eCPM, gross, artist share %, payout owed.
- Build the system in a way that future artist revenue sharing is possible.
- Track:
  - Impressions
  - Clicks
  - Revenue
  - Artist Share
  - Platform Share
- Support future Google Ad Manager integration without requiring another database redesign.

I will **not** integrate Google Ad Manager in this pass — it needs a GAM publisher account, ad units, and approval. I'll scaffold the integration point and document what to do next.

---

## Track 6 — Performance

- Convert remaining heavy routes to `React.lazy` (Edit pages, Analytics pages).
- `React.memo` + `useMemo` on dashboard cards.
- Add indexes (if not yet present) on `analytics_events(user_id, created_at)`, `artist_link_clicks(clicked_at)`.
- Image: `loading="lazy"` + `decoding="async"` audited across all templates.
- Service-worker style cache for static assets (vite already does hashing; add `Cache-Control` headers via meta or vercel.json).
- Query client `staleTime` 60s for dashboard, `gcTime` 5m.

---

## Track 7 — Unique Campaign Templates (Polish pass)

Last upgrade already rebuilt the 4 templates. This pass goes further to **differentiate workflows**:

- **Song Release**: keep current; add "smart link" tab as primary CTA.
- **Music Video Launch**: full-bleed video hero, premiere chat ticker.
- **Album/EP**: vertical scroll-snap per track with mini-player.
- **Concert**: ticket-purchase-first flow, RSVP secondary, venue map primary.
- Make every campaign type completely different:
  New Song Release:
  - Release countdown
  - Smart links
  - Fan capture
  Music Video Launch:
  - Video-first layout
  - Premiere countdown
  - Video engagement analytics
  Album / EP Launch:
  - Tracklist showcase
  - Multi-song previews
  - Album-focused design
  Concert Promotion:
  - Venue information
  - RSVP collection
  - Ticket purchase flow
  - Event countdown
  &nbsp;

Distinct **setup wizards** in `CreateCampaign.tsx` per template (different fields, not just same form with different labels).

---

## Suggested ship order (and what I'll touch)

1. **Track 1 + 2** (analytics + audio) — small, critical, ~6 files + 1 migration. **Ship first.**
2. **Track 6** (perf) — small, low risk.
3. **Track 4** (customization) — 1 migration + 2 components.
4. **Track 3** (true Spotify pre-save) — biggest; 1 migration, edge function hardening, new fan-gate UI.
5. **Track 5** (ad scaffolding) — 1 migration + ad slot components.
6. **Track 7** (template differentiation polish).

---

## Before I start — please confirm

1. **Spotify**: Name + Email required **before** OAuth button (per your spec) — confirm yes. yes 
2. **Auto-follow & auto-add-to-playlist**: ship as **per-campaign toggles, default off**? YES 
3. **Ad monetization**: scaffold only this pass (house ads + DB + dashboard), with GAM as a documented next step — OK? YES
4. **Order**: ship Tracks 1+2+6 now in one batch, then continue with 3/4/5/7 in follow-ups? Or do you want everything in one giant batch (much longer, higher risk)? YES everything in one gaint batch

Reply with answers (or "all defaults, ship in order") and I'll start with Track 1+2 immediately.