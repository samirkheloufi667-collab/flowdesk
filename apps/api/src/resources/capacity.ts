/** Forme minimale d'une allocation : les lignes Prisma la satisfont directement. */
export interface Span {
  startDate: Date;
  endDate: Date;
  amount: number;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Charge maximale simultanée d'une ressource sur l'intervalle [from, to].
 *
 * Balayage d'événements : chaque allocation ajoute sa quantité à son début et
 * la retire le lendemain de sa fin. On parcourt les événements dans l'ordre et
 * on retient le maximum atteint. À date égale, les retraits passent avant les
 * ajouts, pour que deux allocations bout à bout ne comptent pas double.
 *
 * Complexité O(n log n), là où comparer chaque jour de l'intervalle serait
 * proportionnel à sa durée.
 */
export function peakLoad(spans: Span[], from: Date, to: Date): number {
  const events: Array<[time: number, delta: number]> = [];
  for (const span of spans) {
    const start = Math.max(startOfDay(span.startDate), startOfDay(from));
    const end = Math.min(startOfDay(span.endDate), startOfDay(to));
    if (start > end) continue;
    events.push([start, span.amount], [end + DAY, -span.amount]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let current = 0;
  let peak = 0;
  for (const [, delta] of events) {
    current += delta;
    peak = Math.max(peak, current);
  }
  return peak;
}

/** Charge à une date donnée : somme des allocations actives ce jour-là. */
export function loadAt(spans: Span[], day: Date): number {
  const t = startOfDay(day);
  return spans
    .filter((s) => startOfDay(s.startDate) <= t && t <= startOfDay(s.endDate))
    .reduce((sum, s) => sum + s.amount, 0);
}

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
