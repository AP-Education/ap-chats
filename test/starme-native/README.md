# StarMe native WebView QA

Builds isolated test wrappers without release credentials. They load the production composer, conversation footer, StarMe extension and activity UI, with actual posting/access/StarMe services over a migrated disposable PostgreSQL database (PGlite). Only the external agent and realtime transport are deterministic test doubles. No dotenv, production sign-in or company data is used.

From the repository root, with Node 24 and dependencies installed:

```sh
node --import tsx web/tests/starme/serve-api.cts
node web/node_modules/vite/bin/vite.js --config web/tests/starme/vite.config.mts --host 0.0.0.0
python3 test/starme-native/ios/build.py
JAVA_HOME=$(/usr/libexec/java_home) python3 test/starme-native/android/build.py
```

Install the resulting `.app` into the task's iOS Simulator and APK into its Android emulator, then launch `com.apeducation.starmeqa`. Both use `127.0.0.1:5575`; run `adb -s emulator-5554 reverse tcp:5575 tcp:5575` before starting Android.

The page's opt-in `native` scenario checks opening StarMe, typing, sending without a mention, thinking, answer, preserved question after agent failure, retry, returning and restoring the same history, and phone width. These are scripted DOM interactions inside native WKWebView/Android WebView; they do not claim physical touch or keyboard coverage. Trusted touch and keyboard/browser input are exercised by Playwright separately.

Read the result using a disposable QA bearer:

```sh
curl -H 'Authorization: Bearer fixture-only:monitor' http://127.0.0.1:5576/api/qa/results
```

Browser regressions: `pnpm exec playwright test --config web/tests/starme/playwright.config.ts`. Chromium desktop, 390px, 320px run with 4x CPU; WebKit covers Safari. Production OIDC and the real AI service are separate deployment checks.
