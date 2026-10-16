import { useEffect, useEffectEvent } from 'react';
import { BackHandler } from 'react-native';

interface SystemBackProps {
  /** Takes Android's back step, or returns false to leave it to the system. */
  onBack: () => boolean;
}

/** Android's back button and gesture, answered by the screen before the system. */
export function SystemBack({ onBack }: SystemBackProps) {
  const handleBack = useEffectEvent(onBack);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, []);

  return null;
}
