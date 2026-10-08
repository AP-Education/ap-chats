import { ConfigProvider } from 'antd';
import ukUA from 'antd/locale/uk_UA';
import { createStyles } from 'antd-style';
import { type PropsWithChildren, useLayoutEffect } from 'react';

import { accentColors } from '../../features/appearance/accents';
import { useAppearance } from '../../features/appearance/hooks/useAppearance';
import { useAccent } from '../../features/appearance/stores/appearance-store';
import { appearanceTheme } from '../../features/appearance/theme';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

// Floating surfaces are frosted like the rest of the chat chrome: antd's own colour
// variables resolve inside the portal, so the same rule fits both themes.
const GLASS = `
  background: color-mix(in srgb, var(--ant-color-bg-elevated) 78%, transparent);
  backdrop-filter: blur(24px) saturate(1.6);
`;

const useGlassStyles = createStyles(({ css }) => ({
  // antd shadows the popover with a drop-shadow filter, which isolates the backdrop
  // from the page, so the shadow moves onto the frosted container instead.
  popoverRoot: css`
    && {
      filter: none;
    }
  `,
  popover: css`
    && {
      ${GLASS}
      box-shadow: var(--ant-box-shadow-secondary);
    }
  `,
  dropdown: css`
    & .ant-dropdown-menu {
      ${GLASS}
    }
  `,
}));

export function ThemeProvider({ children }: PropsWithChildren) {
  const isMobile = useIsMobile();
  const appearance = useAppearance();
  const accent = accentColors(useAccent(), appearance);
  const [bubbleFrom, bubbleTo] = accent.bubble;
  const { styles: glass } = useGlassStyles();

  // Native controls, scrollbars and the few CSS-only overrides follow the same choice;
  // own chat bubbles read the accent from here, wherever they are rendered.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', appearance);
    root.style.setProperty('--chat-own-from', bubbleFrom);
    root.style.setProperty('--chat-own-to', bubbleTo);
  }, [appearance, bubbleFrom, bubbleTo]);

  return (
    <ConfigProvider
      theme={appearanceTheme(appearance, accent, isMobile)}
      locale={ukUA}
      popover={{ arrow: false, classNames: { root: glass.popoverRoot, container: glass.popover } }}
      dropdown={{ classNames: { root: glass.dropdown } }}
    >
      {children}
    </ConfigProvider>
  );
}
