# Perfume ERP Android client (work in progress)

The mobile client calls the existing ERP API over HTTPS. It never connects to PostgreSQL directly. Login tokens are random, stored as SHA-256 hashes on the server, revocable, and held in Android secure storage.


## Build prerequisites

Install Flutter and the Android SDK on the build machine. From this directory run `flutter create --platforms android --project-name perfume_erp .` once to generate standard Android project files, then `python3 tool/ensure_android_internet.py` to grant the release APK network access, `flutter pub get`, `flutter analyze --no-fatal-infos`, `flutter test`, and `flutter build apk --release --split-per-abi`. The Android workflow uploads separate ARM64 and ARM32 APKs; install the ARM64 build on a modern 64-bit phone. These release-mode test builds use the generated Android project's debug signing key. Set up a persistent private release signing key before distributing updates outside testing.

For a preview backend, pass `--dart-define=API_BASE_URL=https://your-preview-domain` to `flutter run` or `flutter build apk`. This independent repository requires an explicit API_BASE_URL for its own deployment. For GitHub APK builds set repository variable API_BASE_URL. Until it is configured, CI runs analyze/tests and skips APK artifacts.

## New-order notifications (Android)

Keep the existing Android application ID `com.example.perfume_erp`. In Firebase project `auraicfragrance`, register that Android app and download its `google-services.json`. The config for `com.example.auraic` belongs to a different application and cannot be used to update this APK.

Set GitHub Actions secret `FIREBASE_ANDROID_CONFIG` to the complete client config JSON, or place it at `mobile/firebase/google-services.json` (this local file is gitignored; client config is separate from the service-account private key). After generating Android host files, run `python3 tool/configure_firebase_android.py` before building. It checks the package ID, adds the Google Services Gradle plugin, Android 13 notification permission and the notification icon. Without config, the ERP remains usable and notification settings show that setup is incomplete.

Server setup:
1. Apply `npx prisma migrate deploy` against the production database before deploying this version.
2. Firebase Console → Project settings → Service accounts → Generate new private key. Paste its complete JSON into **Vercel Environment Variables → `FIREBASE_SERVICE_ACCOUNT_JSON`**, for the same Firebase project used by the Android app. Keep this private key on the server only; never add it to GitHub source or the APK. Redeploy the web backend.
3. Set a random `CRON_SECRET` on Vercel. Schedule an authenticated GET to `/api/cron/notifications` every 5 minutes using `Authorization: Bearer <CRON_SECRET>` with your scheduler. No schedule is added automatically. Orders trigger immediate delivery through Next.js `after`; the endpoint retries transient failures (up to 6 attempts) and processes 4 pending devices per request. An external scheduler or a supported Vercel Cron plan is needed for automatic retries.
4. Install the new APK, sign in, and allow Auraic notifications. Toggle them under Account & security → Order notifications.
5. Place a real storefront test order while the app is in the background. Expect a system notification; tapping opens and expands that order. While using the app, an actionable in-app banner appears.

Both storefront and manual orders queue notifications atomically with order creation. Retried checkout/order submissions do not create duplicate queue entries. Recipients are currently signed-in, unexpired mobile sessions whose active users can read orders in that store. Logout, password change, disabled accounts/stores and token rotation are checked before dispatch. Revoked/expired sessions receive no new sends. The notification includes the order number, never customer name, phone or address. Failed sends never roll back an already saved order. Repeated sends after a network timeout can happen; Android uses the order ID as a notification tag to replace the prior notification for that order.

`google-services.json` configures the Android client only. It does not authorize the backend to send pushes; the server service-account variable is also required.
