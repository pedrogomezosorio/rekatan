export interface BoardCamera { x: number; y: number; zoom: number }
export interface BoardCameraBounds { maxX: number; maxY: number }

const DEFAULT_CAMERA_BOUNDS: BoardCameraBounds = { maxX: 680, maxY: 560 };

/** A hidden/resizing SVG must never poison subsequent camera updates with NaN. */
export function normalizeBoardCamera(
  camera: BoardCamera,
  bounds: BoardCameraBounds = DEFAULT_CAMERA_BOUNDS
): BoardCamera {
  const maxX = Number.isFinite(bounds.maxX) && bounds.maxX > 0 ? bounds.maxX : DEFAULT_CAMERA_BOUNDS.maxX;
  const maxY = Number.isFinite(bounds.maxY) && bounds.maxY > 0 ? bounds.maxY : DEFAULT_CAMERA_BOUNDS.maxY;
  return {
    x: Number.isFinite(camera.x) ? Math.max(-maxX, Math.min(maxX, camera.x)) : 0,
    y: Number.isFinite(camera.y) ? Math.max(-maxY, Math.min(maxY, camera.y)) : 0,
    zoom: Number.isFinite(camera.zoom) ? Math.max(0.45, Math.min(2.6, camera.zoom)) : 1,
  };
}

export function zoomBoardCamera(
  camera: BoardCamera,
  factor: number,
  anchor = { x: 0, y: 0 },
  bounds: BoardCameraBounds = DEFAULT_CAMERA_BOUNDS
): BoardCamera {
  const previous = normalizeBoardCamera(camera, bounds);
  if (!Number.isFinite(factor) || factor <= 0) return previous;
  const zoom = Math.max(0.45, Math.min(2.6, previous.zoom * factor));
  const ratio = zoom / previous.zoom;
  return normalizeBoardCamera(
    {
      x: anchor.x - (anchor.x - previous.x) * ratio,
      y: anchor.y - (anchor.y - previous.y) * ratio,
      zoom,
    },
    bounds
  );
}
