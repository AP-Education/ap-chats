import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
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

  if (step === 'checking') return <GateScreen icon="call" title="Перевіряємо" loading />;
  if (step === 'fullScreen') {
    return (
      <GateScreen
        icon="call"
        title={rangInTheDark ? 'Дзвінок не ввімкнув екран' : 'Щоб дзвінок вмикав екран'}
        description={
          rangInTheDark
            ? 'Телефон спав, тому Android показав дзвінок лише сповіщенням. Дозволь повноекранні сповіщення, і наступний дзвінок увімкне екран.'
            : 'Android показує вхідний дзвінок на весь екран заблокованого телефона лише з дозволом на повноекранні сповіщення.'
        }
        actions={[
          { label: 'Відкрити налаштування', onPress: () => fixCallCheck('fullScreen') },
          { label: 'Пізніше', onPress: () => void later(), variant: 'secondary' },
        ]}
      />
    );
  }
  if (step === 'unrestricted') {
    return (
      <GateScreen
        icon="battery-charging"
        title="Щоб дзвінки приходили одразу"
        description="Дозволь AP App працювати у фоні без обмежень, інакше Android притримує дзвінки й повідомлення, поки телефон спить."
        actions={[
          { label: 'Дозволити', onPress: () => fixCallCheck('unrestricted') },
          { label: 'Пізніше', onPress: () => void later(), variant: 'secondary' },
        ]}
      />
    );
  }
  return <>{children}</>;
}
