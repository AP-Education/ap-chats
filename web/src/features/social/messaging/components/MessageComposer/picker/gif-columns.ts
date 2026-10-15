import type { Gif } from '../../../gifs/types';

/** GIFs in their own proportions, each into the shortest column so far, as Discord's picker lays them. */
export function gifColumns(gifs: Gif[], count: number): Gif[][] {
  const columns = Array.from({ length: count }, () => ({ gifs: [] as Gif[], height: 0 }));

  for (const gif of gifs) {
    const shortest = columns.reduce((low, column) => (column.height < low.height ? column : low));
    shortest.gifs.push(gif);
    shortest.height += gif.preview.height / gif.preview.width;
  }

  return columns.map((column) => column.gifs);
}
