import type { PropsWithChildren } from 'react';

import { StarMePrivateHeading } from '../StarMePrivateHeading/StarMePrivateHeading';
import styles from './StarMeBlock.module.css';

export function StarMeBlock({
  children,
  questionId,
  showName = true,
}: PropsWithChildren<{ questionId?: string; showName?: boolean }>) {
  return (
    <div className={styles.block} data-message-block="star-me" data-question-id={questionId}>
      <StarMePrivateHeading showName={showName} />
      {children}
    </div>
  );
}
