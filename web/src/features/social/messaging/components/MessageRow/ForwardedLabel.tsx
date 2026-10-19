import { useTranslation } from 'react-i18next';

import { ForwardIcon } from '../../actionIcons';
import { ForwardedAuthorName } from './ForwardedAuthorName';
import styles from './ForwardedLabel.module.css';
import { useMessageActionScope } from './MessageActionScope';

export function ForwardedLabel() {
  const { t } = useTranslation('messaging');
  const { item } = useMessageActionScope();

  if (!item.message.isForwarded) return null;

  return (
    <div className={styles.forwarded}>
      <ForwardIcon size={14} aria-hidden />
      <span>
        {t(($) => $.message.forwardedFrom)} <ForwardedAuthorName member={item.forwardedFrom} />
      </span>
    </div>
  );
}
