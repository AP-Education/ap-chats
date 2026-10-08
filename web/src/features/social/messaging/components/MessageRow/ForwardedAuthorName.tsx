import { createStyles } from 'antd-style';

import { MemberPopover } from '@/features/social/people/components/MemberPopover/MemberPopover';

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
    <MemberPopover member={member}>
      <button type="button" className={styles.name}>
        {member.displayName ?? 'Ім’я недоступне'}
      </button>
    </MemberPopover>
  );
}
