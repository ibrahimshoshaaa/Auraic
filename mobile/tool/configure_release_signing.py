"""Configure the generated Android host using a repository signing secret."""
import base64
import os
from pathlib import Path


def configure():
    encoded = os.environ.get('ANDROID_KEYSTORE_BASE64', '')
    if not encoded or len(encoded) > 200000:
        raise ValueError('Set ANDROID_KEYSTORE_BASE64 in repository secrets')
    try:
        data = base64.b64decode(encoded, validate=True)
    except ValueError:
        raise ValueError('Invalid signing keystore encoding') from None
    if not data:
        raise ValueError('Empty signing keystore')
    gradle = Path('android/app/build.gradle.kts')
    source = gradle.read_text()
    debug = 'signingConfig = signingConfigs.getByName("debug")'
    if source.count(debug) != 1 or source.count('    buildTypes {') != 1:
        raise ValueError('Unexpected Flutter Gradle template; refusing debug release')
    config = '''    signingConfigs {
        create("release") {
            storeFile = file("release.jks")
            storePassword = requireNotNull(System.getenv("ANDROID_KEYSTORE_PASSWORD"))
            keyAlias = requireNotNull(System.getenv("ANDROID_KEY_ALIAS"))
            keyPassword = requireNotNull(System.getenv("ANDROID_KEY_PASSWORD"))
        }
    }

'''
    source = source.replace('    buildTypes {', config + '    buildTypes {')
    source = source.replace(debug, 'signingConfig = signingConfigs.getByName("release")')
    # Keep secrets out of generated source, logs and uploaded artifacts.
    with open('android/app/release.jks', 'wb') as output:
        os.chmod('android/app/release.jks', 0o600)
        output.write(data)
    gradle.write_text(source)


if __name__ == '__main__':
    configure()
