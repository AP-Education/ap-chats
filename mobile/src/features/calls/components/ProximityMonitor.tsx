import { useEffect } from 'react';

import { setProximityMonitoring } from '../../../../modules/proximity';
import { useNativeCallStore } from '../store/native-call-store';

/** Screen off at the ear, only while a connected call plays through the earpiece. */
export function ProximityMonitor() {
  const isAtEar = useNativeCallStore(
    (state) =>
      state.call?.status === 'connected' && state.call.audioRoute?.current?.kind === 'earpiece',
  );

  useEffect(() => {
    setProximityMonitoring(isAtEar);

    return () => setProximityMonitoring(false);
  }, [isAtEar]);

  return null;
}
