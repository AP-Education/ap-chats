# Local native voice QA

This isolated Expo Go app mounts the production `VoiceMessageRuntime` and the real web composer. It uses disposable `fixture-only` auth, a synthetic local API, and an opaque native recording handle. No real dotenv, accounts, release credentials, or cloud builds are used.

Prerequisites: the workspace dependencies, Node 24, Expo Go for SDK 57, and local Android/iOS simulators. Link dependencies once from this directory: `ln -s ../../mobile/node_modules node_modules`.

From the repository root, start the local API:

```sh
node --import tsx web/tests/voice/serve-api.mts
```

From `web/`, start the composer:

```sh
node node_modules/vite/bin/vite.js --config tests/voice/vite.config.mts --port 5573 --host 127.0.0.1
```

From the repository root, start Metro:

```sh
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_URL=http://127.0.0.1:5572 \
EXPO_PUBLIC_VOICE_QA_AUTORUN=true REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 \
node mobile/node_modules/expo/bin/cli start test/voice-native --go --lan --port 8084 --max-workers 2
```

Android needs `adb reverse tcp:5572 tcp:5572` and `adb reverse tcp:8084 tcp:8084`. Its web page uses the emulator's `10.0.2.2` host alias. Keep the simulator screen awake. Disable the Android emulator's host microphone with `adb emu avd hostmicoff` to record encoded silence. On iOS, use a test audio input; local simulator recordings are disposable and must never be committed.

Open `exp://127.0.0.1:8084` in Expo Go. On first launch, dismiss Expo Go's developer introduction and allow microphone access for this QA project. The SDK scenario records, pauses, resumes, finalizes AAC, previews, rejects a different conversation and uploads. Then `web-scenario.ts` exercises hold/slide-up lock, pause/preview/send, slide-left cancellation and hold/release send through the real composer, bridge, native recorder, upload queue, outbox and voice bubble. The injected gesture events test WebView integration; browser tests additionally cover trusted pointer capture and Chromium touch input. Results appear in the local API log as `NATIVE_QA`; `GET /api/qa-results` with bearer `fixture-only` returns the same reports.

Without `EXPO_PUBLIC_VOICE_QA_AUTORUN`, test manually: hold the microphone and release to send, slide left to cancel, or slide up to lock. A short tap/keyboard activation starts hands-free recording. In locked mode use Pause/Continue, Stop, Preview, Send. No extra Start button or modal should appear. Verify actual touch gestures separately on both platforms; cancelling must immediately restore the text composer. Verify the voice bubble in both the channel and the DM, cancellation, reopening, and switching conversations. This is a focused native integration fixture; it does not verify production account sign-in, native CallKit/Telecom interruption or device routing. Real phone-call interruptions require physical Android and iOS devices.

After testing, stop the local servers, reset/stop the QA app and delete its disposable recordings. The runtime releases recording files after handoff or cancellation; the local API holds uploaded QA bytes only in memory until stopped.
