import { GateScreen } from '../../../components/GateScreen';

export function ConnectionErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <GateScreen
      icon="cloud-offline"
      title="Немає з'єднання із сервером"
      description="Перевір мережу та спробуй ще раз."
      actions={[{ label: 'Спробувати знову', onPress: onRetry }]}
    />
  );
}
