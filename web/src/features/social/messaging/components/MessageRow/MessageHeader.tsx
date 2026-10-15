import { ForwardedLabel } from './ForwardedLabel';
import { MessageAddons } from './MessageAddons';
import { MessageAuthorName } from './MessageAuthorName';
import { ReplyReference } from './ReplyReference';

/** What sits above a message's own content; each part shows only when it applies. */
export function MessageHeader({ onJump }: { onJump: (messageId: string) => void }) {
  return (
    <>
      <MessageAuthorName />
      <ForwardedLabel />
      <ReplyReference onJump={onJump} />
      <MessageAddons onJump={onJump} />
    </>
  );
}
