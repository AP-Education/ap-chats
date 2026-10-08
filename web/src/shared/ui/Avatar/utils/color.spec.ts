import assert from 'node:assert/strict';
import { test } from 'node:test';

import { theme } from 'antd';

import { contrast, mix } from '../../../theme/color.ts';
import { AVATAR_PRESETS, NAME_SHADE } from './color.ts';

// Incoming bubbles as they composite over the wallpaper in each theme.
const INCOMING_BUBBLE = { light: '#f6f9f9', dark: '#2c373b' };
const ALGORITHMS = { light: theme.defaultAlgorithm, dark: theme.darkAlgorithm } as const;

for (const appearance of ['light', 'dark'] as const) {
  const token = theme.getDesignToken({ algorithm: ALGORITHMS[appearance] }) as unknown as Record<
    string,
    string
  >;

  test(`${appearance}: initials read on the tile they sit centred on`, () => {
    for (const preset of AVATAR_PRESETS) {
      const tile = mix(token[`${preset}1`]!, token[`${preset}2`]!, 0.5);
      const ratio = contrast(token[`${preset}8`]!, tile);
      assert.ok(ratio >= 4.5, `${preset}: ${ratio.toFixed(2)}`);
    }
  });

  test(`${appearance}: author names read on incoming bubbles`, () => {
    for (const preset of AVATAR_PRESETS) {
      const ratio = contrast(
        token[`${preset}${NAME_SHADE[appearance]}`]!,
        INCOMING_BUBBLE[appearance],
      );
      assert.ok(ratio >= 4.5, `${preset}: ${ratio.toFixed(2)}`);
    }
  });
}
