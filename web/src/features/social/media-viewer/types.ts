import type { ActionContext, ActionTarget, ConversationAction } from '../messaging/types';

/** What the viewer can do to the message a media came in, as its row in the chat can. */
export interface ViewerActions {
  actions: ConversationAction[];
  context: ActionContext;
  run: (action: ConversationAction, target: ActionTarget) => void;
}
