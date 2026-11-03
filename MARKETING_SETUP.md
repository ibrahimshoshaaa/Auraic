# Marketing and traffic

Apply `npx prisma migrate deploy` to the intended database before enabling the release. The migration adds only StoreVisit; it does not modify business records. Do not use reset/db push on production.

Owners configure IDs in Dashboard → Storefront → التسويق والزيارات. Empty IDs disable loading. No arbitrary scripts or access tokens are accepted. Meta and TikTok browser scripts load only after advertising consent; use Advertising preferences to reset that choice. The integration does not send names, phones, email, addresses or advanced matching fields. Purchase means accepted order, including COD or an unverified transfer, not collected payment. Pixel events are best effort: blocked scripts and visitors declining consent reduce totals.

Traffic is separate: random per-tab session IDs, allowlisted paths without query strings, and view IDs used for idempotency. Counts are approximate sessions and page views, not unique people. Reloads count as views. Known bots are excluded, request limits apply, and entries older than 90 days are pruned when recording new views. Reports are store-scoped and require reports.read. Tracking begins at deployment; there is no historical backfill.

Verification: use owned test Pixels in Meta Test Events/Meta Pixel Helper and TikTok Test Events/Pixel Helper. Accept consent, visit a product, add an item and enter checkout. Confirm exactly one PageView per navigation, ViewContent, AddToCart, InitiateCheckout and one Purchase on a successfully accepted test order. Failed requests must not send Purchase. Refresh confirmation and retry the same order to check deduplication. Decline/reset consent and confirm no advertising requests. Compare traffic reports with scripted navigation; access via another store must not reveal traffic. Browser IDs can be forged; these counts are not billing/fraud evidence.

Current validation: automated settings validation and project checks only. No real Pixel IDs have been supplied, so delivery in Meta/TikTok accounts has not been verified. No production migration has been run by this change.
