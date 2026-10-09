"""Exclude encrypted session preferences from cloud backups and device transfers."""
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path.cwd().resolve()
manifest = (root / 'android/app/src/main/AndroidManifest.xml').resolve()
if not manifest.is_relative_to(root):
    raise SystemExit('Android manifest must stay inside the build directory')
ET.register_namespace('android', 'http://schemas.android.com/apk/res/android')
ET.register_namespace('tools', 'http://schemas.android.com/tools')
tree = ET.parse(manifest)
application = tree.getroot().find('application')
if application is None:
    raise SystemExit('Android manifest has no application element')
android = '{http://schemas.android.com/apk/res/android}'
application.set(android + 'allowBackup', 'false')
application.set(android + 'fullBackupContent', '@xml/auraic_backup_rules')
application.set(android + 'dataExtractionRules', '@xml/auraic_data_extraction_rules')
tree.write(manifest, encoding='utf-8', xml_declaration=True)
xml = (root / 'android/app/src/main/res/xml').resolve()
if not xml.is_relative_to(root):
    raise SystemExit('Android backup resources must stay inside the build directory')
xml.mkdir(parents=True, exist_ok=True)
(xml / 'auraic_backup_rules.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <exclude domain="sharedpref" path="." />
</full-backup-content>
''')
(xml / 'auraic_data_extraction_rules.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="sharedpref" path="." />
    </cloud-backup>
    <device-transfer>
        <exclude domain="sharedpref" path="." />
    </device-transfer>
</data-extraction-rules>
''')
