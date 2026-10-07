/** Changes with every build, so data saved by an older build is never restored. */
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_IMAGES_URL?: string;
  readonly VITE_TENOR_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
