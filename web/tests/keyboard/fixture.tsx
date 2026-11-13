import './fixture.css';

import { onNativeMessage } from '@ap-education/shell-sdk';
import { ThemeProvider } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { useKeyboardGlide } from '@/features/social/messaging/hooks/useKeyboardGlide';
import { keyboardGlidePart } from '@/features/social/messaging/keyboard-glide-part';

const useStyles = createStyles(({ css }) => ({
  composer: css`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
  `,
  history: css`
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 8px 8px 90px;
  `,
}));

window.ReactNativeWebView = { postMessage() {} };

function Conversation({ historyVersion }: { historyVersion: number }) {
  const surface = useRef<HTMLDivElement>(null);
  const glide = useKeyboardGlide(surface);
  const { styles, cx } = useStyles();
  return (
    <section ref={surface} className="conversation" {...glide}>
      <div
        key={historyVersion}
        className={cx(styles.history, keyboardGlidePart)}
        data-keyboard-glide-part
        role="log"
      >
        {Array.from({ length: 30 }, (_, index) => (
          <p key={index}>Повідомлення {index + 1}</p>
        ))}
      </div>
      <div
        className={cx(styles.composer, keyboardGlidePart)}
        data-keyboard-glide-part
        data-composer
      >
        <div
          role="textbox"
          aria-label="Повідомлення"
          contentEditable
          suppressContentEditableWarning
        />
      </div>
    </section>
  );
}

function Fixture() {
  const [conversation, setConversation] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  useEffect(() => {
    const root = document.documentElement;
    let committed = 0;
    let target = 0;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const commit = (inset: number) => {
      committed = inset;
      root.style.setProperty('--app-keyboard-inset', `${inset}px`);
    };
    const unsubscribe = onNativeMessage<{ type: string; inset: number; duration: number }>(
      (message) => {
        if (message.type !== 'keyboard/inset' || message.inset === target) return;

        target = message.inset;
        clearTimeout(pending);
        const rising = message.inset > committed && message.duration > 0;
        if (rising) pending = setTimeout(() => commit(message.inset), message.duration);
        else commit(message.inset);
      },
    );
    window.keyboardFixture = {
      send: (inset, duration = 250) => {
        window.ApAppNative?.onMessage?.({ type: 'keyboard/inset', inset, duration });
      },
      commit,
      remount: () => setConversation((value) => value + 1),
      remountHistory: () => setHistoryVersion((value) => value + 1),
    };
    return () => {
      clearTimeout(pending);
      unsubscribe();
    };
  }, []);
  return (
    <>
      <header>Тестовий чат</header>
      <main>
        <Conversation key={conversation} historyVersion={historyVersion} />
      </main>
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <Fixture />
  </ThemeProvider>,
);
