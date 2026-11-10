import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { GameState } from '../src/shared/types';

/** Atomic snapshots keep a server restart from turning a valid room into a missing one. */
export class RoomStore extends Map<string, GameState> {
  private pending?: ReturnType<typeof setTimeout>;
  private dirty = false;

  constructor(private readonly filename: string) {
    super();
    try {
      const snapshot = JSON.parse(readFileSync(filename, 'utf8'));
      if (snapshot.version !== 1 || !Array.isArray(snapshot.rooms)) throw new Error('Formato de salas no válido.');
      for (const [code, saved] of snapshot.rooms) {
        if (typeof code !== 'string' || saved?.roomCode !== code || !Array.isArray(saved.players) || !saved.board?.hexes) continue;
        const room = saved as GameState;
        for (const player of room.players) {
          if (!player.isBot) { player.connected = false; player.status = 'DISCONNECTED_WAITING'; }
        }
        if (room.phase !== 'LOBBY' && room.phase !== 'GAME_OVER' && room.phase !== 'PAUSED_DISCONNECT') {
          room.turn.phaseBeforePause = room.phase;
          room.phase = 'PAUSED_DISCONNECT';
          room.turn.turnDeadlineMs = null;
        }
        super.set(code, room);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('[RoomStore] No se pudo leer la copia de las salas:', error);
    }
  }

  override set(code: string, room: GameState): this {
    super.set(code, room);
    this.scheduleSave();
    return this;
  }

  override delete(code: string): boolean {
    const deleted = super.delete(code);
    if (deleted) this.scheduleSave();
    return deleted;
  }

  private scheduleSave() {
    this.dirty = true;
    if (!this.pending) this.pending = setTimeout(() => this.flush(), 100);
    this.pending.unref();
  }

  flush(): void {
    if (this.pending) clearTimeout(this.pending);
    this.pending = undefined;
    if (!this.dirty) return;
    try {
      mkdirSync(dirname(this.filename), { recursive: true });
      const temporary = `${this.filename}.tmp`;
      writeFileSync(temporary, JSON.stringify({ version: 1, rooms: [...this] }));
      renameSync(temporary, this.filename);
      this.dirty = false;
    } catch (error) {
      console.error('[RoomStore] No se pudo guardar la copia de las salas:', error);
    }
  }
}
