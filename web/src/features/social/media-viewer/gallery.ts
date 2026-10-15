import type { GallerySlide, HistoryEdge, HistoryEdges, ViewerMedia } from './types';

// Older or newer history starts loading this many slides before its edge, so the wait rarely shows.
const PREFETCH_DISTANCE = 3;

/** The media in order, with a waiting slide at each end the history can still grow past. */
export function gallerySlides(media: ViewerMedia[], more: HistoryEdges): GallerySlide[] {
  return [
    ...(more.older ? [{ kind: 'loading', edge: 'older' } as const] : []),
    ...media.map((entry) => ({ kind: 'media', media: entry }) as const),
    ...(more.newer ? [{ kind: 'loading', edge: 'newer' } as const] : []),
  ];
}

export function slideIndexOf(slides: GallerySlide[], key: string): number {
  return slides.findIndex((slide) => slide.kind === 'media' && slide.media.key === key);
}

/**
 * Where the viewer stands once its slides are rebuilt: on the same media, or, waiting at an edge,
 * on the first new one past it.
 */
export function carriedIndex(
  previous: GallerySlide[],
  previousIndex: number,
  next: GallerySlide[],
): number {
  const clamp = (index: number) => Math.min(Math.max(index, 0), next.length - 1);
  const current = previous[previousIndex];
  if (!current) return clamp(previousIndex);

  if (current.kind === 'media') {
    const index = slideIndexOf(next, current.media.key);
    return clamp(index >= 0 ? index : previousIndex);
  }

  const step = current.edge === 'older' ? 1 : -1;
  const neighbour = previous[previousIndex + step];
  if (neighbour?.kind !== 'media') return clamp(previousIndex);

  return clamp(slideIndexOf(next, neighbour.media.key) - step);
}

/**
 * New slides go in at once when the current one keeps its place; otherwise they wait until the
 * viewer reaches an edge, so nothing moves under someone looking at a photo.
 */
export function appliesNow(
  previous: GallerySlide[],
  previousIndex: number,
  next: GallerySlide[],
): boolean {
  const waitingAtEdge = previous[previousIndex]?.kind === 'loading';
  return waitingAtEdge || carriedIndex(previous, previousIndex, next) === previousIndex;
}

/** Which history to fetch ahead, once the viewer comes close to an edge. */
export function edgeToLoad(slides: GallerySlide[], index: number): HistoryEdge | null {
  const first = slides[0];
  const last = slides.at(-1);
  if (first?.kind === 'loading' && index <= PREFETCH_DISTANCE) return 'older';
  if (last?.kind === 'loading' && index >= slides.length - 1 - PREFETCH_DISTANCE) return 'newer';
  return null;
}
