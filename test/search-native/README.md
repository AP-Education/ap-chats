# Native search verification

These isolated test apps load the production search components and a synthetic local API in system WebViews. They reproduce the shell's `--app-keyboard-inset` contract from real keyboard geometry. They use package `com.apeducation.searchqa` and the label **AP Search Tests**; they do not change the AP App name or release signing. Generated app binaries, certificates, Xcode projects and results remain inside ignored `build/` folders.

Build and serve the fixture before running either platform:

```sh
pnpm --filter @ap-chats/web exec vite build --config tests/search/vite.config.mts
pnpm --filter @ap-chats/web exec vite preview --config tests/search/vite.config.mts
```

## Android

Requires Java 17, Android SDK platform 36 and build tools 36.1.0. Set `JAVA_HOME` and `ANDROID_HOME`; `ANDROID_BUILD_TOOLS` can select an installed build-tools version. Start a local emulator before running:

```sh
python3 test/search-native/android/build.py
adb install -r test/search-native/android/build/qa.apk
adb shell am instrument -w com.apeducation.searchqa/.SearchInstrumentation
```

The emulator reaches the host at `10.0.2.2:5570`. Instrumentation uses actual finger touches and the WebView's public IME `InputConnection`, waiting for each character to appear in the controlled input. It checks the three result groups, phone width, channel navigation, empty reopening, real system Back and opening a person's DM. A fresh API 36 keyboard may show a handwriting tutorial; test setup dismisses only that recognized tutorial.

Success prints `PASS` with the completed assertions. Failure prints `FAIL`, the current fixture input and a screenshot location. Screenshots are saved in the test app's private files:

```sh
adb exec-out run-as com.apeducation.searchqa cat files/android-search-keyboard.png > /tmp/android-search.png
```

## iOS

Requires Xcode and an installed iOS simulator runtime. Set `SEARCH_SIMULATOR_ID` to the UUID of a booted test simulator from `xcrun simctl list devices available`.

```sh
python3 test/search-native/ios/build.py
xcrun simctl install "$SEARCH_SIMULATOR_ID" 'test/search-native/ios/build/AP Search Tests.app'
xcrun simctl launch "$SEARCH_SIMULATOR_ID" com.apeducation.searchqa
```

Manual checks in Simulator:

1. Open search and type `design` using the system keyboard. Confirm all three groups and readable input/results above the keyboard.
2. Open `Design room` and confirm the channel destination. Reopen search and confirm an empty query.
3. Close using the header control, reopen and select `Design new person`. Confirm the DM destination.
4. Clear a query, close/reopen and check portrait/landscape layout. Record the runtime, result and screenshots with the test report.

This is a manual WKWebView pass. Playwright WebKit checks are automated separately and do not certify native iOS keyboard/navigation behavior.

These focused native checks use synthetic search data. They do not validate the full authenticated Expo shell or production services.
