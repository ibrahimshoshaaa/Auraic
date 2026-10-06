import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('configure_firebase_android.py').resolve()

class FirebaseAndroidTest(unittest.TestCase):
    def run_config(self, package):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            app = root / 'android/app'
            (app / 'src/main').mkdir(parents=True)
            (app / 'src/main/AndroidManifest.xml').write_text('<manifest><application /></manifest>')
            (app / 'build.gradle.kts').write_text('plugins {\n}\nandroid { defaultConfig { applicationId = "com.example.perfume_erp" } }')
            (root / 'android/settings.gradle.kts').write_text('\nplugins {\n}\n')
            config = json.dumps({'client': [{'client_info': {'android_client_info': {'package_name': package}}}]})
            result = subprocess.run(['python3', str(SCRIPT)], cwd=root,
                env={**os.environ, 'FIREBASE_ANDROID_CONFIG': config}, capture_output=True, text=True)
            return result, (app / 'build.gradle.kts').read_text(), (root / 'android/settings.gradle.kts').read_text()

    def test_matching_package_configures_plugins(self):
        result, app, settings = self.run_config('com.example.perfume_erp')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('com.google.gms.google-services', app)
        self.assertIn('com.google.gms.google-services', settings)
        self.assertIn('applicationId = "com.example.perfume_erp"', app)

    def test_wrong_package_fails_without_changing_identity(self):
        result, app, _ = self.run_config('com.example.auraic')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('must contain Android app com.example.perfume_erp', result.stderr)
        self.assertNotIn('com.google.gms.google-services', app)

if __name__ == '__main__':
    unittest.main()
