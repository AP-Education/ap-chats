import { requireOptionalNativeModule } from 'expo';

interface CallWindowNativeModule {
  close(): Promise<void>;
  openChats(): Promise<void>;
}

// Android only: on iOS CallKit draws the call over the lock screen itself.
const CallWindowModule = requireOptionalNativeModule<CallWindowNativeModule>('CallWindow');

export function closeCallWindow(): void {
  void CallWindowModule?.close();
}

/** Brings the chats over the call window, once a locked phone is unlocked. */
export function openChatsFromCallWindow(): void {
  void CallWindowModule?.openChats();
}
