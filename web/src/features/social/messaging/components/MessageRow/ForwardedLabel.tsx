import { ForwardIcon } from '../../actionIcons';
import { ForwardedAuthorName } from './ForwardedAuthorName';
import styles from './ForwardedLabel.module.css';
import { useMessageActionScope } from './MessageActionScope';

export function ForwardedLabel() {
  const { item } = useMessageActionScope();

  if (!item.message.isForwarded) return null;

  return (
    <div className={styles.forwarded}>
      <ForwardIcon size={14} aria-hidden />
      <span>
        Переслано від <ForwardedAuthorName member={item.forwardedFrom} />
      </span>
    </div>
  );
}
