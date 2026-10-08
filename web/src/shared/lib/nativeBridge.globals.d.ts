interface NativeBridgeChannel {
  onMessage?: (message: unknown) => void;
  queue?: unknown[];
}

declare global {
  interface Window {
    ApAppNative?: NativeBridgeChannel;
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }
}

export {};
