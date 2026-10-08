import { requireOptionalNativeModule } from 'expo';
import type * as CallKitModule from 'expo-callkit-telecom';

let modulePromise: Promise<typeof CallKitModule | null> | undefined;

/**
 * expo-callkit-telecom's native module throws synchronously while its own
 * top-level code runs — on the iOS Simulator, where CallKit has no real
 * functional support, that happens unconditionally. A static `import` would
 * run that top-level code as part of evaluating whatever imports it, crashing
 * the whole app before any try/catch in *our* code gets a chance to run. A
 * dynamic import defers that to a promise we can actually catch, so the rest
 * of the app degrades to "no calling" instead of going down with it.
 */
export function loadCallKitModule(): Promise<typeof CallKitModule | null> {
  if (!modulePromise) {
    modulePromise = Promise.resolve()
      .then(() => {
        if (!requireOptionalNativeModule('ExpoCallKitTelecom')) return null;
        return import('expo-callkit-telecom');
      })
      .catch((error: unknown) => {
        if (__DEV__)
          console.warn('[calls] expo-callkit-telecom unavailable on this runtime', error);
        return null;
      });
  }
  return modulePromise;
}

/** Fire-and-forget a CallKit action; a runtime without CallKit simply skips it. */
export function withCallKit(action: (CallKit: typeof CallKitModule) => unknown): void {
  void loadCallKitModule().then((CallKit) => CallKit && action(CallKit));
}
