import PhotoSwipe, {
  type AugmentedEvent,
  type PhotoSwipeOptions,
  type SlideData,
} from 'photoswipe';
import photoswipeStyles from 'photoswipe/style.css?inline';

import type { Attachment } from '../messaging/attachments/types';
import type { MediaSize } from '../messaging/media/media-fit';
import { placeholderImage } from '../messaging/media/placeholder';
import type { ViewerMedia } from './types';

type Content = AugmentedEvent<'contentLoad'>['content'];

export type UrlVariant = 'thumbnail' | 'preview';

/** Signed addresses of a message's files: what the cache already holds, and a fetch for the rest. */
export interface MediaUrls {
  cached: (messageId: string, attachmentId: string, variant: UrlVariant) => string | undefined;
  fetch: (messageId: string, attachmentId: string, variant: UrlVariant) => Promise<string>;
}

/** A slide PhotoSwipe leaves to React to fill: a video. */
export interface MountedSlide {
  id: number;
  element: HTMLElement;
  media: ViewerMedia;
}

/** What React renders over the gallery. */
export interface GalleryView {
  current: ViewerMedia | undefined;
  mounted: MountedSlide[];
  zoomable: boolean;
  zoomedIn: boolean;
}

export interface MediaGalleryEvents {
  onClosed: () => void;
}

// Worse to better: a blurred stand-in, the 960 px thumbnail the bubble shows, the original.
const QUALITY = ['stand-in', 'thumbnail', 'preview'] as const;
type Quality = (typeof QUALITY)[number];

// An image with nothing to show yet: a transparent pixel, so PhotoSwipe lays the slide out.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

