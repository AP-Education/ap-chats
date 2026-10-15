import PhotoSwipe, {
  type AugmentedEvent,
  type PhotoSwipeOptions,
  type SlideData,
} from 'photoswipe';
import photoswipeStyles from 'photoswipe/style.css?inline';

import type { Attachment } from '../messaging/attachments/types';
import type { MediaSize } from '../messaging/media/media-fit';
import { placeholderImage } from '../messaging/media/placeholder';
import { appliesNow, carriedIndex, edgeToLoad } from './gallery';
import type { GallerySlide, HistoryEdge } from './types';

type Content = AugmentedEvent<'contentLoad'>['content'];

export type UrlVariant = 'thumbnail' | 'preview';

/** Signed addresses of a message's files: what the cache already holds, and a fetch for the rest. */
export interface MediaUrls {
  cached: (messageId: string, attachmentId: string, variant: UrlVariant) => string | undefined;
  fetch: (messageId: string, attachmentId: string, variant: UrlVariant) => Promise<string>;
}

/** A slide PhotoSwipe leaves to React to fill: a video, or the wait at an edge. */
export interface MountedSlide {
  id: number;
  element: HTMLElement;
  slide: GallerySlide;
}

/** What React renders over the gallery. */
export interface GalleryView {
  current: GallerySlide | undefined;
  mounted: MountedSlide[];
  zoomable: boolean;
  zoomedIn: boolean;
}

export interface MediaGalleryEvents {
  onNearEdge: (edge: HistoryEdge) => void;
  onClosed: () => void;
}

// Worse to better: a blurred stand-in, the 960 px thumbnail the bubble shows, the original.
const QUALITY = ['stand-in', 'thumbnail', 'preview'] as const;
type Quality = (typeof QUALITY)[number];

// An image with nothing to show yet: a transparent pixel, so PhotoSwipe lays the slide out.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

// GIFs are small; like Telegram, the viewer scales one up until its longer side is this long.
const GIF_SIDE = 720;

// Files stored before their size was known get common proportions; the picture stays whole
// inside them.
const UNKNOWN_PHOTO: MediaSize = { width: 1600, height: 1200 };
const UNKNOWN_VIDEO: MediaSize = { width: 1280, height: 720 };

// The browser's own video controls run along the bottom of the video; drags there are theirs.
const VIDEO_CONTROLS_HEIGHT = 72;

const STYLES_ID = 'media-viewer-photoswipe';

const OPTIONS: PhotoSwipeOptions = {
  bgOpacity: 0.94,
  showHideAnimationType: 'zoom',
  wheelToZoom: true,
  // Past the picture's own pixels, as Telegram and Discord allow; a small photo or GIF that
  // already fits would not zoom at all otherwise.
  secondaryZoomLevel: ({ fit }) => Math.max(fit * 2, Math.min(1, fit * 3)),
  maxZoomLevel: ({ fit }) => Math.max(fit * 4, 2),
  // The viewer's own bars replace PhotoSwipe's buttons and counter.
  arrowPrev: false,
  arrowNext: false,
  close: false,
  zoom: false,
  counter: false,
  errorMsg: 'Не вдалося відкрити зображення',
};

// Not in PhotoSwipe's option types, though its UI reads it like the buttons above.
const WITHOUT_SPINNER = { preloader: false } as PhotoSwipeOptions;

// PhotoSwipe measures its layout as it opens, so its CSS has to be in place before; this app
// ships no stylesheets of its own to carry it.
function ensureStyles() {
  if (document.getElementById(STYLES_ID)) return;

  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = `${photoswipeStyles}\n.pswp__img { object-fit: contain; }`;
  document.head.append(style);
}

/** Where the bubble shows the media: the photo itself, not a frame that can be wider than it. */
function thumbnailOf(key: string): HTMLElement | null {
  const owner = document.querySelector<HTMLElement>(`[data-media-key="${CSS.escape(key)}"]`);
  return owner?.querySelector('img') ?? owner;
}

function storedSize({ width, height }: Attachment, unknown: MediaSize): MediaSize {
  return width && height ? { width, height } : unknown;
}

