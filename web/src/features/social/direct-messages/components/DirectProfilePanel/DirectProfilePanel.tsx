import { useShellLocale } from '@ap-education/shell-sdk';
import { PageAsideClose, PageHeader, PageTitle } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { DirectMessage } from '@/features/social/direct-messages/api/direct-messages-api';
import { MemberIdentity } from '@/features/social/people/components/MemberIdentity';
import type { WorkspaceMember } from '@/features/workspaces/types';
import { dateTimeFormat } from '@/shared/i18n/format';

const joinedFormat = dateTimeFormat({
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
  const { t } = useTranslation(['directMessages', 'workspaces']);
  const locale = useShellLocale();
  const name =
    member?.profile.displayName ?? participant.displayName ?? t(($) => $.nameUnavailable);
  const avatarPath = member?.profile.avatarPath ?? participant.avatarPath;
  const role = participant.active
    ? t(($) => $.workspaces.accessLevels[member?.accessLevel ?? 'member'])
    : t(($) => $.profile.formerMember);

  return (
    <div className={styles.shell}>
      <PageHeader>
        <PageTitle>{t(($) => $.profile.title)}</PageTitle>
        <PageAsideClose aria-label={t(($) => $.profile.close)} />
      </PageHeader>
      <section className={styles.body} aria-label={t(($) => $.profile.label, { name })}>
        <MemberIdentity
          name={name}
          avatarPath={avatarPath}
          detail={role}
          headingLevel="h2"
          avatarSize={180}
        />
        {member?.createdAt && (
          <div className={styles.details}>
            {t(($) => $.profile.memberSince)}{' '}
            <time dateTime={member.createdAt}>
              {joinedFormat(locale).format(new Date(member.createdAt))}
            </time>
          </div>
        )}
      </section>
    </div>
  );
}
