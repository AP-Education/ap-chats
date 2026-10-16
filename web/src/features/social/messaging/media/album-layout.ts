import { MEDIA_MAX_SIDE, type MediaSize } from './media-fit';

export interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Album {
  width: number;
  height: number;
  /** One per photo, in the order given. */
  tiles: Tile[];
}

const GAP = 2;
// Beyond these proportions a tile crops its photo rather than stretching the album.
const NARROWEST = 0.5;
const WIDEST = 2.5;
// A photo this much wider than tall leads the album across its top, as in Telegram.
const WIDE = 1.2;
// The side column of a tall lead keeps at least this share of the width.
const MIN_COLUMN_SHARE = 0.3;

function ratioOf({ width, height }: MediaSize): number {
  return Math.min(WIDEST, Math.max(NARROWEST, width / height));
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Photos side by side at one height, filling the width. */
function row(ratios: number[], width: number, top: number): { tiles: Tile[]; height: number } {
  const height = (width - GAP * (ratios.length - 1)) / sum(ratios);
  let x = 0;
  const tiles = ratios.map((ratio) => {
    const tile = { x, y: top, width: ratio * height, height };
    x += tile.width + GAP;
    return tile;
  });
  return { tiles, height };
}

/** Photos stacked in one column of the given width. */
function column(ratios: number[], width: number, left: number, top = 0): Tile[] {
  let y = top;
  return ratios.map((ratio) => {
    const tile = { x: left, y, width, height: width / ratio };
    y += tile.height + GAP;
    return tile;
  });
}

function rows(ratios: number[], width: number, sizes: number[]): Album {
  const tiles: Tile[] = [];
  let top = 0;
  let start = 0;
  for (const size of sizes) {
    const line = row(ratios.slice(start, start + size), width, top);
    tiles.push(...line.tiles);
    top += line.height + GAP;
    start += size;
  }
  return { width, height: top - GAP, tiles };
}

// Rows of two or three, the shorter rows first: 5 is 2+3, 7 is 2+2+3, 8 is 2+3+3.
function rowSizes(count: number): number[] {
  const threes = count % 3 === 0 ? count / 3 : count % 3 === 2 ? (count - 2) / 3 : (count - 4) / 3;
  const twos = (count - threes * 3) / 2;
  return [...Array<number>(twos).fill(2), ...Array<number>(threes).fill(3)];
}

/** A wide lead across the top, the rest in one row under it. */
function leadOnTop([lead, ...rest]: number[], width: number): Album {
  const leadHeight = width / lead!;
  const under = row(rest, width, leadHeight + GAP);
  return {
    width,
    height: leadHeight + GAP + under.height,
    tiles: [{ x: 0, y: 0, width, height: leadHeight }, ...under.tiles],
  };
}

/** A tall lead on the left at the album's full height, the rest stacked beside it. */
function leadOnLeft([lead, ...rest]: number[], width: number): Album | null {
  const stacked = sum(rest.map((ratio) => 1 / ratio));
  const gaps = GAP * (rest.length - 1);
  const height = ((width - GAP) * stacked + gaps) / (1 + lead! * stacked);
  const leadWidth = lead! * height;
  const columnWidth = width - GAP - leadWidth;
  if (columnWidth < width * MIN_COLUMN_SHARE) return null;

  return {
    width,
    height,
    tiles: [
      { x: 0, y: 0, width: leadWidth, height },
      ...column(rest, columnWidth, leadWidth + GAP),
    ],
  };
}

/** How an album of photos fills its box: Telegram's arrangements for two to four, rows beyond. */
export function albumLayout(sizes: MediaSize[], width = MEDIA_MAX_SIDE): Album {
  const ratios = sizes.map(ratioOf);
  const [lead = 1] = ratios;

  if (ratios.length === 2) {
    const bothWide = ratios.every((ratio) => ratio > WIDE);
    if (!bothWide) return rows(ratios, width, [2]);
    const tiles = column(ratios, width, 0);
    return { width, height: sum(tiles.map((tile) => tile.height)) + GAP, tiles };
  }

  if (ratios.length === 3 || ratios.length === 4) {
    if (lead > WIDE) return leadOnTop(ratios, width);
    return leadOnLeft(ratios, width) ?? rows(ratios, width, rowSizes(ratios.length));
  }

  return rows(ratios, width, rowSizes(ratios.length));
}
