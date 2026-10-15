import { Modal, type ModalProps, Tabs } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

interface StyleProps {
  bodyHeight?: string;
}

// Three classes outrank antd's own `.ant-modal-root .ant-modal-centered .ant-modal`.
const useStyles = createStyles(({ token, css }, { bodyHeight }: StyleProps) => {
  const phone = `@media (max-width: ${token.screenMD}px)`;
  const insetTop = 'var(--app-inset-top, env(safe-area-inset-top, 0px))';
  const insetBottom = 'var(--app-inset-bottom, env(safe-area-inset-bottom, 0px))';

  return {
    // antd centers the dialog beside an inline spacer, which would push a full-height one down.
    wrapper: css`
      ${phone} {
        &&&::before {
          display: none;
        }
      }
    `,
    modal: css`
      ${phone} {
        &&& {
          top: 0;
          display: block;
          width: 100% !important;
          max-width: none;
          height: 100dvh;
          margin: 0;
          padding: 0;
        }
      }
    `,
    container: css`
      &&& {
        display: flex;
        flex-direction: column;
        padding: 0;
        overflow: hidden;
      }

      /* The native keyboard covers the page instead of resizing it, so the panel ends above it. */
      ${phone} {
        &&& {
          height: 100%;
          padding-bottom: max(var(--app-keyboard-inset, 0px), ${insetBottom});
          border-radius: 0;
          box-shadow: none;
        }
      }
    `,
    header: css`
      &&& {
        flex: none;
        margin: 0;
        padding: 18px 56px 16px 24px;
        border-bottom: 1px solid ${token.colorBorder};
      }

      ${phone} {
        &&& {
          padding: calc(12px + ${insetTop}) 56px 12px 16px;
        }
      }
    `,
    // The tabs' own underline rests on the header's lower edge.
    tabbed: css`
      &&&& {
        padding-bottom: 0;
      }
    `,
    close: css`
      &&& {
        top: 14px;
        inset-inline-end: 14px;
        width: 32px;
        height: 32px;
      }

      ${phone} {
        &&& {
          top: calc(4px + ${insetTop});
          inset-inline-end: 8px;
          width: 40px;
          height: 40px;
        }
      }
    `,
    body: css`
      &&& {
        padding: 20px 24px;
        overflow-y: auto;
        ${bodyHeight ? `height: ${bodyHeight};` : 'max-height: min(640px, calc(100dvh - 240px));'}
      }

      ${phone} {
        &&& {
          flex: 1;
          height: auto;
          min-height: 0;
          padding: 16px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
      }
    `,
    footer: css`
      &&& {
        flex: none;
        margin: 0;
        padding: 12px 24px;
        border-top: 1px solid ${token.colorBorder};
      }

      ${phone} {
        &&& {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
        }

        & .ant-btn {
          flex: 1;
          min-height: 44px;
          margin-inline-start: 0;
        }
      }
    `,
    description: css`
      display: block;
      margin-top: 2px;
      color: ${token.colorTextSecondary};
      font-size: ${token.fontSize}px;
      font-weight: 400;
    `,
    tabs: css`
      margin-top: 10px;
      font-weight: 400;

      & .ant-tabs-nav {
        margin: 0;
      }

      & .ant-tabs-nav::before,
      & .ant-tabs-content-holder {
        display: none;
      }
    `,
  };
});

interface HeaderTabs<Key extends string> {
  items: { key: Key; label: string }[];
  activeKey: Key;
  onChange: (key: Key) => void;
}

interface AdaptiveModalProps<Key extends string> extends Omit<
  ModalProps,
  'className' | 'classNames'
> {
  /** A line under the title, kept in the header with it. */
  description?: ReactNode;
  /** Sections switched from the header; the body shows the active one. */
  tabs?: HeaderTabs<Key>;
  /** Keeps a wide screen's dialog one height as its content changes; the body scrolls inside. */
  bodyHeight?: string;
}

/** A dialog on a wide screen; on a phone, the whole screen with its header pinned on top. */
export function AdaptiveModal<Key extends string = string>({
  title,
  description,
  tabs,
  bodyHeight,
  ...rest
}: AdaptiveModalProps<Key>) {
  const { styles, cx } = useStyles({ bodyHeight });

  return (
    <Modal
      className={styles.modal}
      classNames={{
        wrapper: styles.wrapper,
        container: styles.container,
        header: cx(styles.header, Boolean(tabs) && styles.tabbed),
        close: styles.close,
        body: styles.body,
        footer: styles.footer,
      }}
      title={
        <>
          {title}
          {description && <span className={styles.description}>{description}</span>}
          {tabs && (
            <Tabs
              className={styles.tabs}
              activeKey={tabs.activeKey}
              onChange={(key) => tabs.onChange(key as Key)}
              items={tabs.items}
            />
          )}
        </>
      }
      {...rest}
    />
  );
}
