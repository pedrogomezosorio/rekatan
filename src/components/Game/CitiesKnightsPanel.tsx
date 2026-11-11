import React, { useEffect, useState } from 'react';
import { ALL_RESOURCES, ALL_TRADE_CARDS, PLAYER_COLORS, RESOURCE_META, createEmptyResources } from '../../shared/constants';
import { BRANCH_META, CK_BRANCHES, COMMODITIES, PROGRESS_CARDS, cardCount, safeHandLimit } from '../../shared/citiesKnightsConfig';
import { knightRecruitVertices, knightReachableVertices } from '../../shared/engine/CitiesAndKnights';
import type { CardBundle, GameAction, GameState, ImprovementBranch, PlayerState, ResourceType, TradeCardType } from '../../shared/types';
import type { ProgressPayload } from '../../shared/citiesKnightsTypes';
import { ResourceIcon } from '../UI/ResourceIcon';

const field = 'w-full rounded-lg bg-stone-950 border border-stone-600 px-2 py-2 text-xs text-stone-100';
const button = 'rounded-lg border border-amber-500/50 bg-amber-900/40 px-3 py-2 text-xs text-amber-100 disabled:opacity-40 hover:bg-amber-800/50';
type Props = { gameState: GameState; playerId: string; dispatchAction: (action: GameAction) => void; onHighlightVertex: (id: string | null) => void };

function location(s: GameState, id: string): string {
  const v = s.board.vertices[id]; if (!v) return '';
  return v.hexIds.map(hid => { const h = s.board.hexes[hid]; return h ? `${h.terrain === 'SEA' ? 'Mar' : h.terrain === 'GOLD' ? 'Oro' : h.terrain === 'DESERT' ? 'Desierto' : h.terrain === 'FOG' ? 'Niebla' : RESOURCE_META[h.terrain].terrainName} ${h.numberToken || ''}` : ''; }).filter(Boolean).join(' / ');
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: { id: string; name: string }[]; onChange: (id: string) => void }) {
  return <label className="block space-y-1 text-xs text-stone-300"><span>{label}</span><select aria-label={label} className={field} value={value} onChange={e => onChange(e.target.value)}><option value="">Selecciona…</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>;
}
function HandSelection({ hand, value, onChange, commoditiesOnly = false }: { hand: CardBundle; value: CardBundle; onChange: (cards: CardBundle) => void; commoditiesOnly?: boolean }) {
  return <div className="grid grid-cols-4 gap-2">{(commoditiesOnly ? COMMODITIES : ALL_TRADE_CARDS).map(r => <label key={r} className="text-xs text-center"><span className="flex justify-center"><ResourceIcon resource={r} size={24}/></span>{RESOURCE_META[r].name} ({hand[r] || 0})<input className={field} aria-label={`Cantidad de ${RESOURCE_META[r].name}`} type="number" min={0} max={hand[r] || 0} value={value[r] || 0} onChange={e => onChange({ ...value, [r]: Math.max(0, Math.min(hand[r] || 0, Number(e.target.value))) })}/></label>)}</div>;
}

