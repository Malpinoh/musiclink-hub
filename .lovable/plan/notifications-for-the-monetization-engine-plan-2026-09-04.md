# Notifications for the Monetization Engine (Plan)

Monetag `sw.js` is already saved at `public/sw.js`, so it serves from the site root as `/sw.js`.

## 1. Database changes

**`notifications`** (new)
- `user_id`, `title`, `message`, `type` (e.g. `monetization_submitted`, `monetization_approved`, `monetization_rejected`, `monetization_activated`, `earnings_updated`, `earnings_adjusted`), `link` (in-app path, nullable), `read_at` (nullable), `created_at`
- Access: each user can read only their own rows and mark their own as read. No client inserts — rows are written by security-definer functions and edge functions only. Admins can read all rows (for the admin activity view).
- Index on `(user_id, created_at desc)` and a partial index for unread counts.

**`notification_preferences`** (new)
- `user_id` (unique), `email_monetization_status` (default on), `email_earnings_updates` (default on), `created_at`, `updated_at`
- Users read/update only their own row; created on demand.
- Critical account/security email (password reset, sign-in) stays outside this table and cannot be turned off.

**`notification_deliveries`** (new, small audit table)
- `notification_id`, `channel` (`email`), `status` (`sent` / `skipped_preference` / `failed`), `error_message`, `created_at`
- Admin-read only; used for the admin notification activity view.

No changes to existing monetization tables.

## 2. Notification creation flow

```
event happens                     -> notify_user() helper (security definer)
  apply_for_monetization()             inserts notifications row
  set_monetization_application_status()  then calls the email edge function
  assign_monetization_zone()           (fire-and-forget)
  process_monetization_import()
  reverse_monetization_import()
```

- One internal helper `notify_user(_user_id, _type, _title, _message, _link)` inserts the in-app row and returns its id. Existing monetization RPCs each gain one call to it — no changes to their financial logic.
- Earnings events: `process_monetization_import` notifies each artist whose earnings rows were created in that batch (one notification per artist per batch, not per row). `reverse_monetization_import` notifies the affected artists that earnings were adjusted.
- Email is dispatched by a new `send-notification-email` edge function invoked with the notification id; it reads the notification, the recipient's auth email, and their preferences, skips when the preference is off, sends, and records the result in `notification_deliveries`.

## 3. Email mechanism

Reuse the existing Brevo transactional setup already used by `send-presave-notification` (same API key secret, same sender identity). New edge function `supabase/functions/send-notification-email/index.ts`:
- Shared MDistro Link branded HTML shell (logo, dark header, single CTA button, footer) in `supabase/functions/_shared/notification-email.ts`.
- Per-type subject and body copy for: request received, approved, rejected, activated, weekly earnings updated, earnings adjusted.
- CTA links to `/artist/revenue` (or the admin-relevant page) on the public domain.
- Idempotent per notification id so retries do not double-send.

## 4. Files to add / modify

New
- `src/hooks/useNotifications.ts` — list, unread count, mark read / mark all read (React Query + realtime subscription).
- `src/components/notifications/NotificationBell.tsx` — bell + unread badge + dropdown list (title, message, relative time, unread dot, click navigates to `link` and marks read).
- `src/components/notifications/NotificationList.tsx` — shared list item rendering.
- `src/pages/NotificationSettings.tsx` — the two email toggles, at `/settings/notifications`.
- `src/pages/admin/AdminNotifications.tsx` — monetization/earnings notification activity: recipient, type, sent time, email delivery status, filters.
- `supabase/functions/send-notification-email/index.ts` + `supabase/functions/_shared/notification-email.ts`.

Modify
- `src/components/Header.tsx` — mount the bell (desktop + mobile) and a link to notification settings.
- `src/App.tsx` — routes for `/settings/notifications` and `/admin/monetization/notifications`.
- `src/components/admin/AdminLayout.tsx` — nav entry for Notifications.
- `supabase/config.toml` — register the new function (`verify_jwt = false`, called internally with the service role).
- `src/pages/RevenueDashboard.tsx` — small "notification settings" link only.

## 5. Scope guardrails

- No push notifications, no digests, no marketing email, no per-event granular preference matrix.
- Existing monetization RPCs are extended with notification calls only; no changes to splits, balances, or ledger behaviour.

Awaiting approval before implementation.
