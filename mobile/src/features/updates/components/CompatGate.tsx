import * as Application from 'expo-application';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking } from 'react-native';

import { GateScreen } from '../../../components/GateScreen';
import { useNativeCallStore } from '../../calls/store/native-call-store';
import { fetchCompat, loadRememberedCompat } from '../api/compat-api';
import type { CompatDecision } from '../types';
import { decideCompat, parseBuildNumber } from '../utils/decide-compat';

const build = parseBuildNumber(Application.nativeBuildVersion);

/**
 * Stops a build the API no longer supports and sends it to the store. Children render at once
 * and keep rendering until a check says otherwise, so the gate never delays a launch. It asks
 * again on every return to the app, and never interrupts a call in progress.
 */
export function CompatGate({ children }: PropsWithChildren) {
  const { t } = useTranslation('updates');
  const [decision, setDecision] = useState<CompatDecision>({ kind: 'ok' });
  const inCall = useNativeCallStore((state) => state.call !== null);

  useEffect(() => {
    let current = true;
    const check = async () => {
      const [fresh, remembered] = await Promise.all([fetchCompat(), loadRememberedCompat()]);
      if (current) setDecision(decideCompat(build, fresh, remembered));
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

  if (decision.kind === 'ok' || inCall) return <>{children}</>;

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
