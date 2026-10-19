import type { Translation } from '../../translation';
import type { navigation as source } from '../uk/navigation';

export const navigation = {
  loadingChats: 'Loading chats',
  loadingPage: 'Loading page',
  openConversations: 'Open conversations',
  openConversationsUnread: 'Open conversations, {{count}} unread',
  manageRoles: 'Manage roles',
  manageCategories: 'Manage categories',
  home: 'Home',
  noConversations: 'No conversations yet',
  placeholders: {
    notFound: {
      title: 'Page not found',
      description: 'Check the page address',
    },
  },
} satisfies Translation<typeof source>;
