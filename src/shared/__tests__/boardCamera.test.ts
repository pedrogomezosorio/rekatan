import { describe, expect, it } from 'vitest';
import { normalizeBoardCamera, zoomBoardCamera } from '../boardCamera';

describe('Recuperación de la cámara del tablero', () => {
  it('limpia coordenadas corruptas antes de acercar, alejar o centrar', () => {
    const corrupted = { x: NaN, y: Infinity, zoom: NaN };
    expect(normalizeBoardCamera(corrupted)).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(zoomBoardCamera(corrupted, 1.18).zoom).toBeCloseTo(1.18);
    expect(zoomBoardCamera(corrupted, 1 / 1.18).zoom).toBeCloseTo(1 / 1.18);
  });
  it('mantiene el punto bajo el cursor al cambiar de escala', () => {
    const current = { x: 25, y: -30, zoom: 1.1 };
    const anchor = { x: 100, y: 50 };
    const next = zoomBoardCamera(current, 1.2, anchor);
    expect((anchor.x - next.x) / next.zoom).toBeCloseTo((anchor.x - current.x) / current.zoom);
    expect((anchor.y - next.y) / next.zoom).toBeCloseTo((anchor.y - current.y) / current.zoom);
  });
  it('tolera eventos de rueda o pinza no válidos sin bloquear la cámara', () => {
    for (const factor of [NaN, Infinity, 0, -1]) expect(zoomBoardCamera({ x: 0, y: 0, zoom: 1 }, factor)).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(zoomBoardCamera({ x: 0, y: 0, zoom: 2.5 }, 10).zoom).toBe(2.6);
    expect(zoomBoardCamera({ x: 0, y: 0, zoom: 0.5 }, 0.01).zoom).toBe(0.45);
  });
});
