/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public base URL of the image storage; applications provide it at build time. */
  readonly VITE_IMAGES_URL?: string;
}
