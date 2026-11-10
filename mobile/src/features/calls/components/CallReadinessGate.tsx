import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

import { fixCallCheck, readCallChecks } from '../../../../modules/call-readiness';
import { GateScreen } from '../../../components/GateScreen';
import {
  forgetRingInTheDark,
  hasPutOffCallReadiness,
  hasRungInTheDark,
  putOffCallReadiness,
} from '../api/readiness-prompt-state';
import { nextReadinessStep, type ReadinessStep } from '../utils/readiness-step';

/**
 * Android lets an incoming call light up a locked phone, and reach it without delay, only once the
 * person allows both. Asked once per install, again after a call that could not light the screen,
 * and read again on every return from the settings.
 */
export function CallReadinessGate({ children }: PropsWithChildren) {
  const { t } = useTranslation('calls');
  const isAndroid = Platform.OS === 'android';
  const [step, setStep] = useState<ReadinessStep | null | 'checking'>(
    isAndroid ? 'checking' : null,
  );
  const [rangInTheDark, setRangInTheDark] = useState(false);

  useEffect(() => {
    if (!isAndroid) return;

    async function check() {
      const [putOff, rang] = await Promise.all([hasPutOffCallReadiness(), hasRungInTheDark()]);
      const next = nextReadinessStep(readCallChecks(), { putOff, rangInTheDark: rang });
      // Allowed, or put off once more, the dark ring has had its answer.
      if (!next && rang) await forgetRingInTheDark();

      setRangInTheDark(rang);
      setStep(next);
    }

    void check();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => appState.remove();
  }, [isAndroid]);

  async function later() {
    await Promise.all([putOffCallReadiness(), forgetRingInTheDark()]);
    setStep(null);
  }

  if (step === 'checking') {
    return <GateScreen icon="call" title={t(($) => $.readiness.checking)} loading />;
  }
  if (step === 'fullScreen') {
    return (
      <GateScreen
        icon="call"
        title={
          rangInTheDark
            ? t(($) => $.readiness.fullScreen.missedTitle)
            : t(($) => $.readiness.fullScreen.title)
        }
        description={
          rangInTheDark
            ? t(($) => $.readiness.fullScreen.missedDescription)
            : t(($) => $.readiness.fullScreen.description)
        }
        actions={[
          {
            label: t(($) => $.readiness.fullScreen.action),
            onPress: () => fixCallCheck('fullScreen'),
          },
          { label: t(($) => $.readiness.later), onPress: () => void later(), variant: 'secondary' },
        ]}
      />
    );
  }
  if (step === 'unrestricted') {
    return (
      <GateScreen
        icon="battery-charging"
        title={t(($) => $.readiness.unrestricted.title)}
        description={t(($) => $.readiness.unrestricted.description)}
        actions={[
          {
            label: t(($) => $.readiness.unrestricted.action),
            onPress: () => fixCallCheck('unrestricted'),
          },
          { label: t(($) => $.readiness.later), onPress: () => void later(), variant: 'secondary' },
        ]}
      />
    );
  }
  return <>{children}</>;
}
