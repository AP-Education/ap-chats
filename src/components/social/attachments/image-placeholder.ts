import sharp from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';

// ThumbHash reads at most 100 pixels a side.
const PLACEHOLDER_SIDE = 100;

/**
 * The image as a ThumbHash, the placeholder Discord keeps for media: its colours and a blurred
 * stand-in in about 25 bytes, so clients paint and tint around it before the image loads.
 */
export async function imagePlaceholder(image: Buffer): Promise<string> {
  const { data, info } = await sharp(image)
    .resize(PLACEHOLDER_SIDE, PLACEHOLDER_SIDE, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return Buffer.from(rgbaToThumbHash(info.width, info.height, data)).toString('base64');
}
