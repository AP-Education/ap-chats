import { requireOptionalNativeModule } from 'expo';

interface PageFrameNativeModule {
  bottomGap(): Promise<number>;
  clearInsets(): Promise<void>;
}

// Android only: iOS measures the page from JS, where a page in a tab's host still reads in the
// window's own frame, and WKWebView takes the safe areas the page is drawn under.
const PageFrame = requireOptionalNativeModule<PageFrameNativeModule>('PageFrame');

/** How far above the screen's bottom the page's WebView ends, in dp; null where JS measures it. */
export function measurePageBottomGap(): Promise<number> | null {
  return PageFrame?.bottomGap() ?? null;
}

/** Keeps the WebView from insetting the page for the system bars and keyboard native already handles. */
export function clearPageInsets(): void {
  void PageFrame?.clearInsets();
}