function enlarged({ width, height }: MediaSize): MediaSize {
  const scale = Math.max(1, GIF_SIDE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function decoded(url: string): Promise<void> {
  const image = new Image();
  image.referrerPolicy = 'no-referrer';
  image.src = url;
  await image.decode();
}

const slideKey = (slide: GallerySlide | undefined) =>
  slide?.kind === 'media' ? slide.media.key : slide?.edge;

/**
 * PhotoSwipe paging through a conversation's media: photos zoom and sharpen to their originals,
 * videos and the waits at the edges are left to React, and newly loaded history slots in without
 * moving what is on screen.
 */
export class MediaGallery {
  private readonly pswp: PhotoSwipe;
  private readonly urls: MediaUrls;
  private readonly events: MediaGalleryEvents;
  private slides: GallerySlide[];
  private waiting: GallerySlide[] | null = null;
  private view: GalleryView = { current: undefined, mounted: [], zoomable: false, zoomedIn: false };
  private readonly listeners = new Set<() => void>();
  private readonly mounted = new Map<Content, MountedSlide>();
  private mountedCount = 0;
  private closed = false;

  constructor(slides: GallerySlide[], index: number, urls: MediaUrls, events: MediaGalleryEvents) {
    this.slides = slides;
    this.urls = urls;
    this.events = events;
    ensureStyles();
    this.pswp = new PhotoSwipe({ ...OPTIONS, ...WITHOUT_SPINNER, index });
    this.bind();
    this.pswp.init();
    this.element.setAttribute('aria-label', 'Перегляд медіа');
    this.element.setAttribute('aria-modal', 'true');
  }

  /** The viewer's root, where React places its bars. */
  get element(): HTMLElement {
    return this.pswp.element!;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getView = () => this.view;

  update(next: GallerySlide[]) {
    const index = this.pswp.currIndex;
    if (!appliesNow(this.slides, index, next)) {
      this.waiting = next;
      return;
    }

    this.waiting = null;
    this.apply(next, carriedIndex(this.slides, index, next));
  }

  close() {
    this.pswp.close();
  }

  /** Between the whole picture and a closer look, as a click on it does. */
  toggleZoom() {
    this.pswp.currSlide?.toggleZoom();
  }

  /** Gone at once, without the closing animation: the conversation is leaving. */
  dispose() {
    if (this.closed) return;
    this.closed = true;
    this.pswp.destroy();
  }

  private bind() {
    const { pswp } = this;

    pswp.addFilter('numItems', () => this.slides.length);
    pswp.addFilter('itemData', (_, index) => this.slideData(this.slides[index]));
    pswp.addFilter(
      'thumbEl',
      (_, data) => (data.key ? thumbnailOf(data.key) : null) as HTMLElement,
    );
    // Every photo starts from its blurred copy, not only the first one opened.
    pswp.addFilter('placeholderSrc', (_, content) => content.data.msrc ?? false);

    pswp.on('contentLoad', (event) => this.load(event));
    pswp.on('contentDestroy', ({ content }) => this.unmount(content));
    pswp.on('pointerDown', (event) => this.yieldToVideoControls(event));
    pswp.on('change', () => this.settle());
    pswp.on('zoomPanUpdate', ({ slide }) => {
      if (slide === pswp.currSlide) this.publishZoom();
    });
    pswp.on('destroy', () => {
      if (this.closed) return;
      this.closed = true;
      this.events.onClosed();
    });
  }

  private publish(patch: Partial<GalleryView>) {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private publishZoom() {
    const slide = this.pswp.currSlide;
    const zoomable = Boolean(slide?.isZoomable());
    const zoomedIn = Boolean(slide && slide.currZoomLevel > slide.zoomLevels.initial);
    if (zoomable === this.view.zoomable && zoomedIn === this.view.zoomedIn) return;

    this.publish({ zoomable, zoomedIn });
  }

  private slideData(slide: GallerySlide | undefined): SlideData {
    if (slide?.kind !== 'media') return { type: 'loading', slide };

    const { media } = slide;
    const { source } = media;
    const alt =
      source.kind === 'gif'
        ? source.block.title || 'GIF'
        : source.attachment.description || source.attachment.name;
    const base = { slide, key: media.key, alt, thumbCropped: true };

    if (source.kind === 'gif') {
      const { url, placeholder } = source.block.media;
      const standIn = placeholder && placeholderImage(placeholder);
      return { ...base, ...enlarged(source.block.media), type: 'image', src: url, msrc: standIn };
    }

    const { attachment } = source;
    if (source.kind === 'video') {
      return { ...base, ...storedSize(attachment, UNKNOWN_VIDEO), type: 'video' };
    }

    const messageId = media.item.message.id;
    const original = this.urls.cached(messageId, attachment.id, 'preview');
    const thumbnail = this.urls.cached(messageId, attachment.id, 'thumbnail');
    const standIn = attachment.placeholder && placeholderImage(attachment.placeholder);
    const quality: Quality = original ? 'preview' : thumbnail ? 'thumbnail' : 'stand-in';

    return {
      ...base,
      ...storedSize(attachment, UNKNOWN_PHOTO),
      type: 'image',
      src: original ?? thumbnail ?? standIn ?? BLANK,
      msrc: thumbnail ?? standIn,
      quality,
    };
  }

  private load(event: AugmentedEvent<'contentLoad'>) {
    const { content } = event;

    if (content.type === 'image') {
      if (content.data.quality === 'stand-in') void this.sharpen(content, 'thumbnail');
      return;
    }

    event.preventDefault();
    if (this.mounted.has(content)) return;

    const element = document.createElement('div');
    element.className = 'pswp__content';
    content.element = element;

    this.mountedCount += 1;
    this.mounted.set(content, {
      id: this.mountedCount,
      element,
      slide: content.data.slide as GallerySlide,
    });
    this.publish({ mounted: [...this.mounted.values()] });
  }

  private unmount(content: Content) {
    if (!this.mounted.delete(content)) return;
    this.publish({ mounted: [...this.mounted.values()] });
  }

  /** Swaps a photo for a sharper copy once that has decoded, so it never blanks in between. */
  private async sharpen(content: Content, quality: Exclude<Quality, 'stand-in'>) {
    const slide = content.data.slide as GallerySlide | undefined;
    if (slide?.kind !== 'media' || slide.media.source.kind !== 'image') return;

    const sharper = () => QUALITY.indexOf(quality) > QUALITY.indexOf(content.data.quality);
    if (!sharper()) return;

    const messageId = slide.media.item.message.id;
    const attachmentId = slide.media.source.attachment.id;
    let url: string;
    try {
      url = await this.urls.fetch(messageId, attachmentId, quality);
      await decoded(url);
    } catch {
      // Without a thumbnail there is nothing to look at; an original that fails to decode
      // (HEIC, say) leaves the thumbnail.
      if (content.data.quality === 'stand-in' && content.element) content.onError();
      return;
    }

    const image = content.element;
    if (!(image instanceof HTMLImageElement) || !sharper()) return;

    content.data.src = url;
    content.data.quality = quality;
    image.src = url;
  }

  private yieldToVideoControls(event: AugmentedEvent<'pointerDown'>) {
    const { target, clientY } = event.originalEvent;
    const video = target instanceof Element ? target.closest('video') : null;
    if (!video) return;

    const controlsTop = video.getBoundingClientRect().bottom - VIDEO_CONTROLS_HEIGHT;
    if (clientY > controlsTop) event.preventDefault();
  }

  /** After each move: take in history that was waiting, then report where the viewer stands. */
  private settle() {
    const index = this.pswp.currIndex;
    if (this.waiting && appliesNow(this.slides, index, this.waiting)) {
      this.update(this.waiting);
      return;
    }

    const current = this.slides[index];
    if (current !== this.view.current) this.publish({ current });
    this.publishZoom();

    const edge = edgeToLoad(this.slides, index);
    if (edge) this.events.onNearEdge(edge);

    const content = this.pswp.currSlide?.content;
    if (content) void this.sharpen(content, 'preview');
  }

  private apply(next: GallerySlide[], index: number) {
    const previous = this.slides;
    this.slides = next;

    if (index === this.pswp.currIndex) this.refreshChanged(previous);
    else this.rebase(index);

    this.settle();
  }

  /** Same place, different neighbours: only the slides whose media changed are rebuilt. */
  private refreshChanged(previous: GallerySlide[]) {
    const { pswp } = this;
    const length = Math.max(previous.length, this.slides.length);
    const holders = new Set([pswp.currIndex - 1, pswp.currIndex, pswp.currIndex + 1]);

    for (let index = 0; index < length; index += 1) {
      if (slideKey(previous[index]) === slideKey(this.slides[index])) continue;

      pswp.contentLoader.getContentByIndex(index)?.destroy();
      if (holders.has(index)) pswp.refreshSlideContent(index);
      else pswp.contentLoader.removeByIndex(index);
    }
  }

  /**
   * Older media went in before the current slide, so every index moved. PhotoSwipe cannot page
   * below 0, so it starts over at the new index with nothing cached; this only happens on a wait
   * slide, where there is nothing to lose.
   */
  private rebase(index: number) {
    const { pswp } = this;
    const holders = pswp.mainScroll.itemHolders;

    holders.forEach((holder) => {
      holder.slide?.destroy();
      holder.slide = undefined;
    });
    pswp.contentLoader.destroy();

    pswp.currIndex = index;
    pswp.potentialIndex = index;
    holders.forEach((holder, position) => pswp.setContent(holder, index - 1 + position));

    pswp.currSlide = holders[1]?.slide;
    pswp.currSlide?.setIsActive(true);
    pswp.contentLoader.updateLazy();
    pswp.dispatch('change');
  }
}
