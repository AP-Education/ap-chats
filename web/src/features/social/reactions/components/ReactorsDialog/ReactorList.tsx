import { Button, Skeleton } from 'antd';
import { createStyles } from 'antd-style';

import { useReactors } from '../../hooks/useReactors';
import { reactionsByPerson } from '../../reaction-display';
import { ReactorRow } from './ReactorRow';

const SKELETON_ROWS = 3;

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    min-height: 152px;
    max-height: min(56dvh, 440px);
    margin: 0 -8px;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  `,
  placeholder: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    padding: 6px 8px;
  `,
  note: css`
    padding: 8px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface ReactorListProps {
  messageId: string;
  emoji: string | undefined;
  /** How many reactions the list should hold, from the message itself. */
  expected: number;
}

export function ReactorList({ messageId, emoji, expected }: ReactorListProps) {
  const { styles } = useStyles();
  const reactors = useReactors(messageId, emoji, expected);

  if (reactors.isError && !reactors.data) {
    return (
      <div className={styles.list}>
        <p className={styles.note}>Не вдалося завантажити список.</p>
        <Button type="link" onClick={() => void reactors.refetch()}>
          Повторити
        </Button>
      </div>
    );
  }

  if (!reactors.data) {
    return (
      <div className={styles.list} aria-busy="true">
        {Array.from({ length: SKELETON_ROWS }, (_, row) => (
          <div key={row} className={styles.placeholder}>
            <Skeleton.Avatar active size={36} />
            <Skeleton.Input active size="small" />
          </div>
        ))}
      </div>
    );
  }

  const people = reactionsByPerson(reactors.data);
  const unlisted = expected - reactors.data.length;

  return (
    <ul className={styles.list}>
      {people.map((person) => (
        <ReactorRow key={person.memberId} person={person} />
      ))}
      {unlisted > 0 && <li className={styles.note}>і ще {unlisted}</li>}
    </ul>
  );
}
