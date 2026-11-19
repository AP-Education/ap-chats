import * as Application from 'expo-application';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking } from 'react-native';

import { GateScreen } from '../../../components/GateScreen';
import { useNativeCallStore } from '../../calls/store/native-call-store';
import { fetchCompat, loadRememberedCompat } from '../api/compat-api';
import { useUpdateStore } from '../store/update-store';
import type { CompatDecision } from '../types';
import { decideCompat, parseBuildNumber } from '../utils/decide-compat';

const build = parseBuildNumber(Application.nativeBuildVersion);

/**
 * Stops a build the API no longer supports and sends it to the store. Children render at once
 * and keep rendering until a check says otherwise, so the gate never delays a launch. It asks
 * again on every return to the app, and never interrupts a call, a recording or an upload.
 */
export function CompatGate({ children }: PropsWithChildren) {
  const { t } = useTranslation('updates');
  const [decision, setDecision] = useState<CompatDecision>({ kind: 'ok' });
  const inCall = useNativeCallStore((state) => state.call !== null);
  // The gate replaces the page, so it waits like a reload does: a recording or an upload in
  // the page would be lost with it.
  const pageBusy = useUpdateStore((state) => state.busySources.length > 0);

  useEffect(() => {
    let current = true;
    // One check at a time, so an older answer can neither replace a newer decision nor its
    // remembered copy. A return to the app during a check asks once more after it.
    let running = false;
    let again = false;
    const check = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        do {
          again = false;
          const [fresh, remembered] = await Promise.all([fetchCompat(), loadRememberedCompat()]);
          if (current) setDecision(decideCompat(build, fresh, remembered));
        } while (again && current);
      } finally {
        running = false;
      }
    };

    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      current = false;
      subscription.remove();
    };
  }, []);

  if (decision.kind === 'ok' || inCall || pageBusy) return <>{children}</>;

  const { storeUrl } = decision;
  return (
    <GateScreen
      icon="cloud-download-outline"
      title={t(($) => $.required.title)}
      description={t(($) => $.required.description)}
      actions={
        storeUrl
          ? [{ label: t(($) => $.required.open), onPress: () => void Linking.openURL(storeUrl) }]
          : []
      }
    />
  );
}
