export interface BoardCamera { x: number; y: number; zoom: number }

/** A hidden/resizing SVG must never poison subsequent camera updates with NaN. */
export function normalizeBoardCamera(camera: BoardCamera): BoardCamera {
  return {
    x: Number.isFinite(camera.x) ? Math.max(-680, Math.min(680, camera.x)) : 0,
    y: Number.isFinite(camera.y) ? Math.max(-560, Math.min(560, camera.y)) : 0,
    zoom: Number.isFinite(camera.zoom) ? Math.max(0.45, Math.min(2.6, camera.zoom)) : 1,
  };
}

export function zoomBoardCamera(camera: BoardCamera, factor: number, anchor = { x: 0, y: 0 }): BoardCamera {
  const previous = normalizeBoardCamera(camera);
  if (!Number.isFinite(factor) || factor <= 0) return previous;
  const zoom = Math.max(0.45, Math.min(2.6, previous.zoom * factor));
  const ratio = zoom / previous.zoom;
  return normalizeBoardCamera({
    x: anchor.x - (anchor.x - previous.x) * ratio,
    y: anchor.y - (anchor.y - previous.y) * ratio,
    zoom,
  });
}
