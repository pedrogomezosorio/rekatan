import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ALL_RESOURCES, getAvailableWonders, getWonderStageCost, RESOURCE_META, WONDERS_CATALOG } from '../../shared/constants';
import { canBuildWonderStage, canStartWonder } from '../../shared/engine/RulesEngine';
import { GameAction, GameState } from '../../shared/types';
import { ResourceIcon } from '../UI/ResourceIcon';

export const OriginalWonderCards: React.FC = () => (
  <div className="space-y-2" aria-label="Cartas originales de las maravillas">
    <p className="text-xs font-bold text-amber-200">Cartas originales de la ampliación 5/6</p>
    <div className="grid grid-cols-2 gap-3">
      {Object.values(WONDERS_CATALOG).filter(w => w.cardImage).map(w => (
        <img key={w.id} src={w.cardImage} alt={`Carta original: ${w.name}`} width={184} height={286}
          className="w-full max-w-[184px] justify-self-center rounded border border-sky-200/30" draggable={false} />
      ))}
    </div>
  </div>
);

export const WondersModal: React.FC<{
  gameState: GameState;
  playerId: string;
  dispatchAction: (action: GameAction) => void;
  onClose: () => void;
}> = ({ gameState, playerId, dispatchAction, onClose }) => {
  useEffect(() => {
    if (gameState.phase === 'GAME_OVER') onClose();
  }, [gameState.phase, onClose]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);
  const me = gameState.players.find(p => p.id === playerId);
  const size = gameState.board.seafarersBoardSize || gameState.config.seafarersBoardSize || '4P';
  const wonders = getAvailableWonders(size);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Maravillas de Catán"
        className="w-full max-w-6xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-amber-500/50 bg-slate-950 p-5 text-slate-100 shadow-2xl">
        <header className="flex items-start justify-between gap-4 mb-5">
          <div><h2 className="text-xl font-bold text-amber-200">Maravillas de Catán</h2>
            <p className="text-xs text-slate-400 mt-1">{wonders.length} maravillas disponibles. Cada carta tiene cuatro fases de construcción.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar maravillas" className="p-2 rounded hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {wonders.map(wonder => {
            const progress = gameState.board.wondersState?.[wonder.id];
            const mine = me?.activeWonderId === wonder.id;
            const owner = gameState.players.find(p => p.id === progress?.claimedByPlayerId);
            const permission = mine ? canBuildWonderStage(gameState, playerId) : canStartWonder(gameState, playerId, wonder.id);
            const cost = getWonderStageCost(wonder.id);
            const name = wonder.id === 'GREAT_BRIDGE' && size === '5_6P' ? 'Gran Puente del sur' : wonder.name;
            return (
              <article key={wonder.id} className={`rounded-xl border p-3 flex flex-col gap-3 ${mine ? 'border-amber-400 bg-amber-950/20' : 'border-slate-700 bg-slate-900'}`}>
                <h3 className="font-bold text-sm text-amber-100">{name}</h3>
                {wonder.cardImage ? (
                  <img src={wonder.cardImage} alt={`Carta original: ${wonder.name}`} width={184} height={286} draggable={false}
                    className="w-[184px] max-w-full self-center rounded" />
                ) : (
                  <div className="h-[286px] flex flex-col items-center justify-center gap-4 p-3 rounded border border-amber-500/20 bg-slate-950 text-center">
                    <span className="text-6xl" aria-hidden="true">{wonder.icon}</span>
                    <p className="text-sm text-slate-300">{wonder.description}</p>
                  </div>
                )}
                <p className="text-xs text-slate-300">{wonder.prerequisiteDescription}</p>
                <div className="mt-auto space-y-3">
                  <div><p className="text-[11px] text-slate-400 mb-1">Coste por fase</p>
                    <div className="flex flex-wrap gap-3">{ALL_RESOURCES.filter(r => cost[r] > 0).map(r => (
                      <span key={r} className="flex items-center gap-1 text-xs" title={`${cost[r]} ${RESOURCE_META[r].name}`}>
                        <ResourceIcon resource={r} className="w-5 h-5" /><strong>{cost[r]}</strong>
                      </span>
                    ))}</div>
                  </div>
                  <div className="flex items-center gap-1" aria-label={`${progress?.stage || 0} de 4 fases construidas`}>
                    {[1, 2, 3, 4].map(stage => <span key={stage} className={`flex-1 text-center rounded py-1 text-xs font-bold ${(progress?.stage || 0) >= stage ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{stage}</span>)}
                  </div>
                  {owner && <p className="text-xs text-sky-300">{owner.name} · fase {progress?.stage || 0}/4</p>}
                  <button type="button" disabled={!permission.allowed} title={permission.reason}
                    onClick={() => dispatchAction(mine ? { type: 'BUILD_WONDER_STAGE' } : { type: 'START_WONDER', wonderId: wonder.id })}
                    className="w-full rounded-lg px-3 py-2 text-xs font-bold bg-amber-400 text-slate-950 enabled:hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed">
                    {mine ? (progress?.stage === 4 ? 'Completada' : 'Construir siguiente fase') : owner ? 'Reclamada' : 'Elegir maravilla'}
                  </button>
                  {!permission.allowed && !owner && <p className="text-[11px] text-slate-400">{permission.reason}</p>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
