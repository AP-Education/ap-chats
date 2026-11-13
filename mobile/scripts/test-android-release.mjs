import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const serial = process.env.ANDROID_SERIAL;
const isEmulator = /^emulator-\d+$/.test(serial ?? '');
assert.ok(isEmulator, 'Set ANDROID_SERIAL to a disposable Android emulator.');

const { expo } = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const packageName = expo.android.package;
const adb = (...args) =>
  execFileSync('adb', ['-s', serial, ...args], { encoding: 'utf8', timeout: 60_000 }).trim();

const apk = process.argv[2];
assert.ok(apk, 'Pass the release APK path.');
adb('install', '-r', apk);

const details = adb('shell', 'dumpsys', 'package', packageName);
const isDebuggable = /(?:pkgFlags|flags)=\[[^\]]*\bDEBUGGABLE\b/.test(details);
assert.equal(isDebuggable, false, 'Use a release APK so native shrinking is exercised.');

adb('shell', 'am', 'force-stop', packageName);
adb('shell', 'am', 'start', '-W', '-n', `${packageName}/.MainActivity`);

// JNI registration can crash after ActivityManager reports a successful launch.
let firstPid;
for (let sample = 0; sample < 10; sample++) {
  await setTimeout(1_000);
  let pid = '';
  try {
    pid = adb('shell', 'pidof', packageName);
  } catch {}

  assert.ok(pid, 'The release app exited during startup. Inspect adb logcat -b crash.');
  firstPid ??= pid;
  assert.equal(pid, firstPid, 'The release app restarted during startup.');
}

console.log('Android release startup passed: process remained alive for 10 seconds.');
