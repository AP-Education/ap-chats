import { ContentState, ContentStateDescription, ContentStateIcon } from '@ap-education/ui';
import { UsersIcon } from '@phosphor-icons/react';
import { Button, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { WorkspaceMemberLabel } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import type { MemberGroup } from '../../member-groups';
import { ChannelMemberRow } from './ChannelMemberRow';

const useStyles = createStyles(({ token, css }) => ({
  body: css`
    flex: 1;
    min-height: 0;
    padding: 8px;
    overflow-y: auto;
  `,
  group: css`
    margin: 0;
    padding: 0;
    list-style: none;
  `,
  groupTitle: css`
    margin: 12px 10px 4px;
    color: ${token.colorTextTertiary};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;

    &:first-child {
      margin-top: 4px;
    }
  `,
  groupCount: css`
    margin-left: 6px;
    font-weight: 600;
  `,
  skeletonRow: css`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 58px;
    padding: 6px 8px;
  `,
}));

interface ChannelMembersContentProps {
  isLoading: boolean;
  isError: boolean;
  groups: MemberGroup[];
  byId: Map<string, WorkspaceMemberLabel>;
  onRetry: () => void;
}

export function ChannelMembersContent({
  isLoading,
  isError,
  groups,
  byId,
  onRetry,
}: ChannelMembersContentProps) {
  const { t } = useTranslation(['communities', 'common']);
  const { styles } = useStyles();

  if (isLoading) {
    return (
      <div className={styles.body} role="status" aria-label={t(($) => $.members.loading)}>
        {[0, 1, 2, 3].map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <Skeleton.Avatar active size={40} />
            <Skeleton.Input active size="small" style={{ width: 120 }} />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.body} role="alert">
        {t(($) => $.members.loadFailed)}
        <Button type="link" onClick={onRetry}>
          {t(($) => $.common.actions.retry)}
        </Button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className={styles.body}>
        <ContentState compact>
          <ContentStateIcon>
            <UsersIcon />
          </ContentStateIcon>
          <ContentStateDescription>{t(($) => $.members.empty)}</ContentStateDescription>
        </ContentState>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      {groups.map((group) => (
        <section key={group.key} aria-label={group.title}>
          <h4 className={styles.groupTitle}>
            {group.title}
            <span className={styles.groupCount}>{group.members.length}</span>
          </h4>
          <ul className={styles.group}>
            {group.members.map((membership) => {
              const entry = byId.get(membership.memberId);
              if (!entry) return null;
              return (
                <ChannelMemberRow
                  key={membership.memberId}
                  entry={entry}
                  color={membership.roleColor}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