// Small clips and GIFs still fill a phone's viewing area.
const MIN_VIEWER_SIDE = 720;

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
  // Restore the logical media trigger, including engines where a tap does not focus buttons.
  returnFocus: false,
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
function ownerOf(key: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-media-key="${CSS.escape(key)}"]`);
}

function thumbnailOf(key: string): HTMLElement | null {
  const owner = ownerOf(key);
  return owner?.querySelector('img') ?? owner;
}

function storedSize({ width, height }: Attachment, unknown: MediaSize): MediaSize {
  return width && height ? { width, height } : unknown;
}

function enlarged({ width, height }: MediaSize): MediaSize {
  const scale = Math.max(1, MIN_VIEWER_SIDE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function decoded(url: string): Promise<void> {
  const image = new Image();
  image.referrerPolicy = 'no-referrer';
  image.src = url;
  await image.decode();
}

/**
 * PhotoSwipe paging through the media the chat has loaded, as they were when it opened: photos
 * zoom and sharpen to their originals, and videos are left to React.
 */
export class MediaGallery {
  private readonly pswp: PhotoSwipe;
  private readonly urls: MediaUrls;
  private readonly events: MediaGalleryEvents;
  private readonly slides: ViewerMedia[];
  private view: GalleryView = { current: undefined, mounted: [], zoomable: false, zoomedIn: false };
  private readonly listeners = new Set<() => void>();
  private readonly mounted = new Map<Content, MountedSlide>();
  private readonly returnFocus: HTMLElement | null;
  private mountedCount = 0;
  private closed = false;
  private closeRequested = false;
  private videoPadding = { top: 80, bottom: 80, left: 0, right: 0 };

  constructor(slides: ViewerMedia[], index: number, urls: MediaUrls, events: MediaGalleryEvents) {
    this.slides = slides;
    this.urls = urls;
    this.events = events;
    const owner = ownerOf(slides[index]!.key);
    this.returnFocus = owner?.matches('button, a[href]')
      ? owner
      : (owner?.querySelector<HTMLElement>('button, a[href]') ?? null);
    ensureStyles();
    this.pswp = new PhotoSwipe({
      ...OPTIONS,
      ...WITHOUT_SPINNER,
      index,
      paddingFn: (_viewport, data) =>
        (data.media as ViewerMedia).source.kind === 'video'
          ? this.videoPadding
          : { top: 0, bottom: 0, left: 0, right: 0 },
    });
    this.bind();
    this.pswp.init();
    this.element.setAttribute('aria-label', 'Перегляд медіа');
    this.element.setAttribute('role', 'dialog');
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

  close() {
    this.closeRequested = true;
    this.pswp.close();
  }

  /** Between the whole picture and a closer look, as a click on it does. */
  toggleZoom() {
    this.pswp.currSlide?.toggleZoom();
  }

  /** Native video controls stay between the measured bars, including captions and safe areas. */
  fitVideoBetweenBars(top: number, bottom: number) {
    if (this.closed) return;
    const padding = { top: Math.ceil(top) + 12, bottom: Math.ceil(bottom) + 12, left: 0, right: 0 };
    if (padding.top === this.videoPadding.top && padding.bottom === this.videoPadding.bottom)
      return;
    this.videoPadding = padding;
    this.pswp.updateSize(true);
  }

  /** Disposes the viewer when its conversation leaves, including an in-flight opening. */
  dispose() {
    if (this.closed) return;
    this.closed = true;
    this.pswp.destroy();
  }

  private bind() {
    const { pswp } = this;

    pswp.addFilter('numItems', () => this.slides.length);
    pswp.addFilter('itemData', (_, index) => this.slideData(this.slides[index]!));
    pswp.addFilter(
      'thumbEl',
      (_, data) => (data.key ? thumbnailOf(data.key) : null) as HTMLElement,
    );
    // Every photo starts from its blurred copy, not only the first one opened.
    pswp.addFilter('placeholderSrc', (_, content) => content.data.msrc ?? false);

    pswp.on('contentLoad', (event) => this.load(event));
    pswp.on('contentDestroy', ({ content }) => this.unmount(content));
    pswp.on('pointerDown', (event) => this.yieldToVideoControls(event));
    pswp.on('keydown', (event) => {
      const { target, key } = event.originalEvent;
      if (target instanceof HTMLVideoElement && key.startsWith('Arrow')) event.preventDefault();
    });
    pswp.on('openingAnimationEnd', () => {
      if (this.closed) {
        queueMicrotask(() => pswp.destroy());
        return;
      }
      pswp.updateSize(true);
      // A fast tap on Close must survive the opening transition.
      if (this.closeRequested) queueMicrotask(() => pswp.close());
    });
    pswp.on('change', () => this.settle());
    pswp.on('zoomPanUpdate', ({ slide }) => {
      if (slide === pswp.currSlide) this.publishZoom();
    });
    pswp.on('destroy', () => {
      if (this.closed) return;
      this.closed = true;
      this.events.onClosed();
      // A following action may have focused something else; leave that focus alone.
      queueMicrotask(() => {
        if (this.returnFocus?.isConnected && document.activeElement === document.body)
          this.returnFocus.focus({ preventScroll: true });
      });
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

  private slideData(media: ViewerMedia): SlideData {
    const { source } = media;
    const alt =
      source.kind === 'gif'
        ? source.block.title || 'GIF'
        : source.attachment.description || source.attachment.name;
    const base = { media, key: media.key, alt, thumbCropped: true };

    if (source.kind === 'gif') {
      const { url, placeholder } = source.block.media;
      const standIn = placeholder && placeholderImage(placeholder);
      return { ...base, ...enlarged(source.block.media), type: 'image', src: url, msrc: standIn };
    }

    const { attachment } = source;
    if (source.kind === 'video') {
      return { ...base, ...enlarged(storedSize(attachment, UNKNOWN_VIDEO)), type: 'video' };
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
      media: content.data.media as ViewerMedia,
    });
    this.publish({ mounted: [...this.mounted.values()] });
  }

  private unmount(content: Content) {
    if (!this.mounted.delete(content)) return;
    this.publish({ mounted: [...this.mounted.values()] });
  }

  /** Swaps a photo for a sharper copy once that has decoded, so it never blanks in between. */
  private async sharpen(content: Content, quality: Exclude<Quality, 'stand-in'>) {
    const media = content.data.media as ViewerMedia;
    if (media.source.kind !== 'image') return;

    const sharper = () => QUALITY.indexOf(quality) > QUALITY.indexOf(content.data.quality);
    if (!sharper()) return;

    const messageId = media.item.message.id;
    const attachmentId = media.source.attachment.id;
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

  /** After each move: report where the viewer stands and sharpen the photo it shows. */
  private settle() {
    const current = this.slides[this.pswp.currIndex];
    if (current !== this.view.current) this.publish({ current });
    this.publishZoom();

    const content = this.pswp.currSlide?.content;
    if (content) void this.sharpen(content, 'preview');
  }
}
