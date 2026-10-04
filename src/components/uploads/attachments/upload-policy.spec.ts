import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BadRequestException } from '@nestjs/common';

import { identifyMedia } from './attachment-preview.service';
import { MULTIPART_PART_BYTES } from './types';
import { normalizeFilename, partSize, validateParts } from './upload-policy';

test('1 GB is exactly 60 bounded parts with a smaller final part', () => {
  const size = 1_000_000_000;
  const parts = Array.from({ length: 60 }, (_, index) => ({
    number: index + 1,
    size: partSize(size, index + 1),
    etag: `part-${index}`,
  }));
  validateParts(size, parts);
  assert.equal(
    parts.reduce((sum, part) => sum + part.size, 0),
    size,
  );
  assert.equal(parts[0]?.size, MULTIPART_PART_BYTES);
  assert.equal(parts.at(-1)?.size, 10_144_256);
  assert.throws(() => partSize(size, 61), BadRequestException);
});

test('rejects incomplete, reordered, duplicate and oversized storage parts', () => {
  const size = MULTIPART_PART_BYTES + 8;
  const parts = [
    { number: 1, size: MULTIPART_PART_BYTES, etag: 'a' },
    { number: 2, size: 8, etag: 'b' },
  ];
  validateParts(size, parts);
  for (const invalid of [
    parts.slice(0, 1),
    parts.toReversed(),
    [parts[0]!, parts[0]!],
    [parts[0]!, { ...parts[1]!, size: 9 }],
  ])
    assert.throws(() => validateParts(size, invalid), BadRequestException);
});

test('filenames cannot contain paths, controls or bidirectional overrides', () => {
  assert.equal(normalizeFilename('../../plan.pdf'), 'plan.pdf');
  assert.equal(normalizeFilename('C:\\files\\кошторис.xlsx'), 'кошторис.xlsx');
  assert.equal(normalizeFilename('photo\u202egnp.exe\u0000'), 'photognp.exe');
  for (const invalid of ['', '.', '..', 'я'.repeat(128)])
    assert.throws(() => normalizeFilename(invalid), BadRequestException);
});

test('text and markup without a real binary signature stay unidentified and unpreviewable', async () => {
  for (const source of ['<svg onload="alert(1)"></svg>', '<html>hello</html>', 'not an image'])
    assert.deepEqual(await identifyMedia(Buffer.from(source)), {
      mediaType: 'application/octet-stream',
      preview: null,
    });
});

test('a real but non-media signature is identified without becoming previewable', async () => {
  const pdf = await identifyMedia(Buffer.from('%PDF-1.7'));
  assert.equal(pdf.mediaType, 'application/pdf');
  assert.equal(pdf.preview, null);
});

test('image signatures resolve to a previewable mediaType', async () => {
  assert.equal((await identifyMedia(Buffer.from([255, 216, 255, 0]))).mediaType, 'image/jpeg');
});
