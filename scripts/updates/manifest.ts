import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type ShellPlatform = 'ios' | 'android';
export type UpdateChannel = 'production' | 'preview';

/** One file of an update, as the API stores it and where it goes in the bucket. */
export interface UpdateFile {
  /** Base64url SHA-256 without padding, as the Expo Updates protocol expects. */
  hash: string;
  /** The phone's cache key: the file's hex MD5, as `expo export` names assets. */
  key: string;
  contentType: string;
  fileExtension: string;
  url: string;
  objectKey: string;
  localPath: string;
}

export interface UpdateBundle {
  launchAsset: UpdateFile;
  assets: UpdateFile[];
}

interface ExportMetadata {
  fileMetadata?: Partial<
    Record<ShellPlatform, { bundle: string; assets: { path: string; ext: string }[] }>
  >;
}

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  json: 'application/json',
};

/** Files live under their content hash, so a file the bucket has is never sent again. */
export function describeFile(
  contents: Buffer,
  localPath: string,
  extension: string,
  contentType: string,
  assetsUrl: string,
): UpdateFile {
  const hash = createHash('sha256').update(contents).digest('base64url');
  const objectKey = `app-updates/${hash}${extension}`;
  return {
    hash,
    key: createHash('md5').update(contents).digest('hex'),
    contentType,
    fileExtension: extension,
    url: `${assetsUrl.replace(/\/+$/u, '')}/${objectKey}`,
    objectKey,
    localPath,
  };
}

/** Reads what `expo export --platform <platform>` wrote to `exportDir`. */
export async function readExport(
  exportDir: string,
  platform: ShellPlatform,
  assetsUrl: string,
): Promise<UpdateBundle> {
  const metadata = JSON.parse(
    await readFile(path.join(exportDir, 'metadata.json'), 'utf8'),
  ) as ExportMetadata;
  const files = metadata.fileMetadata?.[platform];
  if (!files) throw new Error(`The export has no ${platform} bundle`);

  const describe = async (relative: string, extension: string, contentType: string) => {
    const localPath = path.join(exportDir, relative);
    return describeFile(await readFile(localPath), localPath, extension, contentType, assetsUrl);
  };

  return {
    launchAsset: await describe(files.bundle, '.bundle', 'application/javascript'),
    assets: await Promise.all(
      files.assets.map(({ path: relative, ext }) =>
        describe(
          relative,
          `.${ext}`,
          CONTENT_TYPES[ext.toLowerCase()] ?? 'application/octet-stream',
        ),
      ),
    ),
  };
}

/** The manifest the admin API takes: the files without where they lie on this machine. */
export function manifestOf({ launchAsset, assets }: UpdateBundle) {
  const strip = ({ hash, key, contentType, fileExtension, url }: UpdateFile) => ({
    hash,
    key,
    contentType,
    fileExtension,
    url,
  });
  return { launchAsset: strip(launchAsset), assets: assets.map(strip) };
}
