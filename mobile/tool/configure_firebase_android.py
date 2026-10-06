"""Configure the generated Android host without changing its application ID."""
import json
import os
import re

with open('android/app/src/main/AndroidManifest.xml', encoding='utf-8') as handle:
    contents = handle.read()
permission = '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
if permission not in contents:
    contents = contents.replace('<application', f'{permission}\n    <application', 1)
with open('android/app/src/main/AndroidManifest.xml', 'w', encoding='utf-8') as handle:
    handle.write(contents)
os.makedirs('android/app/src/main/res/drawable', exist_ok=True)
with open('android/app/src/main/res/drawable/ic_stat_auraic.xml', 'w', encoding='utf-8') as handle:
    handle.write('''<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFF" android:pathData="M12,2L2,22H6L8,18H16L18,22H22ZM12,9L14,14H10Z"/>
</vector>''')

raw = os.environ.get('FIREBASE_ANDROID_CONFIG', '')
if not raw and os.path.isfile('firebase/google-services.json'):
    with open('firebase/google-services.json', encoding='utf-8') as handle:
        raw = handle.read()
if not raw:
    print('Firebase Android config not supplied: app works with notifications unavailable.')
    raise SystemExit(0)
config = json.loads(raw)
with open('android/app/build.gradle.kts', encoding='utf-8') as handle:
    contents = handle.read()
match = re.search(r'applicationId\s*=\s*"([^"]+)"', contents)
if not match:
    raise SystemExit('Cannot read the generated Android applicationId')
packages = [client['client_info']['android_client_info']['package_name'] for client in config['client']]
if match[1] not in packages:
    raise SystemExit(f'Firebase config must contain Android app {match[1]}; do not change applicationId.')
# Configuration is file content only; every destination is a fixed literal path.
with open('android/app/google-services.json', 'w', encoding='utf-8') as handle:
    handle.write(raw)
with open('android/settings.gradle.kts', encoding='utf-8') as handle:
    settings_contents = handle.read()
if 'id("com.google.gms.google-services")' not in settings_contents:
    settings_contents = settings_contents.replace('\nplugins {', '\nplugins {\n    id("com.google.gms.google-services") version "4.4.4" apply false', 1)
    with open('android/settings.gradle.kts', 'w', encoding='utf-8') as handle:
        handle.write(settings_contents)
if 'id("com.google.gms.google-services")' not in contents:
    contents = contents.replace('plugins {', 'plugins {\n    id("com.google.gms.google-services")', 1)
    with open('android/app/build.gradle.kts', 'w', encoding='utf-8') as handle:
        handle.write(contents)
print('Firebase Android configured for the existing application ID.')
