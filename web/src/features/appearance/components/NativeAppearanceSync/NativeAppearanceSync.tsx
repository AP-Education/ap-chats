import { theme } from 'antd';
import { useEffect } from 'react';

import { postToNative } from '@/shared/lib/nativeBridge';

import { useAppearance } from '../../hooks/useAppearance';
import type { ShellPalette } from '../../types';

/** Hands the resolved theme to the native shell, so the status bar, the area around the
 * page and its native panels follow the person's theme and accent. */
export function NativeAppearanceSync() {
  const appearance = useAppearance();
  const { token } = theme.useToken();
  const { colorBgContainer, colorPrimary, colorPrimaryBg, colorText, colorTextSecondary } = token;

  useEffect(() => {
    const payload: ShellPalette = {
      appearance,
      surface: colorBgContainer,
      primary: colorPrimary,
      primaryBg: colorPrimaryBg,
      text: colorText,
      textSecondary: colorTextSecondary,
    };
    postToNative({ type: 'appearance/changed', payload });
  }, [appearance, colorBgContainer, colorPrimary, colorPrimaryBg, colorText, colorTextSecondary]);

  return null;
}
