interface Motion {
  until: number;
  easing: string;
}

interface KeyboardInset {
  inset: number;
  duration: number;
  easing?: string;
}

const DEFAULT_EASING = 'cubic-bezier(0.38, 0.7, 0.125, 1)';
const PART = '[data-keyboard-glide-part]';

/** Keeps the lower chat parts on the keyboard while the shell commits its final layout. */
export class KeyboardMotion {
  private inset = 0;
  private received = false;
  private surface: HTMLElement;
  private bottom: number;
  private motion: Motion | null = null;
  private animations = new Map<HTMLElement, Animation>();
  private parts = new Set<HTMLElement>();
  private readonly observer: MutationObserver;

  constructor(surface: HTMLElement) {
    this.surface = surface;
    this.bottom = surface.getBoundingClientRect().bottom;
    this.inset = committedInset();
    this.observer = new MutationObserver((records) => {
      if (!this.motion) return;

      const changed = records.some(changesMotionParts);
      if (changed) this.follow();
    });
    this.observer.observe(surface, { childList: true, subtree: true });
  }

  receive(message: KeyboardInset) {
    const isRepeated = this.received && message.inset === this.inset;
    this.received = true;
    if (isRepeated) return;

    this.inset = message.inset;
    const supported = message.easing && CSS.supports('animation-timing-function', message.easing);
    this.motion = {
      until: performance.now() + Math.max(0, message.duration),
      easing: supported ? message.easing! : DEFAULT_EASING,
    };
    this.follow();
  }

  resized() {
    if (this.motion) this.follow();
    else this.bottom = this.surface.getBoundingClientRect().bottom;
  }

  dispose() {
    this.observer.disconnect();
    this.animations.forEach((animation) => animation.cancel());
    this.parts.forEach((part) => part.style.removeProperty('translate'));
    this.animations.clear();
    this.parts.clear();
  }

  private follow() {
    const motion = this.motion;
    if (!motion) return;

    for (const part of this.parts) {
      if (this.surface.contains(part)) continue;

      this.animations.get(part)?.cancel();
      this.animations.delete(part);
      part.style.removeProperty('translate');
      this.parts.delete(part);
    }

    const bottom = this.surface.getBoundingClientRect().bottom;
    const layoutChange = bottom - this.bottom;
    this.bottom = bottom;
    const committed = committedInset();
    const target = committed - this.inset;
    const duration = Math.max(0, motion.until - performance.now());
    const reference = this.parts.values().next().value;
    const inherited = reference ? verticalTranslation(getComputedStyle(reference).translate) : 0;

    this.surface.querySelectorAll<HTMLElement>(PART).forEach((part) => {
      const registered = this.parts.has(part);
      const translation = registered
        ? verticalTranslation(getComputedStyle(part).translate)
        : inherited;
      const from = translation - layoutChange;
      const previous = this.animations.get(part);
      this.parts.add(part);
      part.style.translate = `0 ${target}px`;
      previous?.cancel();
      this.animations.delete(part);

      const moves = duration > 0 && Math.abs(from - target) > 0.5;
      if (!moves) return;

      const animation = part.animate(
        [{ translate: `0 ${from}px` }, { translate: `0 ${target}px` }],
        { duration, easing: motion.easing },
      );
      this.animations.set(part, animation);
      const release = () => {
        if (this.animations.get(part) === animation) this.animations.delete(part);
      };
      void animation.finished.then(release, release);
    });
  }
}

function verticalTranslation(translate: string): number {
  const [, vertical = '0'] = translate.split(' ');
  return Number.parseFloat(vertical) || 0;
}

function committedInset(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--app-keyboard-inset');
  return Number.parseFloat(value) || 0;
}

function changesMotionParts(record: MutationRecord): boolean {
  const insidePart = record.target instanceof Element && record.target.closest(PART);
  if (insidePart) return false;

  return [...record.addedNodes, ...record.removedNodes].some((node) => {
    const element = node instanceof Element ? node : null;
    if (!element) return false;

    return element.matches(PART) || Boolean(element.querySelector(PART));
  });
}
