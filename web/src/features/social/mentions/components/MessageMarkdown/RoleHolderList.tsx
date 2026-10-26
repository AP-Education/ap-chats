import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

import type { RoleMember } from '@/features/roles/types';
import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';
import { Avatar } from '@/shared/ui/Avatar';

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    max-height: 320px;
    margin: 0;
    padding: 4px;
    overflow-y: auto;
    list-style: none;
  `,
  member: css`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: none;
    color: ${token.colorText};
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: ${token.colorFillQuaternary};
    }
  `,
  name: css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  status: css`
    padding: 8px 12px 12px;
    color: ${token.colorTextTertiary};
  `,
}));

interface RoleHolderListProps {
  workspaceId: string;
  holders: RoleMember[] | undefined;
}

/** Who holds a role, each opening their profile. */
export function RoleHolderList({ workspaceId, holders }: RoleHolderListProps) {
  const { styles } = useStyles();

  if (!holders) {
    return (
      <div className={styles.status}>
        <Skeleton active avatar title={false} paragraph={{ rows: 1 }} />
      </div>
    );
  }
  if (!holders.length) return <div className={styles.status}>У ролі ще нікого немає</div>;

  return (
    <ul className={styles.list}>
      {holders.map((holder) => {
        const name = holder.displayName ?? 'Ім’я недоступне';
        return (
          <li key={holder.memberId}>
            <MemberProfileTrigger member={{ workspaceId, ...holder }}>
              <button type="button" className={styles.member}>
                <Avatar path={holder.avatarPath} alt={name} size={28} shape="circle" />
                <span className={styles.name}>{name}</span>
              </button>
            </MemberProfileTrigger>
          </li>
        );
      })}
    </ul>
  );
}
