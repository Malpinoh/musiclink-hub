# MDISTRO LINK — Artist Link Monetization Engine (Plan Only)

Scope: MDISTRO LINK only. No implementation in this step.

---

## 1. Current System Analysis

**Stack**: React 18 + Vite + Tailwind + TypeScript SPA, Lovable Cloud backend (Postgres + Edge Functions + Storage). Hosting: Vercel, custom domain `md.malpinohdistro.com.ng` (DNS at Truehost/cPanel, pointed to Vercel). Crawler metadata served by the `api/og.ts` Vercel function delegating to the `meta` edge function.

**Auth**: `AuthContext` (email/password, Supabase session). Profiles in `public.profiles` (user_id → auth.users). Roles already separated in `public.user_roles` with enum `app_role` (`admin`, `user`) and `has_role(uuid, app_role)` security-definer function — correct pattern, reusable as-is.

**Artist identity**: two layers — `profiles` (account) and `artist_profiles` (public bio page, `username`, one per user). Monetization must attach to the **user_id**, not the bio profile, because links/pre-saves belong to `user_id`.

**Link systems**:

- `fanlinks` + `platform_links` + `link_themes` + `clicks` + `fan_contacts` (+ `releases`/`tracks`).
- `pre_saves` + `presave_streaming_links` + `pre_save_actions` + `presave_fans`.
- `campaigns` + `campaign_templates`.
- `artist_profiles` + `artist_custom_buttons` + view/click trackers.

**Existing money-adjacent system (important)**: an ad stack already exists — `ad_campaigns` (house ads), `ad_impressions`, `ad_revenue_shares` (per-artist aggregate: impressions, clicks, earned_cents, paid_cents, share_percent), `src/components/HouseAdSlot.tsx`, and `src/pages/RevenueDashboard.tsx` at `/artist/revenue`. This is an **aggregate counter, not a ledger** — no per-period records, no immutable history, no import audit. It is not a provider/zone system.

**Admin surface**: only `src/pages/AdminApiLogs.tsx` at `/admin/api-logs`, gated by a client-side `user_roles` lookup. There is no admin shell/layout, no admin nav, no admin route guard component.

**Analytics**: security-definer RPCs (`get_campaign_totals`, etc.) already establish the pattern of doing aggregation server-side — the same pattern fits earnings.

**Risk found**: no existing table stores provider zones, applications, earnings periods, or financial audit trail. All of that is new.

---

## 2. Reuse vs New


| Existing component                                                                    | Decision                                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `user_roles` + `has_role()`                                                           | **Reuse** unchanged for admin gating                                                                                                 |
| `profiles` / `auth.users` (user_id)                                                   | **Reuse** as artist identity key                                                                                                     |
| `artist_profiles`                                                                     | **Reuse** read-only (display name/username in admin lists)                                                                           |
| `ad_revenue_shares`                                                                   | **Reuse as-is for house ads**; do NOT overload for Monetag. New ledger is separate (see Risks Q3 for the alternative you may prefer) |
| `RevenueDashboard.tsx` (`/artist/revenue`)                                            | **Modify** — becomes the single artist earnings hub with tabs: House Ads (existing) + Link Monetization (new)                        |
| `AdminApiLogs.tsx`                                                                    | **Reuse** as-is; extract its role check into a shared guard                                                                          |
| Client role check pattern                                                             | **Modify** → new `useIsAdmin` hook + `<AdminRoute>` guard, server-enforced by RLS                                                    |
| `Header.tsx` nav                                                                      | **Modify** — add "Earnings" (artist) and "Admin" (admin only) entries                                                                |
| `App.tsx` routes                                                                      | **Modify** — add lazy admin + monetization routes                                                                                    |
| Security-definer RPC pattern                                                          | **Reuse** for earnings aggregation                                                                                                   |
| Provider zone mapping, applications, weekly imports, earnings ledger, balances, audit | **New**                                                                                                                              |
| Monetag script injection into public link pages                                       | **New**                                                                                                                              |
| Admin shell/layout                                                                    | **New** (minimal, does not redesign anything)                                                                                        |


---

## 3. Proposed Database Changes (not created yet)

