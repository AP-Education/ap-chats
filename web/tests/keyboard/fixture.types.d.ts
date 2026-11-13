export interface KeyboardFixture {
  send(inset: number, duration?: number): void;
  commit(inset: number): void;
  remount(): void;
  remountHistory(): void;
}

declare global {
  interface Window {
    keyboardFixture: KeyboardFixture;
  }
}
