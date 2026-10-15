import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appliesNow, carriedIndex, edgeToLoad, gallerySlides } from './gallery.ts';
import type { GallerySlide, ViewerMedia } from './types';

const media = (key: string) => ({ key }) as ViewerMedia;
const keys = (slides: GallerySlide[]) =>
  slides.map((slide) => (slide.kind === 'media' ? slide.media.key : `…${slide.edge}`));

test('the gallery waits at each end the history can still grow past', () => {
  const slides = gallerySlides([media('b'), media('c')], { older: true, newer: false });
  assert.deepEqual(keys(slides), ['…older', 'b', 'c']);
});

test('the viewer stays on the photo it shows when newer media arrive after it', () => {
  const before = gallerySlides([media('b'), media('c')], { older: false, newer: true });
  const after = gallerySlides([media('b'), media('c'), media('d')], { older: false, newer: false });

  assert.equal(carriedIndex(before, 1, after), 1);
  assert.equal(appliesNow(before, 1, after), true);
});

test('older media that would shift the current photo wait until the viewer reaches the edge', () => {
  const before = gallerySlides([media('c'), media('d')], { older: true, newer: false });
  const after = gallerySlides([media('a'), media('b'), media('c'), media('d')], {
    older: true,
    newer: false,
  });

  assert.equal(appliesNow(before, 2, after), false, 'looking at d, nothing moves');
  assert.equal(appliesNow(before, 0, after), true, 'waiting at the edge');
  assert.equal(carriedIndex(before, 0, after), 2, 'lands on b, just before c');
});

test('waiting at the newer edge lands on the first newer media', () => {
  const before = gallerySlides([media('a')], { older: false, newer: true });
  const after = gallerySlides([media('a'), media('b')], { older: false, newer: true });

  assert.equal(carriedIndex(before, 1, after), 1);
});

test('history loads ahead once the viewer comes within three slides of an edge', () => {
  const slides = gallerySlides(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(media), {
    older: true,
    newer: true,
  });

  assert.equal(edgeToLoad(slides, 3), 'older');
  assert.equal(edgeToLoad(slides, 5), null);
  assert.equal(edgeToLoad(slides, 6), 'newer');
});
