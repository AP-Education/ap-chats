import { PageAsideClose, PageHeader, PageTitle } from '@ap/ui';
import { createStyles } from 'antd-style';

import type { DirectMessage } from '@/features/social/direct-messages/api/direct-messages-api';
import { MemberIdentity } from '@/features/social/people/components/MemberIdentity';
import type { WorkspaceMember } from '@/features/workspaces/types';

const joinedFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    color: ${token.colorText};
    text-align: center;
  `,
  body: css`
    padding: 22px;
  `,
  details: css`
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid ${token.colorBorderSecondary};
    color: ${token.colorTextSecondary};
    font-size: 13px;
  `,
}));

interface DirectProfilePanelProps {
  participant: DirectMessage['participant'];
  member?: WorkspaceMember;
}

export function DirectProfilePanel({ participant, member }: DirectProfilePanelProps) {
  const { styles } = useStyles();
  const name = member?.profile.displayName ?? participant.displayName ?? 'Ім’я недоступне';
  const avatarPath = member?.profile.avatarPath ?? participant.avatarPath;
  const role = !participant.active
    ? 'Більше не в просторі'
    : member?.role === 'owner'
      ? 'Власник простору'
      : 'Учасник простору';

  return (
    <div className={styles.shell}>
      <PageHeader>
        <PageTitle>Профіль</PageTitle>
        <PageAsideClose aria-label="Закрити профіль" />
      </PageHeader>
      <section className={styles.body} aria-label={`Профіль ${name}`}>
        <MemberIdentity name={name} avatarPath={avatarPath} detail={role} headingLevel="h2" />
        {member?.createdAt && (
          <div className={styles.details}>
            У просторі з{' '}
            <time dateTime={member.createdAt}>
              {joinedFormat.format(new Date(member.createdAt))}
            </time>
          </div>
        )}
      </section>
    </div>
  );
}
