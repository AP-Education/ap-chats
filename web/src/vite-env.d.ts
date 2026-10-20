/** Changes with every build, so data saved by an older build is never restored. */
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_IMAGES_URL?: string;
  readonly VITE_KLIPY_API_KEY?: string;
  /** AI Native, whose agent StarMe is; client conversations ask it from the browser. */
  readonly VITE_AI_NATIVE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
