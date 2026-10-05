export function selectionHaptic(): void {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'haptics/selection' }));
}
