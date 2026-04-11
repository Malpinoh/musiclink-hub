

## MDistro UX Upgrades — 5 Features

### 1. Loading Skeletons (replace spinners)

**New file:** `src/components/DashboardSkeleton.tsx`
- Skeleton cards for stats (4 shimmer rectangles matching the stats grid)
- Skeleton rows for fanlink/pre-save lists (artwork placeholder + text lines + action buttons)
- Uses existing `src/components/ui/skeleton.tsx`

**New file:** `src/components/AnalyticsSkeleton.tsx`
- Skeleton for chart areas, stat cards, and tables on analytics pages

**Modified files:**
- `src/pages/Dashboard.tsx` — Replace the `Loader2` spinner (lines 210-216) with `<DashboardSkeleton />` that mirrors the real layout
- `src/pages/FanlinkAnalytics.tsx` — Replace spinner with `<AnalyticsSkeleton />`
- `src/pages/PreSaveAnalytics.tsx` — Same skeleton treatment

### 2. Sticky Mobile CTA Bar

**New file:** `src/components/MobileStickyBar.tsx`
- Fixed bottom bar with "Create Fanlink" and "Create Pre-save" buttons
- Only renders on mobile (`md:hidden`)
- Uses `env(safe-area-inset-bottom)` padding
- Hides on scroll-down, shows on scroll-up (track `window.scrollY` delta)
- Only visible on Dashboard route (or when user is authenticated)

**Modified files:**
- `src/pages/Dashboard.tsx` — Import and render `<MobileStickyBar />`, add bottom padding to main content to prevent overlap

### 3. Safe-Area Padding (Global)

**Modified file:** `src/index.css`
- Add to `body`: `padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);`
- Or more targeted: apply safe-area insets to Header, Footer, and any fixed/sticky elements

**Modified files:**
- `src/components/Header.tsx` — Add `pt-[env(safe-area-inset-top)]` to the fixed header
- `src/components/Footer.tsx` — Add `pb-[env(safe-area-inset-bottom)]`
- `src/components/MobileStickyBar.tsx` — Already includes safe-area padding

### 4. Offline / Slow Network Indicator

**New file:** `src/components/OfflineBanner.tsx`
- Listens to `window.addEventListener('online' | 'offline')`
- Shows a top banner (below header) when offline: "You're offline. Changes will sync when connection returns."
- Animated slide-in/out with framer-motion
- Dismisses automatically when back online

**Modified file:**
- `src/App.tsx` — Render `<OfflineBanner />` globally inside the BrowserRouter

### 5. Analytics Event Tracking

**New file:** `src/lib/analytics.ts`
- `trackEvent(eventName: string, properties?: Record<string, any>)` function
- Events stored in a new `analytics_events` database table (id, user_id, event_name, properties jsonb, created_at)
- Fires insert to Supabase; fails silently to never block UX

**Database migration:**
- Create `analytics_events` table with RLS policy allowing authenticated users to insert their own events

**Modified files (add `trackEvent` calls):**
- `src/pages/CreateFanlink.tsx` — `trackEvent('fanlink_created', { title, artist })`
- `src/pages/CreatePreSave.tsx` — `trackEvent('presave_created', { title, artist })`
- `src/pages/FanlinkPage.tsx` — `trackEvent('page_view', { type: 'fanlink' })`, `trackEvent('link_clicked', { platform })`
- `src/pages/PreSavePage.tsx` — `trackEvent('fan_collected', { pre_save_id })`, `trackEvent('share_clicked')`
- `src/pages/ListenPage.tsx` — `trackEvent('page_view', { type: 'listen' })`, `trackEvent('link_clicked', { platform })`

---

### Technical Details

**New files (4):**
- `src/components/DashboardSkeleton.tsx`
- `src/components/AnalyticsSkeleton.tsx`
- `src/components/MobileStickyBar.tsx`
- `src/components/OfflineBanner.tsx`
- `src/lib/analytics.ts`

**Modified files (10):**
- `src/pages/Dashboard.tsx`
- `src/pages/FanlinkAnalytics.tsx`
- `src/pages/PreSaveAnalytics.tsx`
- `src/index.css`
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/App.tsx`
- `src/pages/CreateFanlink.tsx`
- `src/pages/CreatePreSave.tsx`
- `src/pages/FanlinkPage.tsx`
- `src/pages/PreSavePage.tsx`
- `src/pages/ListenPage.tsx`

**Database migration (1):**
- Create `analytics_events` table with insert-only RLS for authenticated users

