import { ResourceType, SeafarersBoardSize, SeafarersScenario, TerrainType } from '../types';
import { RawHexSpec, ScenarioBoardData, SEAFARERS_BOARDS_DATA, VariableHexGroup } from './seafarersBoardsData';

const key = (c: { q: number; r: number }) => `${c.q},${c.r}`;
const isLand = (h: RawHexSpec) => h.terrain !== 'SEA' && h.terrain !== 'FOG';
const adjacent = (a: RawHexSpec, b: RawHexSpec) =>
  Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.q + a.r - b.q - b.r)) === 1;
const isRed = (n: number | null) => n === 6 || n === 8;

export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Explicit house rule requested by the user; the PDF transcription stays intact. */
export function replaceDeserts(hexes: RawHexSpec[]): RawHexSpec[] {
  const copy = hexes.map(h => ({ ...h }));
  const resources: ResourceType[] = ['BRICK', 'ORE', 'WHEAT', 'SHEEP', 'WOOD'];
  const counts = new Map(resources.map(t => [t, copy.filter(h => h.terrain === t).length]));
  const numbers = [3, 4, 5, 9, 10, 11, 2, 12];
  const numberCounts = new Map(numbers.map(n => [n, copy.filter(h => h.num === n).length]));
  for (const hex of copy) {
    if (hex.terrain !== 'DESERT') continue;
    const resource = resources.reduce((best, t) => counts.get(t)! < counts.get(best)! ? t : best);
    const number = numbers.reduce((best, n) => numberCounts.get(n)! < numberCounts.get(best)! ? n : best);
    hex.terrain = resource;
    hex.num = number;
    counts.set(resource, counts.get(resource)! + 1);
    numberCounts.set(number, numberCounts.get(number)! + 1);
  }
  return copy;
}

function assignNumbers(group: RawHexSpec[], previous: RawHexSpec[], outside: RawHexSpec[], rule: VariableHexGroup, preventRed: boolean, random: () => number): boolean {
  const slots = group.filter(isLand);
  const pool = previous.flatMap(h => h.num === null ? [] : [h.num]);
  if (slots.length !== pool.length) throw new Error('El grupo de montaje debe conservar sus terrenos productivos y fichas.');
  const forbidden = new Map<string, Set<number>>();
  for (const restriction of rule.forbiddenNumbers || []) {
    for (const coord of restriction.coords) {
      const values = forbidden.get(key(coord)) || new Set<number>();
      restriction.numbers.forEach(n => values.add(n));
      forbidden.set(key(coord), values);
    }
  }
  const allowed = (h: RawHexSpec, n: number) =>
    !forbidden.get(key(h))?.has(n) && !(rule.forbidRedOnGold && h.terrain === 'GOLD' && isRed(n)) &&
    !(rule.forbidNumbersOnTerrains || []).some(restriction => restriction.terrains.includes(h.terrain) && restriction.numbers.includes(n));
  const prevent = rule.preventRedAdjacent ?? preventRed;
  const reds = shuffled(pool.filter(isRed), random);
  const nonReds = shuffled(pool.filter(n => !isRed(n)), random);
  const fixedReds = prevent ? outside.filter(h => isRed(h.num)) : [];
  const candidates = shuffled(slots.filter(h => allowed(h, 6) && allowed(h, 8) && !fixedReds.some(other => adjacent(h, other))), random);
  const chosen: RawHexSpec[] = [];
  let visits = 0;
  const chooseReds = (start: number): boolean => {
    if (++visits > 100000) return false;
    if (chosen.length === reds.length) return true;
    if (candidates.length - start < reds.length - chosen.length) return false;
    for (let i = start; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (prevent && chosen.some(h => adjacent(h, candidate))) continue;
      chosen.push(candidate);
      if (chooseReds(i + 1)) return true;
      chosen.pop();
    }
    return false;
  };
  if (!chooseReds(0)) return false;
  group.forEach(h => { h.num = null; });
  chosen.forEach((h, i) => { h.num = reds[i]; });
  const remaining = shuffled(slots.filter(h => !chosen.includes(h)), random);
  // Place the most constrained values first (e.g. 5/9 at the eastern tip).
  nonReds.sort((a, b) => remaining.filter(h => allowed(h, a)).length - remaining.filter(h => allowed(h, b)).length);
  for (const number of nonReds) {
    const index = remaining.findIndex(h => allowed(h, number));
    if (index < 0) return false;
    remaining.splice(index, 1)[0].num = number;
  }
  return true;
}

export function prepareScenarioHexes(data: ScenarioBoardData, randomize: boolean, preventRed: boolean, random: () => number = Math.random): RawHexSpec[] {
  let hexes = replaceDeserts(data.hexes);
  if (!randomize) return hexes;
  for (const rule of data.variableSetup.groups) {
    const positions = new Set(rule.coords.map(key));
    const original = hexes.filter(h => positions.has(key(h)));
    const outside = hexes.filter(h => !positions.has(key(h)));
    let assigned: RawHexSpec[] | undefined;
    for (let attempt = 0; attempt < 100 && !assigned; attempt++) {
      const terrains = rule.shuffleTerrains ? shuffled(original.map(h => h.terrain), random) : original.map(h => h.terrain);
      const candidate = original.map((h, i) => ({ ...h, terrain: terrains[i] }));
      if (!rule.shuffleNumbers || assignNumbers(candidate, original, outside, rule, preventRed, random)) assigned = candidate;
    }
    if (!assigned) throw new Error(`No se pudo obtener un montaje válido para ${data.scenarioId}.`);
    const changed = new Map(assigned.map(h => [key(h), h]));
    // Preserve ordering so topology/vertex IDs don't change when regenerating.
    hexes = hexes.map(h => changed.get(key(h)) || h);
  }
  return hexes;
}

