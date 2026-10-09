from pathlib import Path
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET

SCRIPT = Path(__file__).with_name('configure_android_backup.py').resolve()
ANDROID = '{http://schemas.android.com/apk/res/android}'

class AndroidBackupTest(unittest.TestCase):
    def test_generated_and_existing_manifests_are_protected_idempotently(self):
        for attributes in ('', 'android:allowBackup="true" android:fullBackupContent="true" android:dataExtractionRules="@xml/old"'):
            with self.subTest(attributes=attributes), tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                main = root / 'android/app/src/main'
                main.mkdir(parents=True)
                manifest = main / 'AndroidManifest.xml'
                manifest.write_text(f'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application android:label="Auraic" {attributes}/></manifest>')
                for _ in range(2):
                    subprocess.run(['python3', str(SCRIPT)], cwd=root, check=True)
                tree = ET.parse(manifest).getroot()
                app = tree.find('application')
                self.assertEqual(app.get(ANDROID + 'allowBackup'), 'false')
                self.assertEqual(app.get(ANDROID + 'label'), 'Auraic')
                self.assertEqual(tree.find('uses-permission').get(ANDROID + 'name'), 'android.permission.INTERNET')
                for key in ('fullBackupContent', 'dataExtractionRules'):
                    name = app.get(ANDROID + key).removeprefix('@xml/')
                    rules = ET.parse(main / f'res/xml/{name}.xml').getroot()
                    exclusions = list(rules.iter('exclude'))
                    self.assertEqual(len(exclusions), 1 if key == 'fullBackupContent' else 2)
                    for item in exclusions:
                        self.assertEqual(item.attrib, {'domain': 'sharedpref', 'path': '.'})

if __name__ == '__main__':
    unittest.main()
