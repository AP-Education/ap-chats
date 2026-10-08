import { ConfigProvider } from 'antd';
import type { PropsWithChildren } from 'react';

import { useIsMobile } from '@/shared/hooks/useIsMobile';

import { accentColors } from '../../accents';
import { useAccent } from '../../stores/appearance-store';
import { appearanceTheme } from '../../theme';
import type { Appearance } from '../../types';

interface AppearanceScopeProps extends PropsWithChildren {
  appearance: Appearance;
}

/** Pins a subtree to one appearance whatever the person picked, keeping their accent. */
export function AppearanceScope({ appearance, children }: AppearanceScopeProps) {
  const isMobile = useIsMobile();
  const accent = accentColors(useAccent(), appearance);

  return (
    <ConfigProvider theme={appearanceTheme(appearance, accent, isMobile)}>
      {children}
    </ConfigProvider>
  );
}
