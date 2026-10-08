import assert from 'node:assert/strict';
import { test } from 'node:test';

import { contrast } from '../../shared/theme/color.ts';
import { accentColors, accentPresets } from './accents.ts';

test('every accent keeps selected text readable on its tint in both themes', () => {
  for (const accent of accentPresets) {
    for (const appearance of ['light', 'dark'] as const) {
      const colors = accentColors(accent, appearance);
      const ratio = contrast(colors.primaryTextActive, colors.primaryBg);
      assert.ok(ratio >= 4.5, `${accent.id} ${appearance}: ${ratio.toFixed(2)}`);
    }
  }
});

test('primary buttons keep their white text readable in both themes', () => {
  for (const accent of accentPresets) {
    for (const appearance of ['light', 'dark'] as const) {
      const ratio = contrast('#ffffff', accent.primary[appearance]);
      assert.ok(ratio >= 3.5, `${accent.id} ${appearance}: ${ratio.toFixed(2)}`);
    }
  }
});

test('own bubbles keep white text readable for every accent', () => {
  for (const accent of accentPresets) {
    for (const tone of accent.bubble) {
      const ratio = contrast('#ffffff', tone);
      assert.ok(ratio >= 4.5, `${accent.id} ${tone}: ${ratio.toFixed(2)}`);
    }
  }
});
