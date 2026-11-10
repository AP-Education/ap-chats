import { useTranslation } from 'react-i18next';

import { GateScreen } from '../../../components/GateScreen';

export function ConnectionErrorScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('webview');

  return (
    <GateScreen
      icon="cloud-offline"
      title={t(($) => $.connectionError.title)}
      description={t(($) => $.connectionError.description)}
      actions={[{ label: t(($) => $.connectionError.retry), onPress: onRetry }]}
    />
  );
}
