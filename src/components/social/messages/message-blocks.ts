import type { MessageGif } from '../content/message-gif';
import type { MessageModel } from './types/message.types';

/** One kind of thing a message shows besides its text and files, told apart by `type`. */
export type MessageBlock = { type: 'gif' } & MessageGif;

/** Gathered from wherever each kind is kept, so the API reads one list whatever the storage. */
export function messageBlocks({ gif }: Pick<MessageModel, 'gif'>): MessageBlock[] {
  return gif ? [{ type: 'gif', ...gif }] : [];
}
