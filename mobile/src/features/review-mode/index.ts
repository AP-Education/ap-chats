import { parseAccountIds } from './utils/chats-only';

/** Store reviewers' accounts: they see Chats and the profile only. */
export const CHATS_ONLY_ACCOUNT_IDS = parseAccountIds(process.env.EXPO_PUBLIC_REVIEW_ACCOUNT_IDS);

export {
  chatsHomeUrl,
  chatsOnlyTabs,
  hideAccountBlockScript,
  isChatsOnlyAccount,
  isChatsPage,
} from './utils/chats-only';
