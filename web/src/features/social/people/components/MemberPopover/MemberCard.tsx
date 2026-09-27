import { ChatCircleDotsIcon, PhoneIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Button, message as toast, Skeleton, Tooltip } from 'antd';
import { createStyles } from 'antd-style';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useOpenDirectMessage } from '@/features/social/direct-messages/hooks/useOpenDirectMessage';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { ApiError } from '@/shared/api/http';
import { Avatar } from '@/shared/ui/Avatar/Avatar';

import { getMemberProfile } from '../../api/member-profile-api';

export interface MemberSummary {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
}

const useStyles = createStyles(({ token, css }) => ({
  card: css`
    width: min(288px, calc(100vw - 32px));
    padding: 22px;
    background: ${token.colorBgElevated};
    color: ${token.colorText};
    text-align: center;
  `,
  avatar: css`
    display: flex;
    justify-content: center;
    margin-bottom: 11px;
  `,
  name: css`
    overflow: hidden;
    margin: 0 0 3px;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 18px;
    font-weight: 650;
  `,
  detail: css`
    margin: 0;
    color: ${token.colorTextSecondary};
    font-size: 13px;
  `,
  actions: css`
    display: flex;
    gap: 8px;
    margin-top: 20px;
  `,
  message: css`
    flex: 1;
  `,
  loading: css`
    margin-top: 20px;
  `,
}));

export function MemberCard({ member }: { member: MemberSummary }) {
  const { styles } = useStyles();
  const { workspace } = useActiveWorkspace();
  const { token, identity } = useQueryAuth();
  const profile = useQuery({
    queryKey: ['member-profile', identity, workspace?.id, member.memberId],
    queryFn: () => getMemberProfile(token as string, workspace!.id, member.memberId),
    enabled: Boolean(token && workspace),
    refetchOnMount: 'always',
  });
  const { open, opening } = useOpenDirectMessage(workspace?.id ?? '');
  const name = profile.data
    ? (profile.data.displayName ?? 'Ім’я недоступне')
    : (member.displayName ?? 'Ім’я недоступне');
  const avatarPath = profile.data ? profile.data.avatarPath : member.avatarPath;
  const unavailable =
    !workspace || (profile.error instanceof ApiError && [403, 404].includes(profile.error.status));

  let detail = 'Учасник простору';
  if (profile.data?.role === 'owner') detail = 'Власник простору';
  else if (unavailable) detail = 'Учасник недоступний';

  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        <Avatar path={avatarPath} alt={name} size={72} shape="circle" />
      </div>
      <h3 className={styles.name}>{name}</h3>
      <p className={styles.detail}>{detail}</p>
      {profile.isPending && (
        <div className={styles.loading} aria-label="Завантажуємо профіль" role="status">
          <Skeleton.Button active block size="small" />
        </div>
      )}
      {!profile.isPending && !profile.data?.isSelf && (
        <div className={styles.actions}>
          <Button
            type="primary"
            className={styles.message}
            icon={<ChatCircleDotsIcon size={18} />}
            loading={opening}
            disabled={unavailable}
            onClick={() => {
              void open(member.memberId).catch(() => toast.error('Не вдалося відкрити розмову.'));
            }}
          >
            Написати
          </Button>
          <Tooltip title="Особисті дзвінки з’являться пізніше">
            <span>
              <Button icon={<PhoneIcon size={18} />} aria-label="Подзвонити" disabled />
            </span>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
