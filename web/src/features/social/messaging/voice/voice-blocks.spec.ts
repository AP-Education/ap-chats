import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Attachment } from '../attachments/types';
import { voiceBlocks } from './voice-blocks';

test('verified voice metadata projects a voice block while ordinary audio remains a file', () => {
  const voice: Attachment = {
    id: 'stored',
    name: 'recording.m4a',
    size: 100,
    preview: 'audio',
    mediaType: 'audio/mp4',
    width: null,
    height: null,
    description: null,
    voice: { durationMs: 3100 },
  };
  const files = [
    voice,
    { ...voice, id: 'music', voice: undefined },
    { ...voice, id: 'video', preview: 'video' as const },
  ];

  assert.deepEqual(voiceBlocks(files), [
    { type: 'voice', attachmentId: 'stored', durationMs: 3100 },
  ]);
  assert.equal(files[0], voice);
  assert.deepEqual(voiceBlocks([]), []);
});
