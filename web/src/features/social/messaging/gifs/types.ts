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

/** What a message needs of a GIF picked in either picker, the page's or the shell's own. */
export type PickedGif = Pick<Gif, 'pageUrl' | 'title' | 'image' | 'placeholder'>;

export interface GifPage {
  gifs: Gif[];
  nextPage: number | null;
}
