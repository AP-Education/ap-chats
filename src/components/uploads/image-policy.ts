export interface ImageUploadPolicy {
  readonly maxBytes: number;
  readonly maxPixels: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly maxChannels: number;
  readonly allowedInputFormats: ReadonlySet<string>;
  readonly targetMaxDimensions: number;
  readonly outputQuality: number;
  readonly outputEffort: number;
  readonly failOn: 'none' | 'truncated' | 'error' | 'warning';
}

// Copied from backend-LMS's IMAGE_UPLOAD_POLICY (cloud-storage/service/asset-security/asset-policy.ts).
export const IMAGE_UPLOAD_POLICY: ImageUploadPolicy = {
  maxBytes: 25 * 1024 * 1024,
  maxPixels: 40_000_000,
  maxWidth: 8_000,
  maxHeight: 8_000,
  maxChannels: 4,
  allowedInputFormats: new Set(['jpeg', 'png', 'webp', 'heif']),
  targetMaxDimensions: 2560,
  outputQuality: 85,
  outputEffort: 4,
  failOn: 'error',
};
