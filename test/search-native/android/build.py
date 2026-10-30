"""Build the isolated video WebView test app without Gradle or release credentials."""

import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent
sdk = Path(os.environ.get("ANDROID_HOME", Path.home() / "Library/Android/sdk"))
java = Path(os.environ["JAVA_HOME"])
tools = sdk / "build-tools" / os.environ.get("ANDROID_BUILD_TOOLS", "36.1.0")
android = sdk / "platforms" / "android-36" / "android.jar"
output = root / "build"
classes = output / "classes"
dex = output / "dex"
classes.mkdir(parents=True, exist_ok=True)
dex.mkdir(exist_ok=True)


def run(args, **kwargs):
    subprocess.run([str(arg) for arg in args], check=True, **kwargs)


run([
    java / "bin/javac", "-source", "8", "-target", "8", "-classpath", android,
    "-d", classes, *sorted(root.glob("src/**/*.java")),
])
run([java / "bin/jar", "cf", output / "classes.jar", "-C", classes, "."])
run([tools / "d8", "--lib", android, "--min-api", "26", "--output", dex, output / "classes.jar"])
run([tools / "aapt", "package", "-f", "-M", root / "AndroidManifest.xml", "-I", android, "-F", output / "unsigned.apk"])
run([tools / "aapt", "add", output / "unsigned.apk", "classes.dex"], cwd=dex)
run([tools / "zipalign", "-f", "4", output / "unsigned.apk", output / "qa.apk"])
signer = output / "test-only.p12"
if not signer.exists():
    run([
        java / "bin/keytool", "-genkeypair", "-keystore", signer, "-storetype", "PKCS12",
        "-alias", "qa", "-storepass", "android", "-keypass", "android", "-dname",
        "CN=Search WebView Tests", "-keyalg", "RSA", "-validity", "3650",
    ])
run([tools / "apksigner", "sign", "--ks", signer, "--ks-pass", "pass:android", "--key-pass", "pass:android", output / "qa.apk"])
print(output / "qa.apk")
