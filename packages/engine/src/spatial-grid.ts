import { hitSurface, type Ray, type Surface, type SurfaceHit } from './geometry';

/** How far a ray that meets nothing is drawn, in mm; hits beyond it count as misses. */
export const noHitLength = 4000;

// Surfaces touching a cell boundary within this distance go in both cells.
const boundaryMargin = 1e-6;

export interface SurfaceGrid {
  surfaces: Surface[];
  minX: number;
  minY: number;
  cellWidth: number;
  cellHeight: number;
  columns: number;
  rows: number;
  /** Surface indices per cell, row by row. */
  cells: number[][];
  /** Per surface, the walk that tested it last, so a ray tests each surface once. */
  lastTestedInWalk: Uint32Array;
  walkCount: number;
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boundingBox(surface: Surface): Box {
  if (surface.shape === 'arc') {
    const { centre, radius } = surface;
    return {
      minX: centre.x - radius,
      minY: centre.y - radius,
      maxX: centre.x + radius,
      maxY: centre.y + radius,
    };
  }
  return {
    minX: Math.min(surface.start.x, surface.end.x),
    minY: Math.min(surface.start.y, surface.end.y),
    maxX: Math.max(surface.start.x, surface.end.x),
    maxY: Math.max(surface.start.y, surface.end.y),
  };
}

/** Buckets surfaces into grid cells so a ray only tests the surfaces along its path. */
export function buildSurfaceGrid(surfaces: Surface[]): SurfaceGrid {
  const boxes = surfaces.map(boundingBox);
  if (boxes.length === 0) {
    return {
      surfaces,
      minX: 0,
      minY: 0,
      cellWidth: 1,
      cellHeight: 1,
      columns: 0,
      rows: 0,
      cells: [],
      lastTestedInWalk: new Uint32Array(0),
      walkCount: 0,
    };
  }
  // A margin keeps the grid a real area even for a single straight surface.
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const box of boxes) {
    bounds.minX = Math.min(bounds.minX, box.minX - 1);
    bounds.minY = Math.min(bounds.minY, box.minY - 1);
    bounds.maxX = Math.max(bounds.maxX, box.maxX + 1);
    bounds.maxY = Math.max(bounds.maxY, box.maxY + 1);
  }

  // About four cells per surface, capped so a big scene stays a small table.
  const cellsPerSide = Math.min(64, Math.ceil(2 * Math.sqrt(surfaces.length)));
  const grid: SurfaceGrid = {
    surfaces,
    minX: bounds.minX,
    minY: bounds.minY,
    cellWidth: (bounds.maxX - bounds.minX) / cellsPerSide,
    cellHeight: (bounds.maxY - bounds.minY) / cellsPerSide,
    columns: cellsPerSide,
    rows: cellsPerSide,
    cells: [],
    lastTestedInWalk: new Uint32Array(surfaces.length),
    walkCount: 0,
  };
  for (let cell = 0; cell < cellsPerSide * cellsPerSide; cell += 1) grid.cells.push([]);

  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index];
    const firstColumn = columnOf(grid, box.minX - boundaryMargin);
    const lastColumn = columnOf(grid, box.maxX + boundaryMargin);
    const firstRow = rowOf(grid, box.minY - boundaryMargin);
    const lastRow = rowOf(grid, box.maxY + boundaryMargin);
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        grid.cells[row * grid.columns + column].push(index);
      }
    }
  }
  return grid;
}

function columnOf(grid: SurfaceGrid, x: number): number {
  const column = Math.floor((x - grid.minX) / grid.cellWidth);
  return Math.min(grid.columns - 1, Math.max(0, column));
}

function rowOf(grid: SurfaceGrid, y: number): number {
  const row = Math.floor((y - grid.minY) / grid.cellHeight);
  return Math.min(grid.rows - 1, Math.max(0, row));
}

/** The distances along the ray where it enters and leaves the grid, or null when it misses. */
function gridSpan(grid: SurfaceGrid, ray: Ray): { enter: number; leave: number } | null {
  let enter = 0;
  let leave = noHitLength;
  const axes = [
    { start: ray.x, step: ray.dx, min: grid.minX, max: grid.minX + grid.columns * grid.cellWidth },
    { start: ray.y, step: ray.dy, min: grid.minY, max: grid.minY + grid.rows * grid.cellHeight },
  ];
  for (const axis of axes) {
    if (axis.step === 0) {
      if (axis.start < axis.min || axis.start > axis.max) return null;
      continue;
    }
    const toMin = (axis.min - axis.start) / axis.step;
    const toMax = (axis.max - axis.start) / axis.step;
    enter = Math.max(enter, Math.min(toMin, toMax));
    leave = Math.min(leave, Math.max(toMin, toMax));
  }
  if (enter > leave) return null;
  return { enter, leave };
}

/**
 * The closest surface a ray hits within `noHitLength`, or null when it leaves the bench.
 * Ties go to the lower surface index, as when every surface is tested in order.
 */
export function nearestHit(
  grid: SurfaceGrid,
  ray: Ray,
): { hit: SurfaceHit; surface: Surface; index: number } | null {
  const span = gridSpan(grid, ray);
  if (!span) return null;

  // Walk the cells along the ray (Amanatides and Woo), nearest first.
  let column = columnOf(grid, ray.x + ray.dx * span.enter);
  let row = rowOf(grid, ray.y + ray.dy * span.enter);
  const columnStep = ray.dx > 0 ? 1 : -1;
  const rowStep = ray.dy > 0 ? 1 : -1;
  const nextColumnEdge = grid.minX + (ray.dx > 0 ? column + 1 : column) * grid.cellWidth;
  const nextRowEdge = grid.minY + (ray.dy > 0 ? row + 1 : row) * grid.cellHeight;
  let nextColumnT = ray.dx === 0 ? Infinity : (nextColumnEdge - ray.x) / ray.dx;
  let nextRowT = ray.dy === 0 ? Infinity : (nextRowEdge - ray.y) / ray.dy;
  const columnT = ray.dx === 0 ? Infinity : grid.cellWidth / Math.abs(ray.dx);
  const rowT = ray.dy === 0 ? Infinity : grid.cellHeight / Math.abs(ray.dy);

  // A stamp per surface instead of a Set per ray: no allocation in the innermost loop.
  grid.walkCount += 1;
  const walk = grid.walkCount;
  let best: { hit: SurfaceHit; surface: Surface; index: number } | null = null;
  while (column >= 0 && column < grid.columns && row >= 0 && row < grid.rows) {
    for (const index of grid.cells[row * grid.columns + column]) {
      if (grid.lastTestedInWalk[index] === walk) continue;
      grid.lastTestedInWalk[index] = walk;
      const hit = hitSurface(grid.surfaces[index], ray);
      if (!hit || hit.t >= noHitLength) continue;
      const closer = !best || hit.t < best.hit.t || (hit.t === best.hit.t && index < best.index);
      if (closer) best = { hit, surface: grid.surfaces[index], index };
    }
    const cellExitT = Math.min(nextColumnT, nextRowT);
    // A hit before the ray leaves this cell lies in a cell already walked, so nothing nearer remains.
    if (best && best.hit.t < cellExitT) return best;
    if (cellExitT > span.leave) return best;
    if (nextColumnT < nextRowT) {
      column += columnStep;
      nextColumnT += columnT;
    } else {
      row += rowStep;
      nextRowT += rowT;
    }
  }
  return best;
}
