import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import sharp from 'sharp';

const run = promisify(execFile);
export const MAX_VIDEO_PREVIEW_BYTES = 64 * 1024 * 1024;
const MAX_PIXELS = 50_000_000;
const INPUT_OPTIONS = [
  '-protocol_whitelist',
  'file,pipe',
  '-format_whitelist',
  'mov,matroska,webm',
];

interface VideoStream {
  index: number;
  width: number;
  height: number;
  disposition?: { attached_pic?: number };
  side_data_list?: { rotation?: number }[];
}

export interface VideoPreview {
  image: Buffer;
  width: number;
  height: number;
  duration: number;
}

/** Decodes a bounded local file; the demuxer cannot open network protocols. */
export async function videoPreview(path: string): Promise<VideoPreview> {
  const probe = await run(
    'ffprobe',
    [
      '-v',
      'error',
      ...INPUT_OPTIONS,
      '-select_streams',
      'v',
      '-show_entries',
      'stream=index,width,height:stream_disposition=attached_pic:stream_side_data=rotation:format=duration',
      '-of',
      'json',
      path,
    ],
    { timeout: 10_000, maxBuffer: 64 * 1024, killSignal: 'SIGKILL' },
  );
  const metadata = JSON.parse(probe.stdout) as {
    streams?: VideoStream[];
    format?: { duration?: string };
  };
  const stream = metadata.streams?.find((item) => !item.disposition?.attached_pic);
  const duration = Number(metadata.format?.duration);
  if (
    !stream ||
    !Number.isSafeInteger(stream.index) ||
    !Number.isSafeInteger(stream.width) ||
    !Number.isSafeInteger(stream.height) ||
    stream.width <= 0 ||
    stream.height <= 0 ||
    stream.width > 10_000 ||
    stream.height > 10_000 ||
    stream.width * stream.height > MAX_PIXELS ||
    !Number.isFinite(duration) ||
    duration <= 0
  )
    throw new Error('Unsupported video metadata');

  const { stdout } = await run(
    'ffmpeg',
    [
      '-nostdin',
      '-v',
      'error',
      ...INPUT_OPTIONS,
      '-threads',
      '1',
      '-max_pixels',
      String(MAX_PIXELS),
      '-i',
      path,
      '-ss',
      String(Math.min(0.1, duration / 2)),
      '-map',
      `0:${stream.index}`,
      '-frames:v',
      '1',
      '-an',
      '-sn',
      '-vf',
      "scale=w='min(960,iw)':h='min(960,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
      '-filter_threads',
      '1',
      '-threads',
      '1',
      '-c:v',
      'mjpeg',
      '-q:v',
      '4',
      '-f',
      'image2pipe',
      'pipe:1',
    ],
    { encoding: 'buffer', timeout: 15_000, maxBuffer: 2 * 1024 * 1024, killSignal: 'SIGKILL' },
  );
  const image = await sharp(stdout).webp({ quality: 80, effort: 2 }).toBuffer();
  const rotation = stream.side_data_list?.find((item) => Number.isFinite(item.rotation))?.rotation;
  const rotated = rotation !== undefined && Math.abs(Math.round(rotation / 90)) % 2 === 1;
  return {
    image,
    width: rotated ? stream.height : stream.width,
    height: rotated ? stream.width : stream.height,
    duration,
  };
}
