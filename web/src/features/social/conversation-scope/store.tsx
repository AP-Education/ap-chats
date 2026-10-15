import { createContext, type PropsWithChildren, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { useStore } from 'zustand/react';

import type { MemberSummary } from '@/features/workspaces/types';

import { type ConversationExtension, ConversationExtensionsContext } from './extensions';

export type ComposerIntent =
  | { kind: 'reply'; messageId: string; quoteText?: string }
  /** Asks a member, such as an assistant, about the picked messages: the message mentions them. */
  | { kind: 'ask'; member: MemberSummary; messageIds: string[] }
  | null;

interface ConversationState {
  selectedIds: string[];
  intent: ComposerIntent;
  editingId: string | null;
  /** Bumped by the timeline's closing swipe so the composer dismisses the on-screen keyboard;
   * a counter rather than a boolean since there's nothing to "unset". */
  blurComposerToken: number;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  setIntent: (intent: ComposerIntent) => void;
  setEditingId: (id: string | null) => void;
  requestComposerBlur: () => void;
}

const ConversationContext = createContext<StoreApi<ConversationState> | null>(null);

/** What the viewer may do here; the page that opens the conversation decides it once. */
export interface ConversationPermissions {
  canPost: boolean;
  /** Reading is enough to react, so a read-only channel still allows it. */
  canReact: boolean;
  canManage: boolean;
  /** Pin and unpin; already includes whatever posting the page requires for it. */
  canPin: boolean;
}

export interface ConversationScope {
  workspaceId: string;
  channelId: string;
  /** The channel name or DM participant's name: the one display title shared by the composer, the call header and the timeline's call card. */
  title: string;
  /** The DM participant's avatar; omitted for channels, which have no single person to show. */
  avatarPath?: string | null;
  composer: {
    ariaLabel: string;
    placeholder: string;
    autoFocus?: boolean;
    /** Offers @everyone and roles, which reach a group; only a channel has one. */
    groupMentions?: boolean;
  };
  permissions: ConversationPermissions;
}
const ConversationScopeContext = createContext<ConversationScope | null>(null);

function createConversationStore() {
  return createStore<ConversationState>((set) => ({
    selectedIds: [],
    intent: null,
    editingId: null,
    blurComposerToken: 0,
    toggleSelected: (id) =>
      set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((selected) => selected !== id)
          : [...state.selectedIds, id],
      })),
    clearSelection: () => set({ selectedIds: [] }),
    setIntent: (intent) => set({ intent, editingId: null }),
    setEditingId: (editingId) => set({ editingId, intent: null }),
    requestComposerBlur: () => set((state) => ({ blurComposerToken: state.blurComposerToken + 1 })),
  }));
}

const NO_EXTENSIONS: readonly ConversationExtension[] = [];

interface ConversationProviderProps {
  scope: ConversationScope;
  /** What features add to this conversation; keep the list stable across renders. */
  extensions?: readonly ConversationExtension[];
}

export function ConversationProvider({
  children,
  scope,
  extensions = NO_EXTENSIONS,
}: PropsWithChildren<ConversationProviderProps>) {
  const [store] = useState(createConversationStore);
  return (
    <ConversationScopeContext.Provider value={scope}>
      <ConversationExtensionsContext.Provider value={extensions}>
        <ConversationContext.Provider value={store}>{children}</ConversationContext.Provider>
      </ConversationExtensionsContext.Provider>
    </ConversationScopeContext.Provider>
  );
}

export function useConversationScope(): ConversationScope {
  const scope = useContext(ConversationScopeContext);
  if (!scope) throw new Error('ConversationProvider is missing');
  return scope;
}

export function useConversationPermissions(): ConversationPermissions {
  return useConversationScope().permissions;
}

export function useConversation<T>(selector: (state: ConversationState) => T): T {
  const store = useContext(ConversationContext);
  if (!store) throw new Error('ConversationProvider is missing');
  return useStore(store, selector);
}
