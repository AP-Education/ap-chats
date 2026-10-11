import { createContext, type ReactNode, useContext } from 'react';

import type { ComposerEditorSlotProps } from './types';

const MessageEditorSlotContext = createContext<ComposerEditorSlotProps | null>(null);

/**
 * How MessageComposer and MessageEditor hand their text-input wiring down to
 * whatever editor is composed as their child — ariaLabel/placeholder aside,
 * the editor reads everything else from here instead of taking it as props,
 * so using it is just `<MessageComposer>...<MentionEditor /></MessageComposer>`.
 */
export function MessageEditorSlotProvider({
  slot,
  children,
}: {
  slot: ComposerEditorSlotProps;
  children: ReactNode;
}) {
  return (
    <MessageEditorSlotContext.Provider value={slot}>{children}</MessageEditorSlotContext.Provider>
  );
}

export function useMessageEditorSlot(): ComposerEditorSlotProps {
  const slot = useContext(MessageEditorSlotContext);
  if (!slot) throw new Error('MessageEditorSlotProvider is missing');
  return slot;
}
