import { createContext, type PropsWithChildren, useContext, useState } from 'react';
import { createStore, type StoreApi } from 'zustand';
import { useStore } from 'zustand/react';

export type ComposerIntent = { kind: 'reply'; messageId: string; quoteText?: string } | null;

interface ConversationState {
  selectedIds: string[];
  intent: ComposerIntent;
  editingId: string | null;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  setIntent: (intent: ComposerIntent) => void;
  setEditingId: (id: string | null) => void;
}

const ConversationContext = createContext<StoreApi<ConversationState> | null>(null);

function createConversationStore() {
  return createStore<ConversationState>((set) => ({
    selectedIds: [],
    intent: null,
    editingId: null,
    toggleSelected: (id) =>
      set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((selected) => selected !== id)
          : [...state.selectedIds, id],
      })),
    clearSelection: () => set({ selectedIds: [] }),
    setIntent: (intent) => set({ intent, editingId: null }),
    setEditingId: (editingId) => set({ editingId, intent: null }),
  }));
}

export function ConversationProvider({ children }: PropsWithChildren) {
  const [store] = useState(createConversationStore);
  return <ConversationContext.Provider value={store}>{children}</ConversationContext.Provider>;
}

export function useConversation<T>(selector: (state: ConversationState) => T): T {
  const store = useContext(ConversationContext);
  if (!store) throw new Error('ConversationProvider is missing');
  return useStore(store, selector);
}
