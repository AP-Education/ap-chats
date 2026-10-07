import {
  createRandom,
  type Disk,
  packDisks,
  type Point,
  type Random,
  scatterOnTorus,
  torusDistance,
} from './scatter';

export const PATTERN_TILE_SIZE = 560;

export interface GlyphOutline {
  thin: string;
  light: string;
}

export interface PatternTileSpec {
  glyphs: readonly GlyphOutline[];
  /** CSS pixel size of every glyph placed in one tile. */
  glyphSizes: readonly number[];
  /** Distance between network nodes; 0 draws no network. */
  networkSpacing: number;
  orbits: number;
  constellations: number;
  particles: number;
  sparkles: number;
}

const GLYPH_GRID = 256;
const GLYPH_RADIUS = 0.62;
const GLYPH_GAP = 18;
// Outlines scale their stroke with the glyph, so large glyphs switch to the thin weight
// to keep every line about the same width.
const THIN_GLYPH_FROM = 36;
const MAX_TILT = 0.35;
const WRAPS = [-PATTERN_TILE_SIZE, 0, PATTERN_TILE_SIZE];

interface Tile {
  context: CanvasRenderingContext2D;
  pixelRatio: number;
}

type Draw = (context: CanvasRenderingContext2D) => void;
type IsClear = (point: Point, margin: number) => boolean;

// Renders the pattern as an alpha mask from vector shapes at the device pixel ratio, so
// one crisp tile can be repeated by the compositor instead of repainting a canvas.
export function renderPatternTile(
  spec: PatternTileSpec,
  seed: number,
  pixelRatio: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PATTERN_TILE_SIZE * pixelRatio);
  canvas.height = canvas.width;
  const tile = { context: canvas.getContext('2d')!, pixelRatio };
  const random = createRandom(seed);

  const glyphs = drawGlyphs(tile, spec, random);
  const isClear: IsClear = (point, margin) =>
    glyphs.every((disk) => torusDistance(disk, point, PATTERN_TILE_SIZE) > disk.radius + margin);

  if (spec.networkSpacing) drawNetwork(tile, spec.networkSpacing, random, isClear);
  for (let index = 0; index < spec.orbits; index++) drawOrbit(tile, random);
  for (let index = 0; index < spec.constellations; index++) drawConstellation(tile, random);
  drawParticles(tile, spec.particles, random, isClear);
  drawSparkles(tile, spec.sparkles, random, isClear);

  return canvas;
}

function drawGlyphs(tile: Tile, spec: PatternTileSpec, random: Random): Disk[] {
  if (!spec.glyphs.length) return [];

  const radii = spec.glyphSizes.map((size) => size * GLYPH_RADIUS);
  const disks = packDisks(PATTERN_TILE_SIZE, radii, GLYPH_GAP, random);
  const nextGlyph = shuffledCycle(
    spec.glyphs.map((glyph) => ({ thin: new Path2D(glyph.thin), light: new Path2D(glyph.light) })),
    random,
  );

  for (const disk of disks) {
    const size = disk.radius / GLYPH_RADIUS;
    const glyph = nextGlyph();
    const outline = size >= THIN_GLYPH_FROM ? glyph.thin : glyph.light;
    const tilt = (random() * 2 - 1) * MAX_TILT;
    stamp(tile, disk, disk.radius, 1, (context) => {
      context.rotate(tilt);
      context.scale(size / GLYPH_GRID, size / GLYPH_GRID);
      context.translate(-GLYPH_GRID / 2, -GLYPH_GRID / 2);
      context.fill(outline);
    });
  }

  return disks;
}

// Each node links to its two nearest neighbours, which reads as a sparse mesh rather
// than a web; links take the short way round the tile so the mesh stays seamless.
function drawNetwork(tile: Tile, spacing: number, random: Random, isClear: IsClear) {
  const nodes = scatterOnTorus(PATTERN_TILE_SIZE, spacing, random).filter((node) =>
    isClear(node, 6),
  );
  const linked = new Set<string>();

  nodes.forEach((node, index) => {
    const nearest = nodes
      .map((other, otherIndex) => ({
        otherIndex,
        distance: torusDistance(node, other, PATTERN_TILE_SIZE),
      }))
      .filter(({ otherIndex, distance }) => otherIndex !== index && distance < spacing * 1.9)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);

    for (const { otherIndex, distance } of nearest) {
      const key = [index, otherIndex].sort().join(':');
      if (linked.has(key)) continue;
      linked.add(key);

      const other = nodes[otherIndex]!;
      const dx = shortestOffset(other.x - node.x);
      const dy = shortestOffset(other.y - node.y);
      stamp(tile, node, distance, 0.5, (context) => {
        context.lineWidth = 0.8;
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(dx, dy);
        context.stroke();
      });
    }

    const hub = random() < 0.2;
    const radius = hub ? 2.6 : 1.3 + random();
    stamp(tile, node, 6, 0.95, (context) => {
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      if (!hub) return;
      context.lineWidth = 0.8;
      context.beginPath();
      context.arc(0, 0, 5.5, 0, Math.PI * 2);
      context.stroke();
    });
  });
}

