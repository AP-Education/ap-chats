import { PaperclipIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { createPortal } from 'react-dom';

const useStyles = createStyles(({ token, css }) => ({
  overlay: css`
    position: absolute;
    inset: 8px;
    z-index: 30;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border: 2px dashed ${token.colorPrimary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};
    font-weight: 600;
    pointer-events: none;
  `,
}));

export function useAttachmentDrop(onFiles: (files: File[]) => void) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const receive = useEffectEvent(onFiles);
  const bindTarget = useCallback((node: HTMLDivElement | null) => {
    setTarget(node?.closest<HTMLElement>('[data-conversation-drop-target]') ?? node);
  }, []);

  useEffect(() => {
    if (!target) return;
    let depth = 0;
    const isFile = (event: DragEvent) => event.dataTransfer?.types.includes('Files');
    const enter = (event: DragEvent) => {
      if (!isFile(event)) return;
      event.preventDefault();
      depth++;
      setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!isFile(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const leave = (event: DragEvent) => {
      if (!isFile(event)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const reset = () => {
      depth = 0;
      setDragging(false);
    };
    const drop = (event: DragEvent) => {
      if (!isFile(event)) return;
      event.preventDefault();
      reset();
      receive(Array.from(event.dataTransfer?.files ?? []));
    };
    target.addEventListener('dragenter', enter);
    target.addEventListener('dragover', over);
    target.addEventListener('dragleave', leave);
    target.addEventListener('drop', drop);
    window.addEventListener('dragend', reset);
    window.addEventListener('blur', reset);
    return () => {
      target.removeEventListener('dragenter', enter);
      target.removeEventListener('dragover', over);
      target.removeEventListener('dragleave', leave);
      target.removeEventListener('drop', drop);
      window.removeEventListener('dragend', reset);
      window.removeEventListener('blur', reset);
    };
  }, [target]);

  return {
    bindTarget,
    overlay: dragging && target ? createPortal(<AttachmentDropZone />, target) : null,
  };
}

function AttachmentDropZone() {
  const { styles } = useStyles();
  return (
    <div className={styles.overlay}>
      <PaperclipIcon size={36} aria-hidden />
      <span>Перетягніть файли, щоб додати до повідомлення</span>
    </div>
  );
}
