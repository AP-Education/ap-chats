import { BadRequestException } from '@nestjs/common';
import { BufferSource, Input, MP4, OGG, WAVE, WEBM } from 'mediabunny';

export const MAX_VOICE_BYTES = 20 * 1024 * 1024;
export const MAX_VOICE_DURATION_MS = 10 * 60 * 1000;

/** Reads packet timestamps, including WebM recordings without a Duration header. */
export async function inspectVoice(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_VOICE_BYTES)
    throw new BadRequestException('Voice recording is empty or too large');
  const input = new Input({ source: new BufferSource(bytes), formats: [MP4, WEBM, OGG, WAVE] });
  try {
    const audio = await input.getAudioTracks();
    const video = await input.getVideoTracks();
    if (audio.length !== 1 || video.length || !audio[0]!.codec)
      throw new Error('Expected one audio track');
    const durationMs = Math.round((await input.computeDuration()) * 1000);
    if (
      !Number.isFinite(durationMs) ||
      durationMs < 500 ||
      durationMs > MAX_VOICE_DURATION_MS + 500
    )
      throw new Error('Invalid voice duration');
    const mime = (await input.getMimeType()).split(';')[0]!;
    const mediaType = mime.replace(/^video\//, 'audio/');
    return {
      preview: 'audio' as const,
      mediaType,
      width: null,
      height: null,
      voice: { durationMs },
    };
  } catch {
    throw new BadRequestException(
      'Invalid or unsupported voice recording (0.5 seconds to 10 minutes)',
    );
  } finally {
    input.dispose();
  }
}
