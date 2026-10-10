import { createStyles } from 'antd-style';

import { MemberProfileTrigger } from '@/features/social/people/components/MemberProfile/MemberProfileTrigger';

import type { MessageAuthor } from '../../types';

const useStyles = createStyles(({ css }) => ({
  name: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  `,
}));

/** The original author of a forwarded message; one no longer known stays plain text. */
export function ForwardedAuthorName({ member }: { member: MessageAuthor | null }) {
  const { styles } = useStyles();

  if (!member) return 'Ім’я недоступне';

  return (
    <MemberProfileTrigger member={member}>
      <button type="button" className={styles.name}>
        {member.displayName ?? 'Ім’я недоступне'}
      </button>
    </MemberProfileTrigger>
  );
}
