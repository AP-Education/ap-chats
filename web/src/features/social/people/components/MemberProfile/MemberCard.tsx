import { ChatTextIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Button, message as toast, Skeleton } from 'antd';
import { createStyles } from 'antd-style';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { CallIcon } from '@/features/calls/callIcons';
import { useOpenDirectMessage } from '@/features/social/direct-messages/hooks/useOpenDirectMessage';
import { useActiveWorkspace } from '@/features/workspaces/hooks/useActiveWorkspace';
import { ApiError } from '@/shared/api/http';

import { getMemberProfile } from '../../api/member-profile-api';
import type { MemberSummary } from '../../types';
import { MemberIdentity } from '../MemberIdentity';

const useStyles = createStyles(({ token, css }) => ({
  card: css`
    box-sizing: border-box;
    padding: 22px;
    color: ${token.colorText};
    text-align: center;
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

interface MemberCardProps {
  member: MemberSummary;
  onConversationOpen: () => void;
}

export function MemberCard({ member, onConversationOpen }: MemberCardProps) {
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
      <MemberIdentity name={name} avatarPath={avatarPath} detail={detail} />
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
            icon={<ChatTextIcon size={20} />}
            loading={opening}
            disabled={unavailable}
            onClick={() => {
              void open(member.memberId).then(onConversationOpen, () =>
                toast.error('Не вдалося відкрити розмову.'),
              );
            }}
          >
            Написати
          </Button>
          <Button icon={<CallIcon size={20} />} aria-label="Подзвонити" disabled />
        </div>
      )}
    </div>
  );
}
