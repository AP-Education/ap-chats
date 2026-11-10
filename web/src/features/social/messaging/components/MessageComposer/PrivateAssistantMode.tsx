import { useComposerEditorSlot, useComposerPart } from '@ap-education/timeline/composer';
import { LockSimpleIcon } from '@phosphor-icons/react';
import { Button } from 'antd';

import { useConversation } from '@/features/social/conversation-scope/store';

import type { ComposedMessage } from '../../types';
import styles from './MessageComposer.module.css';

interface PrivateAssistantModeProps {
  active: boolean;
  mention: string | null;
  onLeave: () => void;
}

export function PrivateAssistantMode({ active, mention, onLeave }: PrivateAssistantModeProps) {
  const { editorRef } = useComposerEditorSlot();
  const setIntent = useConversation((state) => state.setIntent);

  useComposerPart<ComposedMessage>({
    compose: (message) => {
      const namesAssistant = mention !== null && message.markdown.includes(mention);
      return active || namesAssistant ? { ...message, assistant: true } : message;
    },
  });

  if (!active) return null;

  function leaveAssistant() {
    const editor = typeof editorRef !== 'function' && editorRef?.current;
    if (editor && 'replaceDraft' in editor && typeof editor.replaceDraft === 'function') {
      const draft = editor.draft();
      const markdown = mention ? draft.markdown.replaceAll(mention, '').trim() : draft.markdown;
      editor.replaceDraft({ ...draft, markdown });
    } else if (editor) {
      editor.clear();
    }
    setIntent(null);
    onLeave();
  }

  return (
    <div className={styles.privateAssistant} role="status">
      <span>
        <LockSimpleIcon size={16} /> Приватно зі StarMe · Лише для вас
      </span>
      <Button size="small" type="text" onClick={leaveAssistant}>
        Повернутися до чату
      </Button>
    </div>
  );
}
