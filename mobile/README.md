# Perfume ERP Android client (work in progress)

The mobile client calls the existing ERP API over HTTPS. It never connects to PostgreSQL directly. Login tokens are random, stored as SHA-256 hashes on the server, revocable, and held in Android secure storage.


## Build prerequisites

Install Flutter and the Android SDK on the build machine. From this directory run `flutter create --platforms android --project-name perfume_erp .` once to generate standard Android project files, then `python3 tool/ensure_android_internet.py` to grant the release APK network access, `flutter pub get`, `flutter analyze --no-fatal-infos`, `flutter test`, and `flutter build apk --release --split-per-abi`. The Android workflow uploads separate ARM64 and ARM32 APKs; install the ARM64 build on a modern 64-bit phone. These release-mode test builds use the generated Android project's debug signing key. Set up a persistent private release signing key before distributing updates outside testing.

For a preview backend, pass `--dart-define=API_BASE_URL=https://your-preview-domain` to `flutter run` or `flutter build apk`. This independent repository requires an explicit API_BASE_URL for its own deployment. For GitHub APK builds set repository variable API_BASE_URL. Until it is configured, CI runs analyze/tests and skips APK artifacts.
