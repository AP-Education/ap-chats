import type { MessageGif } from '../content/message-gif';
import type { GifBlockDto } from './dto/send-message.dto';

/** The GIF a request brings, in the shape a message keeps it. */
export function requestedGif(blocks: GifBlockDto[] | undefined): MessageGif | undefined {
  const [block] = blocks ?? [];
  if (!block) return undefined;

  const { provider, link, title, media } = block;
  return {
    provider,
    link,
    title,
    media: {
      url: media.url,
      width: media.width,
      height: media.height,
      ...(media.placeholder ? { placeholder: media.placeholder } : {}),
    },
  };
}
