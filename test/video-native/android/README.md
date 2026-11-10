# Android video WebView smoke test

This isolated test package loads the production chat fixture in Android's system WebView. It performs 18 assertions, including playback following a native touch, portrait controls clear of captions, legacy playback and removal of the player on closing. It saves screenshots in the test app's private files. It does not authenticate or install the full Expo AP App.

Requirements: a running Android emulator (API 36.1 was used), SDK platform 36, build tools 36.1.0, Java 17, and the built fixture served on port 5568. Set `ANDROID_HOME` and `JAVA_HOME`; `ANDROID_BUILD_TOOLS` can select another installed build-tools version.

```sh
pnpm --filter @ap-chats/web exec vite build --config tests/media/vite.config.mts
pnpm --filter @ap-chats/web exec vite preview --config tests/media/vite.config.mts
```

In another terminal:

```sh
python3 test/video-native/android/build.py
adb install -r test/video-native/android/build/qa.apk
adb shell am instrument -w com.apeducation.videoqa/.PreviewInstrumentation
```

The emulator reaches the host at `10.0.2.2:5568`. A successful run prints `PASS` followed by the completed assertions. Instrumentation failure prints `FAIL` and the assertions reached before it. A test-only certificate and all build output are generated inside ignored `build/`; release credentials are not used.

For a saved screenshot:

```sh
adb exec-out run-as com.apeducation.videoqa cat files/android-compact-chat.png > /tmp/android-video-chat.png
```
