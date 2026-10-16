import { type MentionToken, tokenText } from '../../mention-tokens';
import type { MentionLabel } from '../../types';
import { ChannelReference } from './ChannelReference';
import { MemberReference } from './MemberReference';
import { MentionChipText } from './MentionChip';
import styles from './MentionChip.module.css';
import { RoleReference } from './RoleReference';

interface MentionReferenceProps {
  token: MentionToken;
  people: Map<string, MentionLabel>;
  inline: boolean;
  /** The reference reached the viewer, so its tag reads as theirs. */
  mine: boolean;
}

/** The one place a reference in a message becomes its tag, whatever kind it is. */
export function MentionReference({ token, people, inline, mine }: MentionReferenceProps) {
  switch (token.kind) {
    case 'member':
      return (
        <MemberReference
          memberId={token.id}
          person={people.get(token.id)}
          inline={inline}
          mine={mine}
        />
      );
    case 'role':
      return <RoleReference roleId={token.id} mine={mine} />;
    case 'channel':
      return <ChannelReference channelId={token.id} inline={inline} />;
    case 'everyone':
      return (
        <span className={styles.mention} data-me={mine || undefined}>
          <MentionChipText>{tokenText(token)}</MentionChipText>
        </span>
      );
  }
}
