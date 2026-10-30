import assert from 'node:assert/strict';
import { test } from 'node:test';

import { inspectVoice, MAX_VOICE_BYTES } from './voice-inspection';

function wav(seconds: number) {
  const data = Buffer.alloc(Math.round(seconds * 8000) * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(16000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

test('voice metadata is derived from actual audio packets without a client duration or MIME', async () => {
  const result = await inspectVoice(wav(1.25));
  assert.equal(result.preview, 'audio');
  assert.equal(result.mediaType, 'audio/wav');
  assert.equal(result.voice.durationMs, 1250);
});

test('voice inspection rejects renamed documents, malformed data and empty files', async () => {
  for (const bytes of [
    Buffer.alloc(0),
    Buffer.from('%PDF-1.7 fake voice.m4a'),
    Buffer.from('RIFF0000WAVE'),
  ])
    await assert.rejects(inspectVoice(bytes), /voice recording/i);
});

test('voice duration and byte limits are enforced using stored content', async () => {
  await assert.rejects(inspectVoice(wav(0.2)), /voice recording/i);
  await assert.rejects(inspectVoice(wav(602)), /voice recording/i);
  await assert.rejects(inspectVoice(Buffer.alloc(MAX_VOICE_BYTES + 1)), /too large/);
  assert.equal((await inspectVoice(wav(0.5))).voice.durationMs, 500);
});
