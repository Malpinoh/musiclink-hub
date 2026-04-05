

## MDistro Platform Upgrades and Troubleshooting

### Issues Found

1. **"Iwo Ori Mi" has 10 fans but 0 notification emails sent** — The release is marked `is_released: true` and `links_resolved: true`, but no notifications were sent. The `send-presave-notification` function likely marked it as released before sending emails, or the cron job timing missed it.

2. **Dashboard pre-save stats show `pre_save_actions` counts instead of `presave_fans` counts** — The dashboard fetches from `pre_save_actions` (the old DSP-based system) rather than `presave_fans` (the new notification model). This means fan signup counts show as 0.

3. **Dashboard "View" button for released pre-saves goes to `/presave/` which redirects to `/listen/`** — Works but is indirect. Should link directly to `/listen/` for released items.

4. **No fan count shown on dashboard pre-save cards** — Artists can't see how many fans signed up without going to analytics.

5. **No "Send Now" / manual trigger for notifications** — If the cron missed a release, there's no way to retry from the dashboard.

6. **ListenPage and PreSavePage import `logo` and `demoArtwork` from assets** — If these files don't exist in the build, pages will break.

---

### Plan

#### Step 1: Fix Dashboard stats to use `presave_fans` instead of `pre_save_actions`
- In `Dashboard.tsx`, update `fetchPreSaves` to query `presave_fans` count per pre-save instead of (or in addition to) `pre_save_actions`.
- Show fan signup count on each pre-save card.
- Update the stats cards to include total fan signups.

#### Step 2: Fix Dashboard "View" button for released pre-saves
- In `Dashboard.tsx`, change the "View" button for pre-saves: if `ps.is_released`, link to `/listen/${ps.artist_slug}-${ps.slug}` instead of `/presave/${ps.artist_slug}/${ps.slug}`.

#### Step 3: Add "Send Notifications" button to EditPreSave page
- Add a button on `EditPreSave.tsx` that manually triggers the `send-presave-notification` edge function for a specific pre-save ID.
- This lets artists retry failed or missed notifications.

#### Step 4: Update `send-presave-notification` to accept a specific `pre_save_id`
- Modify the edge function to accept an optional `pre_save_id` in the request body.
- When provided, process only that pre-save (regardless of `is_released` flag, but still require `links_resolved`).
- This enables manual retrigger from the dashboard.

#### Step 5: Send missed notifications for "Iwo Ori Mi"
- After deploying the updated function, manually trigger it for the specific pre-save ID to send the 10 pending fan emails.

#### Step 6: Verify asset imports
- Check that `src/assets/logo.png` and `src/assets/demo-artwork.jpg` exist. If not, add fallbacks.

### Technical Details

**Files to modify:**
- `src/pages/Dashboard.tsx` — Fix stats query, fix View button link
- `src/pages/EditPreSave.tsx` — Add "Send Notifications" button
- `supabase/functions/send-presave-notification/index.ts` — Accept optional `pre_save_id` parameter for targeted sends

**No database changes needed** — all tables and RLS policies are already in place.

