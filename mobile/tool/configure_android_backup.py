"""Exclude encrypted session preferences from cloud backups and device transfers."""
from pathlib import Path
import re

manifest = Path('android/app/src/main/AndroidManifest.xml')
contents = manifest.read_text()
match = re.search(r'<application\b[^>]*>', contents)
if not match:
    raise SystemExit('Android manifest has no application element')
tag = match.group()
for attribute in ('allowBackup', 'fullBackupContent', 'dataExtractionRules'):
    tag = re.sub(r'\s+android:' + attribute + r'\s*=\s*[\"\'][^\"\']*[\"\']', '', tag)
attributes = (' android:allowBackup="false"'
              ' android:fullBackupContent="@xml/auraic_backup_rules"'
              ' android:dataExtractionRules="@xml/auraic_data_extraction_rules"')
end = '/>' if tag.endswith('/>') else '>'
tag = tag[:-len(end)] + attributes + end
manifest.write_text(contents[:match.start()] + tag + contents[match.end():])
xml = manifest.parent / 'res/xml'
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
