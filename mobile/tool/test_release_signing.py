import base64
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from configure_release_signing import configure


class SigningTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.previous = os.getcwd()
        os.chdir(self.directory.name)
        Path('android/app').mkdir(parents=True)
        Path('android/app/build.gradle.kts').write_text('android {\n    buildTypes {\n release { signingConfig = signingConfigs.getByName("debug") }\n}\n}')

    def tearDown(self):
        os.chdir(self.previous)
        self.directory.cleanup()

    def test_release_uses_secret_file_and_environment_passwords(self):
        with patch.dict(os.environ, {'ANDROID_KEYSTORE_BASE64': base64.b64encode(b'test-key').decode()}):
            configure()
        source = Path('android/app/build.gradle.kts').read_text()
        self.assertNotIn('getByName("debug")', source)
        self.assertIn('getByName("release")', source)
        self.assertIn('System.getenv("ANDROID_KEY_PASSWORD")', source)
        self.assertEqual(Path('android/app/release.jks').read_bytes(), b'test-key')
        self.assertEqual(Path('android/app/release.jks').stat().st_mode & 0o777, 0o600)

    def test_missing_or_malformed_secret_cannot_generate_release(self):
        for value in ['', '!!!']:
            with patch.dict(os.environ, {'ANDROID_KEYSTORE_BASE64': value}):
                with self.assertRaises(ValueError):
                    configure()
        self.assertFalse(Path('android/app/release.jks').exists())


if __name__ == '__main__':
    unittest.main()
