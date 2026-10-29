import { ContextReference } from './ContextReference';
import { ForwardedLabel } from './ForwardedLabel';
import { MessageAuthorName } from './MessageAuthorName';
import { ReplyReference } from './ReplyReference';

/** What sits above a message's own content; each part shows only when it applies. */
export function MessageHeader() {
  return (
    <>
      <MessageAuthorName />
      <ForwardedLabel />
      <ReplyReference />
      <ContextReference />
    </>
  );
}
