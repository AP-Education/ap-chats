import { createStyles } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar';

import type { PersonReactions } from '../../reaction-display';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    padding: 6px 8px;
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 15px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  // Opaque text colour: Chromium fades colour emoji by its alpha.
  emojis: css`
    flex-shrink: 0;
    color: ${token.colorTextBase};
    font-size: 20px;
    letter-spacing: 2px;
  `,
}));

export function ReactorRow({ person }: { person: PersonReactions }) {
  const { styles } = useStyles();

  return (
    <li className={styles.row}>
      <Avatar path={person.avatarPath} alt={person.name} size={36} shape="circle" />
      <span className={styles.name}>{person.name}</span>
      <span className={styles.emojis} aria-label={person.emojis.join(' ')}>
        {person.emojis.join('')}
      </span>
    </li>
  );
}
