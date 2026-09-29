import { loadAt, peakLoad, Span } from './capacity';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const span = (start: string, end: string, amount: number): Span => ({
  startDate: d(start),
  endDate: d(end),
  amount,
});

describe('peakLoad', () => {
  it('additionne deux allocations qui se chevauchent', () => {
    const spans = [span('2026-10-01', '2026-10-10', 20), span('2026-10-05', '2026-10-15', 15)];
    expect(peakLoad(spans, d('2026-10-01'), d('2026-10-31'))).toBe(35);
  });

  it('ne compte pas double deux allocations bout à bout', () => {
    const spans = [span('2026-10-01', '2026-10-10', 30), span('2026-10-11', '2026-10-20', 30)];
    expect(peakLoad(spans, d('2026-10-01'), d('2026-10-31'))).toBe(30);
  });

  it('ignore ce qui sort de la période étudiée', () => {
    const spans = [span('2026-09-01', '2026-09-30', 40), span('2026-10-05', '2026-10-06', 10)];
    expect(peakLoad(spans, d('2026-10-01'), d('2026-10-31'))).toBe(10);
  });

  it('compte le chevauchement sur un seul jour', () => {
    const spans = [span('2026-10-01', '2026-10-10', 20), span('2026-10-10', '2026-10-20', 25)];
    expect(peakLoad(spans, d('2026-10-01'), d('2026-10-31'))).toBe(45);
  });

  it('renvoie 0 sans allocation', () => {
    expect(peakLoad([], d('2026-10-01'), d('2026-10-31'))).toBe(0);
  });
});

describe('loadAt', () => {
  it('somme les allocations actives à la date, bornes comprises', () => {
    const spans = [span('2026-10-01', '2026-10-10', 20), span('2026-10-10', '2026-10-20', 10)];
    expect(loadAt(spans, d('2026-10-10'))).toBe(30);
    expect(loadAt(spans, d('2026-10-11'))).toBe(10);
    expect(loadAt(spans, d('2026-10-21'))).toBe(0);
  });
});