Enums:

- `monetization_provider`: `monetag` (extensible).
- `monetization_application_status`: `pending`, `approved`, `rejected`, `suspended`, `withdrawn`.
- `zone_status`: `active`, `replaced`, `revoked`.
- `earning_status`: `pending`, `available`, `paid`, `reversed`.
- `import_status`: `draft`, `processing`, `processed`, `failed`, `reversed`.

Tables (all `public`, all with GRANTs, RLS enabled, `created_at`/`updated_at` + update trigger):

1. `monetization_settings` — single-row config: `artist_share_percent` (default 70), `platform_share_percent` (30), `early_access_limit` (20), `provider_default`. **This is where the split lives.** Admin-only write.
2. `monetization_applications` — `user_id` (unique per provider), `provider`, `status`, `applied_at`, `reviewed_at`, `reviewed_by`, `review_note`, `early_access` bool. Abandoned applications: rows are only created on explicit submit; `withdrawn`/`pending` never count toward the 20. Early-access slot is claimed at **approval/activation** time, computed by counting `status='approved'` rows inside a transaction/RPC — not on the client.
3. `monetization_zones` — `user_id`, `provider`, `zone_id` text, `status`, `assigned_at`, `replaced_by_zone_uuid`, `assigned_by`. **Unique index on (provider, zone_id)** globally (a zone belongs to exactly one artist, ever). Partial unique index on `(user_id, provider) WHERE status='active'` so one active zone per artist per provider. Replacement = mark old `replaced`, insert new; historical earnings keep the old `zone_uuid` FK, so history stays attached to the zone it was earned on.
4. `monetization_revenue_imports` — one row per import batch: `provider`, `period_start`, `period_end`, `status`, `source` (`manual`/`csv`), `imported_by`, `row_count`, `gross_cents_total`, `notes`, `reversed_at`, `reversal_of`. Unique on `(provider, period_start, period_end)` for non-reversed batches to block accidental double-import of a week.
5. `monetization_zone_revenue` — raw imported lines: `import_id`, `provider`, `zone_id` (text, as typed), `gross_cents`, `matched_zone_uuid` (nullable), `matched_user_id` (nullable), `match_status` (`matched`/`unknown_zone`/`ambiguous`), `processed` bool. Unique on `(import_id, provider, zone_id)`.
6. `monetization_earnings` — the ledger, one row per (artist, zone, period, import): `user_id`, `zone_uuid`, `zone_id_snapshot`, `provider`, `period_start`, `period_end`, `gross_cents`, `artist_share_percent` (**snapshot**), `artist_cents`, `platform_cents`, `status`, `import_id`, `reversal_of`. Unique on `(import_id, zone_uuid)`. Append-only by convention; corrections are new rows (adjustment or reversal), never edits.
7. `monetization_balances` — per artist: `user_id` unique, `lifetime_gross_cents`, `lifetime_artist_cents`, `pending_cents`, `available_cents`, `paid_cents`, `last_earning_at`. Derived, updated only inside the processing RPC.
8. `monetization_audit_log` — `actor_id`, `action`, `entity_type`, `entity_id`, `before` jsonb, `after` jsonb. Insert-only, admin-read.

Indexes: `monetization_earnings(user_id, period_start desc)`, `(import_id)`, `monetization_zone_revenue(import_id, match_status)`, `monetization_zones(provider, zone_id)`, `monetization_applications(status)`.

---

## 4. Revenue Processing Architecture

```
Admin submits weekly rows (zone_id, gross)
        ↓  insert import batch (status=draft) + raw zone_revenue rows
Match: zone_id --(provider, zone_id)--> monetization_zones --> user_id
        ↓  unknown/ambiguous rows flagged, NOT processed, batch still reviewable
Read artist_share_percent from monetization_settings (snapshot into each row)
        ↓  artist_cents = round(gross * pct/100); platform_cents = gross - artist_cents
Insert monetization_earnings (one per matched zone, status=pending)
        ↓
Recompute monetization_balances from the ledger (SUM over earnings), not by += 
        ↓  batch status=processed, audit_log entry
```

