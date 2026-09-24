import { GateScreen } from '../../../components/GateScreen';

export function SetupScreen() {
  return (
    <GateScreen
      icon="construct-outline"
      title="Налаштуй адресу вебзастосунку"
      description="Вкажи EXPO_PUBLIC_WEB_URL у mobile/.env, щоб відкрити AP App."
    />
  );
}
