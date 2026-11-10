import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RoomStore } from '../../../server/roomStore';
import { createInitialGameState } from '../engine/RulesEngine';

const temporaryDirectories: string[] = [];
afterEach(() => temporaryDirectories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true })));
function filename() {
  const directory = mkdtempSync(join(tmpdir(), 'rekatan-rooms-'));
  temporaryDirectories.push(directory);
  return join(directory, 'rooms.json');
}

describe('Conservación de salas al reiniciar el servidor', () => {
  it('restaura la sala y su configuración con el mismo código y anfitrión', () => {
    const file = filename(); const store = new RoomStore(file);
    const state = createInitialGameState('SAVED', { id: 'P1', name: 'Colona', avatar: 'I', color: 'RED' });
    state.config.victoryPointsTarget = 15;
    store.set('SAVED', state); store.flush();
    const restored = new RoomStore(file).get('SAVED')!;
    expect(JSON.stringify(restored.board)).toBe(JSON.stringify(state.board)); // Igual que el estado enviado por WebSocket (incluido -0 → 0).
    expect(restored.config).toEqual(state.config);
    expect(restored.players[0]).toMatchObject({ id: 'P1', isHost: true, connected: false });
  });
  it('pausa una partida restaurada mientras vuelven a conectar los jugadores', () => {
    const file = filename(); const store = new RoomStore(file);
    const state = createInitialGameState('SAVED', { id: 'P1', name: 'Colona', avatar: 'I', color: 'RED' });
    state.phase = 'MAIN_PHASE'; state.turn.turnDeadlineMs = Date.now() + 10000;
    store.set('SAVED', state); store.flush();
    const restored = new RoomStore(file).get('SAVED')!;
    expect(restored.phase).toBe('PAUSED_DISCONNECT');
    expect(restored.turn.phaseBeforePause).toBe('MAIN_PHASE');
    expect(restored.turn.turnDeadlineMs).toBeNull();
  });
  it('no restaura salas que se han abandonado y eliminado explícitamente', () => {
    const file = filename(); const store = new RoomStore(file);
    store.set('SAVED', createInitialGameState('SAVED', { id: 'P1', name: 'Colona', avatar: 'I', color: 'RED' }));
    store.flush(); store.delete('SAVED'); store.flush();
    expect(new RoomStore(file).size).toBe(0);
  });
});
