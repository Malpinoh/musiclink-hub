# Analytics + Templates 2.0 + Audio Fix + Performance

This is a large, multi-area upgrade. I'm proposing it in 4 tracks so you can confirm scope before I start writing code.

## 1. Fix Total Clicks Analytics (critical)

**Root cause (suspected):** Supabase queries default to a 1,000 row cap. `CampaignDashboard.tsx` currently does `select("id, platform_name, ...").gte(...).in("fanlink_id", ids)` then counts the array — so above 1,000 clicks, totals freeze.

**Fix:**
- Replace row-fetching aggregates with `select("*", { count: "exact", head: true })` queries for the headline counters (Total Clicks, Fans, Pre-saves) so we get true counts regardless of size.
- Keep row-level fetches only for the chart and per-campaign breakdowns, but paginate in chunks of 1000 until exhausted (or move aggregation into a SQL RPC).
- Add a small `get_campaign_totals(user_id, start_date)` Postgres function returning aggregated totals per fanlink/presave in a single round trip — fixes both accuracy and the N+1 pattern.
- Add indexes: `clicks(fanlink_id, clicked_at)`, `fan_contacts(link_id, collected_at)`, `pre_save_actions(pre_save_id, created_at)` if missing.
- Validation: log DB total vs dashboard total in a dev assertion; they must match.

## 2. Campaign Templates 2.0

Rebuild each of the 4 template pages as a distinct experience. Today they share too much. Plan:

**Song Release** (`SongReleasePage.tsx`)
- Animated gradient hero, countdown, pre-save CTA, streaming platform cards, fan comments section (new `campaign_comments` table), release progress tracker.

**Music Video Launch** (`VideoLaunchPage.tsx`)
- Cinematic dark theme, embedded YouTube/Vimeo player as hero, premiere countdown, view counter, reaction emojis (new `campaign_reactions` table), share toolkit.

**Album / EP Launch** (`AlbumLaunchPage.tsx`)
- Editorial magazine layout, tracklist with per-track 30s previews (reuses pre-save audio system), album story, credits, collaborators grid, timeline.

**Concert Promotion** (`EventPromotionPage.tsx`)
- Poster-style hero, event countdown, venue card with embedded Google Maps iframe (no API key needed), ticket CTAs, lineup grid, schedule table, RSVP form (new `event_rsvps` table).

**New tables (migration):**
- `campaign_comments(id, campaign_id, name, message, created_at)` — public insert, owner read.
- `campaign_reactions(id, campaign_id, emoji, created_at)` — public insert, owner read.
- `event_rsvps(id, campaign_id, name, email, created_at)` — public insert, owner read.

## 3. Pre-save Audio Preview Fix

Rebuild playback around a single `<audio>` element with proper lifecycle (matches the proven pattern):
- One `useRef<HTMLAudioElement>`, stop-before-play, `canplaythrough` for loading state, cleanup on unmount.
- Use Supabase Storage signed URLs (1h) instead of public URLs so Range requests + progressive loading work reliably on iOS Safari/PWA.
- Waveform: keep existing `waveform_data` jsonb; click-to-seek on the bar.
- Uploader: keep MP3/WAV/AAC/M4A, enforce 30s trim via existing `audioProcessing.ts`, add replace + delete actions wired to storage.
- Apply the same player to album tracklists in template 2.0.

Touches: `AudioPreviewPlayer.tsx`, `AudioPreviewUploader.tsx`, `PreSavePage.tsx`, `EditPreSave.tsx`.

## 4. Performance Optimization

- **Code splitting:** convert heavy routes (`CampaignDashboard`, `FanlinkAnalytics`, `PreSaveAnalytics`, `EditFanlink`, `EditPreSave`, all 4 campaign template pages, `ArtistBioPage`) to `React.lazy` with `Suspense` + skeletons in `App.tsx`.
- **Images:** add `loading="lazy"` + `decoding="async"` + explicit width/height to artwork/avatars/banners across `FanlinkPage`, `PreSavePage`, `ArtistBioPage`, dashboards. Add `fetchpriority="high"` to LCP artwork.
- **Queries:** replace dashboard's 6 sequential queries with `Promise.all`; memoize derived data with `useMemo`; introduce the `count: "exact"` pattern from track 1.
- **Audio:** signed URLs + Range (track 3) covers this.

## Scope confirmation

This is roughly 15–20 files touched plus 2 migrations. I'd suggest I ship it in this order so you can review per track:

1. Track 1 (analytics fix + migration) — smallest, unblocks correct numbers.
2. Track 3 (audio fix) — user-visible bug.
3. Track 4 (perf) — mostly mechanical.
4. Track 2 (templates 2.0) — biggest, design-heavy.

Reply "go" to start with Track 1, or tell me to reorder / drop anything (e.g. skip new comments/reactions/RSVP tables, skip Google Maps, etc.).
