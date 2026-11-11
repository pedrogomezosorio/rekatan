import React, { useState } from 'react';
import { BRANCH_META, CK_BRANCHES } from '../../shared/citiesKnightsConfig';
import { ResourceIcon } from '../UI/ResourceIcon';

/** The rules and components are visible before creating an in-game state. */
export function CitiesKnightsOverview({
  extended = false,
}: {
  extended?: boolean;
}) {
  const [active, setActive] = useState(true);
  return (
    <section
      className="rounded-2xl border border-emerald-700/50 bg-emerald-950/20 p-3 sm:p-4 space-y-3"
      aria-label="Componentes y reglas de Ciudades y Caballeros"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-emerald-100">
          Ciudades y Caballeros · {extended ? '5–6' : '3–4'} jugadores
        </h3>
        <span className="text-xs font-bold text-amber-300 whitespace-nowrap">
          13 PV
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(['PAPER', 'CLOTH', 'COIN'] as const).map((r, i) => (
          <div key={r} className="rounded-xl bg-stone-950/65 p-2 text-center">
            <ResourceIcon resource={r} size={28} className="mx-auto" />
            <p className="text-xs font-bold mt-1">
              {['Papel', 'Tela', 'Moneda'][i]}
            </p>
            <p className="text-[11px] text-stone-400">
              {extended ? 18 : 12} cartas
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-stone-300 leading-relaxed">
        Tus ciudades producen mercancías, mejoras tres ramas hasta nivel 5 y
        preparas caballeros contra la invasión bárbara. Empiezas con un poblado
        y una ciudad.
      </p>
      <details className="text-xs text-stone-300">
        <summary className="cursor-pointer min-h-10 flex items-center text-emerald-200 font-semibold">
          Ver caballeros, murallas y reglas de esta modalidad
        </summary>
        <div className="pt-2 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <strong>6 caballeros por jugador</strong>
            <button
              type="button"
              className="rounded-lg border border-stone-600 px-3 py-2 min-h-10"
              aria-pressed={active}
              onClick={() => setActive((v) => !v)}
            >
              {active ? 'Ver inactivos' : 'Ver activos'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((rank, i) => (
              <div key={rank} className="text-center">
                <img
                  src={`/assets/cities-knights/knights/red_${rank}_${active ? 'active' : 'inactive'}.svg`}
                  className="h-12 w-12 mx-auto"
                  alt={`Caballero ${['simple', 'fuerte', 'poderoso'][i]}, fuerza ${rank}, ${active ? 'activo' : 'inactivo'}`}
                />
                <p className="font-semibold mt-1">
                  {['Simple', 'Fuerte', 'Poderoso'][i]}
                </p>
                <p className="text-stone-400">2 piezas · fuerza {rank}</p>
              </div>
            ))}
          </div>
          <p>
            Reclutar o ascender cuesta 1 oveja + 1 mineral. Activar cuesta 1
            trigo. El rango 3 requiere Fortaleza. Un caballero recién activado
            defiende de inmediato, pero actúa a partir de un turno posterior.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-stone-950/60 p-3">
              <img
                src="/assets/cities-knights/walls/red.svg"
                alt="Muralla de ciudad"
                className="h-10 w-12 float-left mr-2"
              />
              <strong>3 murallas por jugador</strong>
              <p className="mt-1">
                Cada una cuesta 2 arcillas y protege 2 cartas adicionales frente
                al siete.
              </p>
            </div>
            <div className="rounded-xl bg-stone-950/60 p-3">
              <img
                src="/assets/cities-knights/barbarians/barbarian_ship.svg"
                alt="Flota bárbara"
                className="h-10 w-10 float-left mr-2"
              />
              <strong>El tercer dado trae los bárbaros</strong>
              <p className="mt-1">
                El barco avanza hasta el asalto. Compara la fuerza activa con el
                número de ciudades.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {CK_BRANCHES.map((b) => (
              <div key={b} className="flex gap-2 items-start">
                <span
                  className="w-2 h-2 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: BRANCH_META[b].color }}
                />
                <p>
                  <strong>{BRANCH_META[b].name}, niveles 1–5:</strong>{' '}
                  {b === 'SCIENCE'
                    ? 'papel; Acueducto en el nivel 3.'
                    : b === 'POLITICS'
                      ? 'monedas; Fortaleza en el nivel 3.'
                      : 'tela; mercancías a 2:1 en el nivel 3.'}{' '}
                  Metrópolis desde el nivel 4 (+2 PV).
                </p>
              </div>
            ))}
          </div>
          <p>
            54 cartas de progreso en tres mazos. Sustituyen al desarrollo y al
            Gran Ejército. El ladrón espera al primer ataque bárbaro.
          </p>
          {extended && (
            <p className="rounded-xl border border-amber-600/40 bg-amber-950/35 p-3 text-amber-100">
              <strong>Construcción especial:</strong> después de cada turno, los
              demás pueden construir, reclutar, activar, ascender y mejorar
              ciudades. No pueden comerciar, jugar progreso ni mover caballeros.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