/** Scenario 9 has an empty frame in the PDFs, not a prescribed archipelago. */
export function getSeafarersScenarioData(scenario: SeafarersScenario, size: SeafarersBoardSize): ScenarioBoardData {
  if (scenario !== 'NEW_WORLD' && scenario !== 'PROCEDURAL_ARCHIPELAGO') {
    const data = SEAFARERS_BOARDS_DATA[`${scenario}__${size}`];
    if (!data) throw new Error(`Escenario o modalidad de Navegantes desconocida: ${scenario}/${size}`);
    return data;
  }
  const large = size === '5_6P';
  const template = SEAFARERS_BOARDS_DATA[large ? 'WONDERS_OF_CATAN__5_6P' : 'HEADING_FOR_NEW_SHORES__4P'];
  const quantities: Array<[TerrainType, number]> = large
    ? [['SEA', 21], ['DESERT', 3], ['GOLD', 4], ['WHEAT', 7], ['BRICK', 7], ['ORE', 7], ['SHEEP', 7], ['WOOD', 7]]
    : [['SEA', 19], ['WHEAT', 5], ['BRICK', 4], ['ORE', 4], ['SHEEP', 5], ['WOOD', 5]];
  if (scenario === 'PROCEDURAL_ARCHIPELAGO' && !large) {
    quantities.find(([t]) => t === 'WHEAT')![1] -= 2;
    quantities.push(['GOLD', 2]);
  }
  const terrains = quantities.flatMap(([terrain, count]) => Array<TerrainType>(count).fill(terrain));
  const quantitiesOfNumbers = large ? [2, 3, 4, 5, 5, 5, 5, 4, 4, 2] : [1, 3, 3, 3, 2, 2, 3, 3, 2, 1];
  const tokens = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12].flatMap((number, i) => Array<number>(quantitiesOfNumbers[i]).fill(number));
  let tokenIndex = 0;
  const hexes = template.hexes.map((hex, i): RawHexSpec => ({
    q: hex.q, r: hex.r, terrain: terrains[i],
    num: terrains[i] === 'SEA' || terrains[i] === 'DESERT' ? null : tokens[tokenIndex++],
    isMainIsland: true,
  }));
  return {
    scenarioId: scenario, boardSize: size, title: 'Un nuevo mundo',
    source: { pdf: large ? '56' : 'base', pages: large ? [11] : [18, 19] },
    hexes, ports: [],
    variableSetup: {
      shufflePorts: true,
      groups: [{ coords: hexes.map(({ q, r }) => ({ q, r })), shuffleTerrains: true, shuffleNumbers: true, preventRedAdjacent: true, forbidRedOnGold: true }],
    },
  };
}

export function getVariableSetupDescription(scenario: SeafarersScenario, size: SeafarersBoardSize): string {
  switch (scenario) {
    case 'HEADING_FOR_NEW_SHORES':
      return 'Se barajan por separado terrenos y números de la isla principal y todos los hexágonos de las zonas oscuras de los islotes, incluido su mar. Se mantienen el marco y las posiciones de los puertos; se mezclan sus tipos. Los números rojos no quedan juntos.';
    case 'THE_FOUR_ISLANDS':
      return 'Se mantienen las siluetas de las islas. Cambian sus terrenos, números y tipos de puerto, procurando que bosques y pastos reciban números útiles.';
    case 'OCEANIA':
      return 'Solo cambian terrenos, números y tipos de puerto de las islas conocidas, conservando su silueta. Los espacios y el inventario de descubrimiento se conservan. Aquí se permiten números rojos contiguos.';
    case 'THROUGH_THE_DESERT':
      return `Cambian por separado terrenos y números de la isla principal y de las tierras exteriores. ${size === '5_6P' ? 'La zona exterior incluye los cuatro hexágonos de mar delimitados en el PDF. ' : ''}Se mezclan los tipos de puerto. La franja que sustituye a los desiertos queda fija; no hay rojos juntos ni sobre oro.`;
    case 'THE_FORGOTTEN_TRIBE':
      return 'Solo cambian terrenos y números de la isla principal. Los tres terrenos del extremo derecho no reciben 5, 6, 8 ni 9. Los islotes y sus regalos y puertos permanecen fijos.';
    case 'CLOTH_FOR_CATAN':
      return 'Solo cambian terrenos y números de las dos islas principales. Los puertos, los islotes centrales y los números y posiciones de las aldeas permanecen fijos.';
    case 'THE_PIRATE_ISLANDS':
      return 'Solo se mezclan los tipos de puerto. Terrenos, números, costas, fortalezas y recorrido de la flota permanecen fijos.';
    case 'WONDERS_OF_CATAN':
      return 'Solo cambian terrenos y números de la isla principal, manteniendo su silueta. Junto a la franja que sustituye a los desiertos no se colocan 6 ni 8. Puertos, islotes y marcadores permanecen fijos.';
    default:
      return 'Se mezclan todos los hexágonos de tierra y mar dentro del marco, sus números y los puertos. No hay 6 ni 8 contiguos ni sobre oro. El PDF deja libre la forma de las islas.';
  }
}
