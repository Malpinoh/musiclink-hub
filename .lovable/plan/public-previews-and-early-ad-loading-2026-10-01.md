# Public previews and early ad loading

## Goal
Make each fanlink, release, track, pre-save, and public campaign link show its own title, artist, artwork, description, and destination when shared on WhatsApp and other social platforms. Show eligible advertising on pre-save and campaign pages, beginning during the loading state.

## Implementation
1. **Complete crawler routing**
   - Add missing public routes for `/pre/{slug}`, `/link/{id}`, and `/artist/campaigns/view/{id}` to the crawler entry point.
   - Keep normal visitors in the React app while crawler requests receive generated HTML.
   - Preserve the existing Edge Function share-link fallback for hosting environments that cannot run rewrites.

2. **Add campaign metadata generation**
   - Extend the shared metadata engine with a campaign page type.
   - Read active campaign title, artist, description, artwork, date, and campaign template.
   - Generate route-specific Open Graph, Twitter Card, canonical URL, robots tags, and JSON-LD.
   - Return “not found” metadata instead of platform homepage metadata when a public record is unavailable.

3. **Make active campaigns publicly readable**
   - Add narrowly scoped read access for active campaigns only; drafts and private owner operations remain protected.
   - Add the required database grant and metadata-cache invalidation when campaign content changes.

4. **Match browser metadata to crawler metadata**
   - Add a campaign metadata builder and apply it on the campaign page.
   - Ensure pre-save short links and campaign sharing use their real public destination while retaining the crawler-safe share option.

5. **Load ads early and on both requested page types**
   - Render a reserved sponsored slot during the pre-save and campaign loading states so the ad request starts immediately and the page does not jump.
   - Show house ads on every pre-save and campaign template.
   - Load the artist’s approved Monetag script as soon as the page owner is known; inactive or unapproved zones remain blocked by the existing server-side check.
   - Attribute campaign ad impressions and clicks to the correct artist and campaign without changing revenue rules.

6. **Verify end to end**
   - Test crawler responses for fanlink, release, track, both pre-save URL formats, and campaign routes.
   - Confirm each response contains the exact page title, artwork, canonical URL, and social tags.
   - Verify desktop and mobile loading states show a stable ad area, then confirm the completed pages still show ads and remain usable.

## Technical details
- React/Vite remains unchanged; no Next.js middleware is introduced.
- The metadata Edge Function remains the source of truth, with the Vercel function forwarding crawler requests where available.
- Existing Monetag approval and active-zone controls remain authoritative.
- Cache entries are invalidated on campaign updates so edited artwork or text reaches future crawler requests.