export function CitiesKnightsPanel({ gameState: s, playerId, dispatchAction, onHighlightVertex }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'KNIGHTS' | 'CITIES' | 'PROGRESS'>('KNIGHTS');
  const [vertex, setVertex] = useState(''); const [destination, setDestination] = useState('');
  const [branch, setBranch] = useState<ImprovementBranch>('SCIENCE');
  const [selectedCard, setSelectedCard] = useState(''); const [payload, setPayload] = useState<ProgressPayload>({});
  const [gift, setGift] = useState<CardBundle>(createEmptyResources);
  const [choiceVertex, setChoiceVertex] = useState(''); const [choiceCard, setChoiceCard] = useState('');
  const [choiceResource, setChoiceResource] = useState<ResourceType>('WOOD');
  const ck = s.citiesKnights; const me = s.players.find(p => p.id === playerId);
  const choice = ck?.choices[0];
  useEffect(() => { setGift(createEmptyResources()); setChoiceVertex(''); setChoiceCard(''); }, [choice?.kind, choice?.playerId, s.turn.turnNumber]);
  useEffect(() => () => onHighlightVertex(null), [onHighlightVertex]);
  useEffect(() => { const show = () => { setOpen(true); setTab('PROGRESS'); }; window.addEventListener('open-cities-knights', show); return () => window.removeEventListener('open-cities-knights', show); }, []);
  if (!ck || !me?.citiesKnights) return null;
  const mine = me.citiesKnights; const vs = Object.values(s.board.vertices);
  const ownKnights = vs.filter(v => v.knight?.playerId === me.id);
  const ownCities = vs.filter(v => v.playerId === me.id && v.building === 'CITY');
  const buildAllowed = !s.turn.isPausedByHost && s.turn.activePlayerId === me.id && ['MAIN_PHASE', 'SPECIAL_BUILD_PHASE'].includes(s.phase);
  const actionAllowed = buildAllowed && s.phase === 'MAIN_PHASE';
  const card = mine.progressCards.find(c => c.id === selectedCard);
  const target = s.players.find(p => p.id === payload.targetPlayerId);
  const chooseVertex = (id: string) => { setVertex(id); onHighlightVertex(id || null); };
  const vertexOptions = (ids: string[]) => ids.map((id, index) => ({ id, name: `${index + 1}. ${location(s, id)}` }));
  const hexOptions = Object.values(s.board.hexes).filter(h => h.terrain !== 'SEA' && h.terrain !== 'FOG').map(h => ({ id: h.id, name: `${h.terrain === 'GOLD' ? 'Oro' : h.terrain === 'DESERT' ? 'Desierto' : RESOURCE_META[h.terrain as ResourceType].terrainName} ${h.numberToken || ''} (${h.center.x < 0 ? 'oeste' : 'este'}, ${h.center.y < 0 ? 'norte' : 'sur'})` }));
  const rivalOptions = s.players.filter(p => p.id !== me.id).map(p => ({ id: p.id, name: `${p.name} · ${p.publicVictoryPoints} PV` }));
  const resourceOptions = (resources: TradeCardType[]) => resources.map(r => ({ id: r, name: RESOURCE_META[r].name }));
  const setData = (data: Partial<ProgressPayload>) => setPayload(p => ({ ...p, ...data }));
  const totalCities = vs.filter(v => v.building === 'CITY').length;
  const defense = vs.reduce((n, v) => n + (v.knight?.active ? v.knight.rank : 0), 0);
  const neededVertex = card && ['ENGINEER', 'INTRIGUE'].includes(card.type);
  const neededRival = card && ['DESERTER', 'SPY', 'MASTER_MERCHANT'].includes(card.type);
  const neededHex = card && ['MERCHANT', 'BISHOP'].includes(card.type);
  const neededResource = card && ['MERCHANT_FLEET', 'COMMODITY_MONOPOLY', 'RESOURCE_MONOPOLY'].includes(card.type);

  return <>
    <div className="absolute top-3 left-3 z-30 w-60 rounded-2xl border border-amber-600/50 bg-stone-950/95 p-3 shadow-xl text-stone-100 pointer-events-auto">
      <button className="flex justify-between w-full text-xs font-bold" onClick={() => setOpen(true)}><span>⚔ Ciudades y Caballeros</span><span>＋</span></button>
      <div className="mt-2 flex items-center gap-1" aria-label={`Bárbaros: ${ck.barbarianPosition} de 7`}>{Array.from({ length: 8 }, (_, i) => <span key={i} className={`flex h-6 w-6 items-center justify-center rounded text-xs ${i === ck.barbarianPosition ? 'bg-red-800 border border-red-300' : 'bg-stone-800 text-stone-400'}`}>{i === ck.barbarianPosition ? '⛵' : i}</span>)}</div>
      <p className="mt-1 text-[11px]">Defensa {defense} · Ciudades {totalCities} · Mano segura {safeHandLimit(s, me.id)}</p>
      <div className="flex gap-2 mt-2">{CK_BRANCHES.map(b => <span key={b} style={{ color: BRANCH_META[b].color }} className="text-xs font-bold">{BRANCH_META[b].name} {mine.improvements[b]}</span>)}</div>
      {ck.eventDie && <div className="flex items-center gap-2 mt-2 text-xs"><img alt="Dado de evento" className="h-8 w-8" src={`/assets/cities-knights/events/${ck.eventDie === 'BARBARIAN' ? 'barbarian' : ck.eventDie.toLowerCase()}.svg`}/><span>{s.turn.diceRoll && <><strong className="text-red-400">{s.turn.diceRoll[0]}</strong> + <strong>{s.turn.diceRoll[1]}</strong> · </>}{ck.eventDie === 'BARBARIAN' ? 'Avance bárbaro' : BRANCH_META[ck.eventDie].name}</span></div>}
      {choice && <p className="text-xs text-amber-200 mt-2">Decisión pendiente: {s.players.find(p => p.id === choice.playerId)?.name}</p>}
      {s.phase === 'SPECIAL_BUILD_PHASE' && s.turn.activePlayerId === me.id && <button className={`${button} w-full mt-2`} onClick={() => dispatchAction({ type: 'END_SPECIAL_BUILD' })}>Terminar construcción especial</button>}
    </div>

    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Ciudades y Caballeros"><div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-stone-900 border border-amber-700 rounded-2xl p-5 space-y-4 text-stone-100">
      <div className="flex justify-between items-center"><h2 className="font-bold text-xl">Ciudades y Caballeros</h2><button className={button} onClick={() => { setOpen(false); onHighlightVertex(null); }}>Cerrar</button></div>
      <div className="flex gap-2">{(['KNIGHTS', 'CITIES', 'PROGRESS'] as const).map(t => <button key={t} className={`${button} ${tab === t ? 'ring-1 ring-amber-300' : ''}`} onClick={() => setTab(t)}>{t === 'KNIGHTS' ? 'Caballeros' : t === 'CITIES' ? 'Mejoras y murallas' : `Progreso (${mine.progressCards.length}/4)`}</button>)}</div>
      {tab === 'KNIGHTS' && <div className="space-y-3">
        <p className="text-sm text-stone-300">Reclutar o ascender: 1 oveja + 1 mineral. Activar: 1 trigo. Dos piezas de cada rango. Un caballero activado durante este turno ya defiende, pero actuará a partir de un turno posterior.</p>
        <Select label="Reclutar en un cruce libre" value={vertex} options={vertexOptions(knightRecruitVertices(s, me.id))} onChange={chooseVertex}/>
        <button className={button} disabled={!buildAllowed || !vertex} onClick={() => dispatchAction({ type: 'RECRUIT_KNIGHT', vertexId: vertex })}>Reclutar caballero básico</button>
        <Select label="Caballero propio" value={ownKnights.some(v => v.id === vertex) ? vertex : ''} options={ownKnights.map(v => ({ id: v.id, name: `Fuerza ${v.knight!.rank} · ${v.knight!.active ? 'Activo' : 'Inactivo'} · ${location(s, v.id)}` }))} onChange={chooseVertex}/>
        <div className="flex flex-wrap gap-2"><button className={button} disabled={!buildAllowed} onClick={() => dispatchAction({ type: 'ACTIVATE_KNIGHT', vertexId: vertex })}>Activar</button><button className={button} disabled={!buildAllowed} onClick={() => dispatchAction({ type: 'PROMOTE_KNIGHT', vertexId: vertex })}>Ascender</button><button className={button} disabled={!actionAllowed} onClick={() => dispatchAction({ type: 'EXPEL_ROBBER', vertexId: vertex })}>Expulsar ladrón</button>{s.board.pirateHexId && <button className={button} disabled={!actionAllowed} onClick={() => dispatchAction({ type: 'EXPEL_ROBBER', vertexId: vertex, mode: 'PIRATE' })}>Expulsar pirata</button>}</div>
        <Select label="Destino o caballero rival que desplazar" value={destination} options={vertexOptions(vertex ? knightReachableVertices(s, me.id, vertex) : [])} onChange={id => { setDestination(id); onHighlightVertex(id || null); }}/>
        <button className={button} disabled={!actionAllowed || !destination} onClick={() => dispatchAction({ type: 'MOVE_KNIGHT', fromVertexId: vertex, toVertexId: destination })}>Mover / desplazar</button>
        <div className="border-t border-stone-700 pt-3 space-y-1">{s.players.map(p => <p key={p.id} style={{ color: PLAYER_COLORS[p.color].primary }} className="text-xs">{p.name}: defensa {vs.reduce((n, v) => n + (v.knight?.playerId === p.id && v.knight.active ? v.knight.rank : 0), 0)} · Campeador {p.citiesKnights?.defenderPoints || 0} PV</p>)}</div>
      </div>}
      {tab === 'CITIES' && <div className="space-y-4">
        <Select label="Ciudad para muralla o metrópolis" value={vertex} options={vertexOptions(ownCities.map(v => v.id))} onChange={chooseVertex}/>
        <button className={button} disabled={!buildAllowed || !vertex} onClick={() => dispatchAction({ type: 'BUILD_CITY_WALL', vertexId: vertex })}>Construir muralla · 2 arcillas (+2 cartas seguras)</button>
        {CK_BRANCHES.map(b => { const meta = BRANCH_META[b]; const level = mine.improvements[b]; return <div key={b} className="rounded-xl border p-3 space-y-2" style={{ borderColor: meta.color }}><div className="flex justify-between"><strong style={{ color: meta.color }}>{meta.name} · nivel {level}/5</strong><span className="text-xs">{meta.commodity === 'PAPER' ? 'Papel' : meta.commodity === 'COIN' ? 'Moneda' : 'Tela'}: {me.resources[meta.commodity] || 0}</span></div><div className="flex gap-1">{meta.levels.map((name, i) => <span key={name} title={name} className={`flex-1 p-1 text-center rounded text-xs ${i < level ? 'bg-stone-600 text-white' : 'bg-stone-950 text-stone-500'}`}>{i + 1}</span>)}</div><p className="text-xs text-stone-300">{b === 'SCIENCE' ? 'Nivel 3: Acueducto, un recurso si no produces (salvo 7).' : b === 'POLITICS' ? 'Nivel 3: Fortaleza, caballeros de fuerza 3.' : 'Nivel 3: todas las mercancías a 2:1.'}</p><p className="text-xs">Metrópolis: {s.players.find(p => p.id === ck.metropolisOwners[b])?.name || 'sin propietario'}. Dado rojo: {level ? `1–${level + 1}` : 'sin cobertura'}.</p><button className={button} disabled={!buildAllowed || level === 5} onClick={() => dispatchAction({ type: 'IMPROVE_CITY', branch: b, vertexId: vertex || undefined })}>{level < 5 ? `Comprar ${meta.levels[level]} · ${level + 1 - (ck.turnEffects?.crane ? 1 : 0)} ${RESOURCE_META[meta.commodity].name}` : 'Rama completada'}</button></div>; })}
      </div>}
      {tab === 'PROGRESS' && <div className="space-y-3">
        <div className="flex gap-2">{CK_BRANCHES.map(b => <div key={b} className="flex-1 text-center text-xs"><img className="h-20 mx-auto" src={`/assets/cities-knights/progress/${b.toLowerCase()}_back.svg`} alt={`Mazo de ${BRANCH_META[b].name}`}/>{ck.decks[b].length} cartas</div>)}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{mine.progressCards.map(c => <button key={c.id} onClick={() => { setSelectedCard(c.id); setPayload({}); }} className={`rounded-lg p-2 border text-xs text-left ${selectedCard === c.id ? 'border-amber-300 bg-amber-950' : 'border-stone-700'}`}><img className="h-24 mx-auto" src={`/assets/cities-knights/progress/${c.type.toLowerCase()}.svg`} alt=""/><strong>{PROGRESS_CARDS[c.type].name}</strong></button>)}</div>
        {!mine.progressCards.length && <p className="text-sm text-stone-400">Recibirás progreso mediante el dado de evento y las mejoras de tus ciudades.</p>}
        {card && <div className="space-y-3 border border-stone-700 rounded-xl p-3"><strong>{PROGRESS_CARDS[card.type].name}</strong><p className="text-sm">{PROGRESS_CARDS[card.type].description}</p>
          {neededRival && <Select label="Jugador objetivo" value={payload.targetPlayerId || ''} options={rivalOptions} onChange={targetPlayerId => setData({ targetPlayerId })}/>}
          {neededVertex && <Select label="Cruce objetivo" value={payload.vertexId || ''} options={vertexOptions(vs.filter(v => card.type === 'ENGINEER' ? v.playerId === me.id && v.building === 'CITY' && !v.cityWall : v.knight && v.knight.playerId !== me.id).map(v => v.id))} onChange={vertexId => { setData({ vertexId }); onHighlightVertex(vertexId); }}/>}
          {neededHex && <Select label="Terreno objetivo" value={payload.hexId || ''} options={hexOptions} onChange={hexId => setData({ hexId })}/>}
          {neededResource && <Select label="Tipo de carta" value={payload.resource || ''} options={resourceOptions(card.type === 'COMMODITY_MONOPOLY' ? COMMODITIES : card.type === 'RESOURCE_MONOPOLY' ? ALL_RESOURCES : ALL_TRADE_CARDS)} onChange={resource => setData({ resource: resource as TradeCardType })}/>}
          {card.type === 'ALCHEMIST' && <div className="flex gap-3">{[0, 1].map(i => <label key={i} className="text-xs">{i === 0 ? 'Dado rojo' : 'Dado blanco'}<input className={field} type="number" min={1} max={6} value={payload.dice?.[i] || 1} onChange={e => { const dice: [number, number] = [...(payload.dice || [1, 1])]; dice[i] = Number(e.target.value); setData({ dice }); }}/></label>)}</div>}
          {card.type === 'SMITH' && <div className="space-y-2">{ownKnights.map(v => <label key={v.id} className="block text-xs"><input type="checkbox" checked={payload.vertexIds?.includes(v.id) || false} onChange={e => setData({ vertexIds: e.target.checked ? [...(payload.vertexIds || []), v.id] : payload.vertexIds?.filter(id => id !== v.id) })}/> Fuerza {v.knight!.rank} · {location(s, v.id)}</label>)}</div>}
          {card.type === 'INVENTOR' && [0, 1].map(i => <Select key={i} label={`Terreno ${i + 1}`} value={payload.hexIds?.[i] || ''} options={hexOptions} onChange={hexId => { const ids = [...(payload.hexIds || ['', ''])]; ids[i] = hexId; setData({ hexIds: ids }); }}/>) }
          {card.type === 'DIPLOMAT' && <><Select label="Carretera o barco a retirar" value={payload.edgeId || ''} options={Object.values(s.board.edges).filter(e => e.building).map((e, i) => ({ id: e.id, name: `${i + 1}. ${s.players.find(p => p.id === e.playerId)?.name}: ${location(s, e.vertexIds[0])}` }))} onChange={edgeId => setData({ edgeId })}/><Select label="Destino opcional de tu pieza" value={payload.toEdgeId || ''} options={Object.values(s.board.edges).filter(e => !e.building).map((e, i) => ({ id: e.id, name: `${i + 1}. ${location(s, e.vertexIds[0])}` }))} onChange={toEdgeId => setData({ toEdgeId })}/></>}
          {card.type === 'SPY' && target && <Select label="Carta que robar" value={payload.targetCardId || ''} options={(target.citiesKnights?.progressCards || []).map(c => ({ id: c.id, name: PROGRESS_CARDS[c.type].name }))} onChange={targetCardId => setData({ targetCardId })}/>}
          {card.type === 'MASTER_MERCHANT' && target && <HandSelection hand={target.resources} value={payload.resources || createEmptyResources()} onChange={resources => setData({ resources })}/>}
          <button className={button} disabled={s.turn.isPausedByHost || !(card.type === 'ALCHEMIST' ? s.phase === 'WAITING_FOR_DICE' && s.turn.activePlayerId === me.id : actionAllowed)} onClick={() => dispatchAction({ type: 'PLAY_PROGRESS_CARD', cardId: card.id, payload: card.type === 'ALCHEMIST' ? { ...payload, dice: payload.dice || [1, 1] } : payload })}>Jugar carta</button>
        </div>}
        {!!ck.turnEffects?.harborPartners?.length && <div className="space-y-2 border-t border-stone-600 pt-2"><p className="text-xs">Puerto de mercancías: ofrece un recurso a cada rival.</p><Select label="Rival para puerto de mercancías" value={payload.targetPlayerId || ''} options={rivalOptions.filter(o => ck.turnEffects?.harborPartners?.includes(o.id))} onChange={targetPlayerId => setData({ targetPlayerId })}/><Select label="Recurso que ofrecer" value={payload.resource || ''} options={resourceOptions(ALL_RESOURCES)} onChange={resource => setData({ resource: resource as ResourceType })}/><button className={button} disabled={!actionAllowed || !payload.targetPlayerId || !payload.resource} onClick={() => dispatchAction({ type: 'COMMERCIAL_HARBOR_TRADE', targetPlayerId: payload.targetPlayerId!, resource: payload.resource as ResourceType })}>Ofrecer recurso</button></div>}
      </div>}
    </div></div>}

    {choice?.playerId === me.id && s.phase === 'CK_CHOICE' && !s.turn.isPausedByHost && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Decisión de Ciudades y Caballeros"><div className="max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl bg-stone-900 border border-amber-500 p-5 text-stone-100 space-y-4"><h2 className="font-bold text-lg">{choice.kind === 'CITY_LOSS' ? 'Los bárbaros saquean una ciudad' : choice.kind === 'AQUEDUCT' ? 'Acueducto: elige un recurso' : choice.kind === 'DEFENDER_CARD' ? 'Defensa empatada: elige un mazo' : choice.kind === 'PROGRESS_DISCARD' ? 'Devuelve progreso hasta tener cuatro cartas' : choice.kind === 'GIFT' ? `Entrega ${choice.amount} carta(s) a ${s.players.find(p => p.id === choice.beneficiaryId)?.name}` : choice.kind === 'RETREAT' ? 'Elige la retirada de tu caballero' : choice.kind === 'DESERTER' ? 'Desertor: elige un caballero para retirar' : 'Coloca el caballero recibido'}</h2>
      {['CITY_LOSS', 'RETREAT', 'DESERTER', 'DESERTER_PLACE'].includes(choice.kind) && <Select label="Cruce elegido" value={choiceVertex} options={vertexOptions(choice.kind === 'CITY_LOSS' ? ownCities.filter(v => !v.metropolis).map(v => v.id) : choice.kind === 'RETREAT' ? choice.vertexIds : choice.kind === 'DESERTER' ? ownKnights.map(v => v.id) : knightRecruitVertices(s, me.id))} onChange={id => { setChoiceVertex(id); onHighlightVertex(id); }}/>}
      {choice.kind === 'DEFENDER_CARD' && <Select label="Mazo elegido" value={branch} options={CK_BRANCHES.map(b => ({ id: b, name: BRANCH_META[b].name }))} onChange={b => setBranch(b as ImprovementBranch)}/>}
      {choice.kind === 'AQUEDUCT' && <Select label="Recurso del acueducto" value={choiceResource} options={resourceOptions(ALL_RESOURCES.filter(r => s.bank[r] > 0))} onChange={r => setChoiceResource(r as ResourceType)}/>}
      {choice.kind === 'PROGRESS_DISCARD' && <Select label="Carta a devolver" value={choiceCard} options={mine.progressCards.map(c => ({ id: c.id, name: PROGRESS_CARDS[c.type].name }))} onChange={setChoiceCard}/>}
      {choice.kind === 'GIFT' && <><HandSelection hand={me.resources} value={gift} onChange={setGift} commoditiesOnly={choice.commodityOnly}/><p className="text-xs">Seleccionadas: {cardCount(gift)} / {choice.amount}</p></>}
      <button className={button} onClick={() => dispatchAction({ type: 'RESOLVE_CK_CHOICE', vertexId: choiceVertex || undefined, branch, resource: choiceResource, cardId: choiceCard || undefined, resources: gift })}>Confirmar elección</button>
    </div></div>}
  </>;
}
