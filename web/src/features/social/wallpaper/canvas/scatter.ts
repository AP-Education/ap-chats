export interface Point {
  x: number;
  y: number;
}

export type Random = () => number;

// mulberry32: tiny and well distributed, so the same seed always draws the same pattern.
export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

export function torusDistance(a: Point, b: Point, size: number): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.hypot(Math.min(dx, size - dx), Math.min(dy, size - dy));
}

export interface Disk extends Point {
  radius: number;
}

// Largest first, so big shapes claim room and smaller ones settle into the gaps between
// them; a radius that finds no free spot after the attempts is simply left out.
export function packDisks(
  size: number,
  radii: readonly number[],
  gap: number,
  random: Random,
  attempts = 300,
): Disk[] {
  const disks: Disk[] = [];

  for (const radius of [...radii].sort((a, b) => b - a)) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const candidate = { x: random() * size, y: random() * size, radius };
      const fits = disks.every(
        (disk) => torusDistance(disk, candidate, size) >= disk.radius + radius + gap,
      );
      if (fits) {
        disks.push(candidate);
        break;
      }
    }
  }

  return disks;
}

const ATTEMPTS = 30;

// Bridson's Poisson-disk sampling on a torus: evenly spaced but organic points whose
// spacing also holds across the tile edges, so the repeated tile has no visible seam.
export function scatterOnTorus(size: number, spacing: number, random: Random): Point[] {
  const cellsPerSide = Math.ceil(size / (spacing / Math.SQRT2));
  const cellSize = size / cellsPerSide;
  const grid = new Array<Point | undefined>(cellsPerSide * cellsPerSide);
  const points: Point[] = [];
  const active: Point[] = [];

  const wrap = (value: number, limit: number) => ((value % limit) + limit) % limit;
  const cellOf = (point: Point) => ({
    column: Math.min(cellsPerSide - 1, Math.floor(point.x / cellSize)),
    row: Math.min(cellsPerSide - 1, Math.floor(point.y / cellSize)),
  });

  function isFree(candidate: Point) {
    const { column, row } = cellOf(candidate);
    for (let rowOffset = -2; rowOffset <= 2; rowOffset++) {
      for (let columnOffset = -2; columnOffset <= 2; columnOffset++) {
        const neighbourRow = wrap(row + rowOffset, cellsPerSide);
        const neighbourColumn = wrap(column + columnOffset, cellsPerSide);
        const neighbour = grid[neighbourRow * cellsPerSide + neighbourColumn];
        if (neighbour && torusDistance(neighbour, candidate, size) < spacing) return false;
      }
    }
    return true;
  }

  function add(point: Point) {
    const { column, row } = cellOf(point);
    grid[row * cellsPerSide + column] = point;
    points.push(point);
    active.push(point);
  }

  add({ x: random() * size, y: random() * size });

  while (active.length) {
    const index = Math.floor(random() * active.length);
    const origin = active[index]!;
    let placed = false;

    for (let attempt = 0; attempt < ATTEMPTS && !placed; attempt++) {
      const angle = random() * Math.PI * 2;
      const distance = spacing * (1 + random());
      const candidate = {
        x: wrap(origin.x + Math.cos(angle) * distance, size),
        y: wrap(origin.y + Math.sin(angle) * distance, size),
      };
      if (isFree(candidate)) {
        add(candidate);
        placed = true;
      }
    }

    if (!placed) active.splice(index, 1);
  }

  return points;
}
