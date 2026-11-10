import { XIcon } from '@phosphor-icons/react';
import { Button, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/shared/ui/Avatar';

import type { RoleMember } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: ${token.marginSM}px 0 0;
    padding: 0;
    list-style: none;
  `,
  member: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 6px 6px 6px 8px;
    border-radius: ${token.borderRadiusLG}px;

    &:hover {
      background: ${token.colorFillQuaternary};
    }
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: ${token.colorText};
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  // Shown on hover where there is one; a touch screen keeps it in view.
  remove: css`
    && {
      color: ${token.colorTextTertiary};
    }

    @media (hover: hover) {
      opacity: 0;

      li:hover > &,
      li:focus-within > & {
        opacity: 1;
      }
    }
  `,
  empty: css`
    margin-top: ${token.marginSM}px;
    color: ${token.colorTextTertiary};
  `,
}));

interface RoleMemberListProps {
  members: RoleMember[] | undefined;
  onRemove: (memberId: string) => void;
}

export function RoleMemberList({ members, onRemove }: RoleMemberListProps) {
  const { styles } = useStyles();
  const { t } = useTranslation('roles');

  if (!members) return <Skeleton active avatar title={false} paragraph={{ rows: 2 }} />;
  if (!members.length) return <div className={styles.empty}>{t(($) => $.members.empty)}</div>;

  return (
    <ul className={styles.list}>
      {members.map((member) => {
        const name = member.displayName ?? t(($) => $.unnamedMember);
        return (
          <li className={styles.member} key={member.memberId}>
            <Avatar path={member.avatarPath} alt={name} size={32} shape="circle" />
            <span className={styles.name}>{name}</span>
            <Button
              type="text"
              shape="circle"
              className={styles.remove}
              icon={<XIcon size={16} />}
              aria-label={t(($) => $.members.remove, { name })}
              onClick={() => onRemove(member.memberId)}
            />
          </li>
        );
      })}
    </ul>
  );
}