All of this happens in **one security-definer RPC** (`process_monetization_import(import_id)`) executed in a single transaction, admin-guarded by `has_role(auth.uid(),'admin')`. Balances are always **recomputed from the ledger** for the affected users — this makes double-crediting structurally impossible even if the RPC is invoked twice. Rounding: integer cents, platform takes the remainder so gross always reconciles exactly.

Corrections: reversal batch inserts negated earnings rows referencing `reversal_of`, then balances recompute. Nothing is deleted.

---

## 5. Weekly Import Flow (Friday night)

1. Admin opens `/admin/monetization/imports` → "New weekly import".
2. Picks provider + period (defaults to the last Mon–Sun / Sat–Fri window) — duplicate period is blocked with a clear message and a link to the existing batch.
3. Enters rows manually (zone_id + gross USD) or pastes/uploads CSV (`zone_id,gross`).
4. System saves a **draft** batch and shows a preview: matched artist per zone, unknown zones, computed artist/platform split totals.
5. Admin fixes unknown zones (assign zone to an artist, or leave unmatched) and clicks **Process**.
6. RPC processes atomically → earnings created, balances recomputed, audit entry written, batch marked `processed`.
7. Batch page afterwards is read-only with a **Reverse batch** action.

---

## 6. Duplicate & Reprocessing Protection

- Unique `(provider, period_start, period_end)` on active batches → a week can't be imported twice.
- Unique `(import_id, provider, zone_id)` on raw rows → no duplicate zone line in a batch.
- Unique `(import_id, zone_uuid)` on earnings → the same batch can't generate two earnings for a zone.
- Draft → processed state machine; processing an already-processed batch is rejected by the RPC.
- Balances recomputed from ledger sums (idempotent) rather than incremented.
- Reversal-only corrections; ledger append-only.
- Every mutation writes to `monetization_audit_log`.

---

## 7. Artist UI Plan

- **Modify `src/pages/RevenueDashboard.tsx**` (`/artist/revenue`) into "Earnings" with two tabs: *House Ads* (existing `ad_revenue_shares` content, untouched logic) and *Link Monetization* (new).
- Link Monetization tab shows: monetization status (not applied / pending review / approved-early-access / approved / suspended), zone assigned (masked or shown, your call), lifetime earnings, pending, available, and a weekly earnings history table.
- **New** `src/components/monetization/MonetizationOptInCard.tsx` — the opt-in/apply action, also surfaced on the main `/dashboard` as a single card (no new dashboard).
- **New** `src/hooks/useMonetization.ts` — status + balance + earnings queries.
- Header gains an "Earnings" link.

## 8. Admin UI Plan

- **New** minimal admin shell `src/components/admin/AdminLayout.tsx` + `AdminRoute.tsx` guard; existing `/admin/api-logs` is linked from it (not rewritten).
- **New pages** under `/admin/monetization`: `Applications`, `Artists & Zones`, `Imports` (list + new + batch detail), `Earnings`, `Overview` (gross, artist share, platform share, per-period totals, early-access slots used X/20).
- Settings (split %, early-access limit) live on the Overview page as an admin-only form writing `monetization_settings`.

## 9. Security Plan

- RLS everywhere; GRANTs issued in the same migration as each table.
- Artist policies: `SELECT` only, `USING (user_id = auth.uid())`, on applications, zones, earnings, balances. No client `INSERT/UPDATE/DELETE` on any financial table.
- Application submission goes through a security-definer RPC (`apply_for_monetization()`), which enforces one-application-per-provider and computes early-access eligibility server-side.
- Admin policies via `has_role(auth.uid(),'admin')`; all admin writes also routed through RPCs so audit rows are guaranteed.
- `monetization_settings` readable by authenticated (needed to display the split), writable admin-only.
- No `anon` grants on any monetization table.
- Split percentage snapshotted per earning row; settings changes never rewrite history.
- Balances never client-writable and never trusted from the client.

## 10. File Change Plan

New:

