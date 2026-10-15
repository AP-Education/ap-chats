export interface GifImage {
  url: string;
  width: number;
  height: number;
}

/** A KLIPY search result, as the picker shows it. */
export interface Gif {
  slug: string;
  title: string;
  /** The KLIPY page: the link a message carries for it. */
  pageUrl: string;
  /** Small enough for a picker tile. */
  preview: GifImage;
  /** Sharp enough for a message. */
  image: GifImage;
  /** A blurred stand-in to paint while the GIF loads. */
  placeholder: string | null;
}

export interface GifPage {
  gifs: Gif[];
  nextPage: number | null;
}
