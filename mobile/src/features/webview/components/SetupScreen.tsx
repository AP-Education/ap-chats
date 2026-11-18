import { useTranslation } from 'react-i18next';

import { GateScreen } from '../../../components/GateScreen';

export function SetupScreen() {
  const { t } = useTranslation('webview');

  return (
    <GateScreen
      icon="construct-outline"
      title={t(($) => $.setup.title)}
      description={t(($) => $.setup.description)}
    />
  );
}