- `src/hooks/useMonetization.ts`, `src/hooks/useIsAdmin.ts`
- `src/components/monetization/MonetizationOptInCard.tsx`, `EarningsTable.tsx`, `MonetizationStatusBadge.tsx`
- `src/components/monetization/MonetagScript.tsx` (provider tag injection on public link pages)
- `src/components/admin/AdminLayout.tsx`, `src/components/admin/AdminRoute.tsx`
- `src/pages/admin/AdminMonetizationOverview.tsx`, `AdminApplications.tsx`, `AdminZones.tsx`, `AdminImports.tsx`, `AdminImportDetail.tsx`, `AdminEarnings.tsx`
- `src/lib/money.ts` (cents formatting/parsing)

Modify:

- `src/App.tsx` (routes), `src/components/Header.tsx` (nav), `src/pages/RevenueDashboard.tsx` (tabs), `src/pages/Dashboard.tsx` (opt-in card), `src/pages/FanlinkPage.tsx` + `PreSavePage.tsx` + `ArtistBioPage.tsx` (conditional provider tag when that artist is monetization-enabled)

Migrations (one per phase, not written yet): enums + tables + GRANTs + RLS; then RPCs (`apply_for_monetization`, `approve_monetization_application`, `assign_monetization_zone`, `process_monetization_import`, `reverse_monetization_import`, `get_artist_monetization_summary`).

Edge functions: none required for Phase 1 (all logic in RPCs). A `monetization-import` function is only needed if CSV parsing should happen server-side — see Q4.

## 11. Implementation Phases

1. **Schema + RLS + audit** (migration only).
2. **RPCs**: apply, approve (with early-access counting), zone assign/replace.
3. **Artist UI**: opt-in card, Earnings tab, status.
4. **Admin UI**: shell, applications, zones.
5. **Weekly import**: draft/preview/process/reverse + Overview.
6. **Provider tag delivery** on public pages for enabled artists.
7. **Hardening**: security scan, linter, verification of totals.

## 12. Risks & Questions

1. **Domain**: `md.malpinohdistro.com.ng` DNS lives at Truehost/cPanel and points to Vercel. Your message says "fix this" — what exactly is broken right now (WhatsApp previews still wrong? yes fix this 
2. **Which pages carry the Monetag tag** — fanlinks, pre-saves, artist bio pages, or all three? Any pages that must stay ad-free? all the three 
3. **Two revenue systems**: keep house-ad `ad_revenue_shares` separate from the new ledger (my proposal), or migrate house ads onto the new ledger later? yes migrate onto the new ledger now
4. **CSV import**: paste-in-browser parsing (simplest) or file upload with server-side parsing? yes file upload
5. **Week boundary** for periods: Mon–Sun, or Sat–Fri to match a Friday-night import? yes sat - fri
6. **Currency**: assume USD cents throughout — confirm. yes usd but should but should be able to click button to check in their local currency base on ip address and should use google currency converter
7. **pending vs available**: what moves an earning from `pending` to `available` (a holding period? admin action?) — undefined in your spec, so Phase 1 will leave it admin-driven unless you specify.  Pending when we've not uploaded the earning, available when earning has been uploaded
8. **Zone visibility**: should artists see their raw Zone ID? no the shouldnt see the zone
9. **Payouts** are explicitly out of scope here (balances only) — confirm. payout should be coming soon next month

## 13. Suggested Improvements — NOT Part of Current Scope

- **Monetag API automation** (optional): if Monetag exposes a reporting API on your account, weekly imports could be automated by a scheduled edge function. Not verified, not planned. Affects: Weekly Import Flow.
- **Payout requests + payment records** (optional): artists request withdrawal, admin marks paid. Affects: Artist UI, new tables.
- **Fraud/quality guardrails** (optional): flag zones with abnormal revenue-per-click ratios using existing `clicks` data. Affects: Admin Overview.
- **Email notifications** (optional) via the existing Brevo integration on approval and on weekly earnings posted. Affects: Artist experience.
- **CSV export of earnings** (optional) for artist bookkeeping. Affects: Artist UI.
- **Unify house-ad revenue into the new ledger** (optional, recommended eventually) so artists see one balance. Affects: `ad_revenue_shares`, Artist UI.

---

Nothing has been implemented, migrated, or installed. Awaiting your approval and answers to Section 12.