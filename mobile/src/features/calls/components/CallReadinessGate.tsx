import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
  askToRunUnrestricted,
  openFullScreenCallSettings,
  readCallReadiness,
} from '../../../../modules/call-readiness';
import { GateScreen } from '../../../components/GateScreen';
import { hasPutOffCallReadiness, putOffCallReadiness } from '../api/readiness-prompt-state';
import { nextReadinessStep, type ReadinessStep } from '../utils/readiness-step';

/**
 * Android lets an incoming call light up a locked phone, and reach it without delay, only once the
 * person allows both. Asked once per install, and read again on every return from the settings.
 */
export function CallReadinessGate({ children }: PropsWithChildren) {
  const isAndroid = Platform.OS === 'android';
  const [step, setStep] = useState<ReadinessStep | null | 'checking'>(
    isAndroid ? 'checking' : null,
  );
  const putOff = useRef(false);

  useEffect(() => {
    if (!isAndroid) return;
    const check = () => setStep(nextReadinessStep(readCallReadiness(), putOff.current));

    void hasPutOffCallReadiness().then((value) => {
      putOff.current = value;
      check();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => appState.remove();
  }, [isAndroid]);

  async function later() {
    putOff.current = true;
    await putOffCallReadiness();
    setStep(null);
  }

  if (step === 'checking') return <GateScreen icon="call" title="Перевіряємо" loading />;
  if (step === 'fullScreen') {
    return (
      <GateScreen
        icon="call"
        title="Щоб дзвінок вмикав екран"
        description="Android показує вхідний дзвінок на весь екран заблокованого телефона лише з дозволом на повноекранні сповіщення."
        actions={[
          { label: 'Відкрити налаштування', onPress: openFullScreenCallSettings },
          { label: 'Пізніше', onPress: () => void later(), variant: 'secondary' },
        ]}
      />
    );
  }
  if (step === 'background') {
    return (
      <GateScreen
        icon="battery-charging"
        title="Щоб дзвінки приходили одразу"
        description="Дозволь AP App працювати у фоні без обмежень, інакше Android притримує дзвінки й повідомлення, поки телефон спить."
        actions={[
          { label: 'Дозволити', onPress: askToRunUnrestricted },
          { label: 'Пізніше', onPress: () => void later(), variant: 'secondary' },
        ]}
      />
    );
  }
  return <>{children}</>;
}
