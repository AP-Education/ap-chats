import { ContextReference } from './ContextReference';
import { ForwardedLabel } from './ForwardedLabel';
import { MessageAuthorName } from './MessageAuthorName';
import { PrivateMessageLabel } from './PrivateMessageLabel';
import { ReplyReference } from './ReplyReference';

/** What sits above a message's own content; each part shows only when it applies. */
export function MessageHeader() {
  return (
    <>
      <MessageAuthorName />
      <PrivateMessageLabel />
      <ForwardedLabel />
      <ReplyReference />
      <ContextReference />
    </>
  );
}
