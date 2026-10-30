from pathlib import Path
import plistlib
import subprocess

root = Path(__file__).resolve().parent
output = root / "build"
app = output / "AP Search Tests.app"
app.mkdir(parents=True, exist_ok=True)
with (app / "Info.plist").open("wb") as file:
    plistlib.dump({
        "CFBundleIdentifier": "com.apeducation.searchqa",
        "CFBundleExecutable": "APSearchTests",
        "CFBundleName": "AP Search Tests",
        "CFBundlePackageType": "APPL",
        "CFBundleVersion": "1",
        "CFBundleShortVersionString": "1.0",
        "MinimumOSVersion": "18.0",
        "LSRequiresIPhoneOS": True,
        "UIDeviceFamily": [1, 2],
        "UILaunchScreen": {},
        "NSAppTransportSecurity": {"NSAllowsLocalNetworking": True},
        "UISupportedInterfaceOrientations": ["UIInterfaceOrientationPortrait", "UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"],
    }, file)
sdk = subprocess.check_output(["xcrun", "--sdk", "iphonesimulator", "--show-sdk-path"], text=True).strip()
subprocess.run(["xcrun", "--sdk", "iphonesimulator", "swiftc", "-parse-as-library", "-sdk", sdk, "-target", "arm64-apple-ios18.0-simulator", "-module-cache-path", str(output / "module-cache"), str(root / "App.swift"), "-o", str(app / "APSearchTests")], check=True)
subprocess.run(["codesign", "--force", "--sign", "-", str(app)], check=True)
print(app)
