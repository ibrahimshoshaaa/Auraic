"""Configure the generated Android host without changing its application ID."""
import json
import os
import re
from pathlib import Path

manifest = Path('android/app/src/main/AndroidManifest.xml')
contents = manifest.read_text()
permission = '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
if permission not in contents:
    contents = contents.replace('<application', f'{permission}\n    <application', 1)
manifest.write_text(contents)
drawable = Path('android/app/src/main/res/drawable')
drawable.mkdir(parents=True, exist_ok=True)
(drawable / 'ic_stat_auraic.xml').write_text('''<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFF" android:pathData="M12,2L2,22H6L8,18H16L18,22H22ZM12,9L14,14H10Z"/>
</vector>''')

source = Path('firebase/google-services.json')
raw = os.environ.get('FIREBASE_ANDROID_CONFIG', '')
if not raw and source.exists():
    raw = source.read_text()
if not raw:
    print('Firebase Android config not supplied: app works with notifications unavailable.')
    raise SystemExit(0)
config = json.loads(raw)
app = Path('android/app/build.gradle.kts')
contents = app.read_text()
match = re.search(r'applicationId\s*=\s*"([^"]+)"', contents)
if not match:
    raise SystemExit('Cannot read the generated Android applicationId')
packages = [client['client_info']['android_client_info']['package_name'] for client in config['client']]
if match[1] not in packages:
    raise SystemExit(f'Firebase config must contain Android app {match[1]}; do not change applicationId.')
Path('android/app/google-services.json').write_text(raw)
settings = Path('android/settings.gradle.kts')
settings_contents = settings.read_text()
if 'id("com.google.gms.google-services")' not in settings_contents:
    settings_contents = settings_contents.replace('\nplugins {', '\nplugins {\n    id("com.google.gms.google-services") version "4.4.4" apply false', 1)
    settings.write_text(settings_contents)
if 'id("com.google.gms.google-services")' not in contents:
    contents = contents.replace('plugins {', 'plugins {\n    id("com.google.gms.google-services")', 1)
    app.write_text(contents)
print('Firebase Android configured for the existing application ID.')
