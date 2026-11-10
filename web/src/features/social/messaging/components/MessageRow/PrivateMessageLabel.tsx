import { LockSimpleIcon } from '@phosphor-icons/react';

import { useMessageActionScope } from './MessageActionScope';
import styles from './PrivateMessageLabel.module.css';

export function PrivateMessageLabel() {
  const { item } = useMessageActionScope();
  if (!item.message.privateToMe) return null;
  return (
    <span className={styles.label}>
      <LockSimpleIcon size={12} /> Лише для вас · StarMe
    </span>
  );
}