function drawOrbit(tile: Tile, random: Random) {
  const center = { x: random() * PATTERN_TILE_SIZE, y: random() * PATTERN_TILE_SIZE };
  const radiusX = 70 + random() * 90;
  const radiusY = radiusX * (0.26 + random() * 0.2);
  const rotation = random() * Math.PI;
  const start = random() * Math.PI * 2;
  const end = start + Math.PI * (1.2 + random() * 0.6);

  stamp(tile, center, radiusX, 0.45, (context) => {
    context.lineWidth = 0.9;
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, rotation, start, end);
    context.stroke();
    context.rotate(rotation);
    context.beginPath();
    context.arc(radiusX * Math.cos(end), radiusY * Math.sin(end), 2.4, 0, Math.PI * 2);
    context.fill();
  });
}

function drawConstellation(tile: Tile, random: Random) {
  const origin = { x: random() * PATTERN_TILE_SIZE, y: random() * PATTERN_TILE_SIZE };
  const stars: Point[] = [{ x: 0, y: 0 }];
  let heading = random() * Math.PI * 2;
  const length = 4 + Math.floor(random() * 3);
  for (let index = 1; index < length; index++) {
    heading += (random() - 0.5) * 1.8;
    const step = 28 + random() * 36;
    const previous = stars.at(-1)!;
    stars.push({
      x: previous.x + Math.cos(heading) * step,
      y: previous.y + Math.sin(heading) * step,
    });
  }

  stamp(tile, origin, 260, 0.45, (context) => {
    context.lineWidth = 0.8;
    context.beginPath();
    stars.forEach(({ x, y }, index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.stroke();
  });
  for (const star of stars) {
    const point = { x: origin.x + star.x, y: origin.y + star.y };
    const radius = 1.8 + random() * 0.8;
    stamp(tile, point, 4, 1, (context) => {
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
    });
  }
}

function drawParticles(tile: Tile, count: number, random: Random, isClear: IsClear) {
  for (let index = 0; index < count; index++) {
    const point = { x: random() * PATTERN_TILE_SIZE, y: random() * PATTERN_TILE_SIZE };
    const radius = 0.45 + random() ** 3 * 1.9;
    const alpha = 0.18 + random() * 0.7;
    if (!isClear(point, 3)) continue;

    stamp(tile, point, radius, alpha, (context) => {
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
    });
  }
}

// The four-point star of the AP mark, with concave sides.
function drawSparkles(tile: Tile, count: number, random: Random, isClear: IsClear) {
  const sparkle = new Path2D(
    'M0-1C.08-.28.28-.08 1 0C.28.08.08.28 0 1C-.08.28-.28.08-1 0C-.28-.08-.08-.28 0-1Z',
  );

  for (let index = 0; index < count; index++) {
    const point = { x: random() * PATTERN_TILE_SIZE, y: random() * PATTERN_TILE_SIZE };
    const size = 3.5 + random() ** 2 * 9;
    const alpha = 0.6 + random() * 0.4;
    if (!isClear(point, size + 4)) continue;

    stamp(tile, point, size, alpha, (context) => {
      context.scale(size, size);
      context.fill(sparkle);
    });
  }
}

// Draws a shape once per tile copy it overlaps, so shapes crossing an edge continue
// on the opposite side and the repeated tile stays seamless.
function stamp(tile: Tile, point: Point, radius: number, alpha: number, draw: Draw) {
  const { context, pixelRatio } = tile;

  for (const offsetY of WRAPS) {
    for (const offsetX of WRAPS) {
      const x = point.x + offsetX;
      const y = point.y + offsetY;
      const outside =
        x < -radius ||
        y < -radius ||
        x > PATTERN_TILE_SIZE + radius ||
        y > PATTERN_TILE_SIZE + radius;
      if (outside) continue;

      context.globalAlpha = alpha;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.setTransform(pixelRatio, 0, 0, pixelRatio, x * pixelRatio, y * pixelRatio);
      draw(context);
    }
  }
}

function shortestOffset(delta: number) {
  if (delta > PATTERN_TILE_SIZE / 2) return delta - PATTERN_TILE_SIZE;
  if (delta < -PATTERN_TILE_SIZE / 2) return delta + PATTERN_TILE_SIZE;
  return delta;
}

function shuffledCycle<T>(items: readonly T[], random: Random): () => T {
  let bag: T[] = [];

  return () => {
    if (!bag.length) bag = shuffle(items, random);
    return bag.pop()!;
  };
}

function shuffle<T>(items: readonly T[], random: Random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}
