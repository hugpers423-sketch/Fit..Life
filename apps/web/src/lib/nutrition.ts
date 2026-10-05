export type Sexo = 'm' | 'f';
export type Actividad = 'sedentaria' | 'ligera' | 'moderada' | 'alta';
export type Objetivo = 'perder' | 'mantener' | 'ganar';

export interface Datos {
  sexo: Sexo;
  edad: number;
  alturaCm: number;
  pesoKg: number;
  actividad: Actividad;
  objetivo: Objetivo;
}

export interface Metas {
  kcal: number;
  proteinaG: number;
  carbsG: number;
  grasaG: number;
}

const FACTOR: Record<Actividad, number> = { sedentaria: 1.2, ligera: 1.375, moderada: 1.55, alta: 1.725 };
const AJUSTE: Record<Objetivo, number> = { perder: -400, mantener: 0, ganar: 300 };

export function imc(pesoKg: number, alturaCm: number): number {
  const m = alturaCm / 100;
  return Math.round((pesoKg / (m * m)) * 10) / 10;
}

export function categoriaImc(v: number): string {
  if (v < 18.5) return 'Bajo peso';
  if (v < 25) return 'Peso normal';
  if (v < 30) return 'Sobrepeso';
  return 'Obesidad';
}

/** Mifflin-St Jeor */
export function tmb(d: Pick<Datos, 'sexo' | 'edad' | 'alturaCm' | 'pesoKg'>): number {
  const base = 10 * d.pesoKg + 6.25 * d.alturaCm - 5 * d.edad;
  return d.sexo === 'm' ? base + 5 : base - 161;
}

export function calcularMetas(d: Datos): Metas {
  const minimo = d.sexo === 'm' ? 1500 : 1200;
  const kcal = Math.max(minimo, Math.round((tmb(d) * FACTOR[d.actividad] + AJUSTE[d.objetivo]) / 10) * 10);
  const proteinaG = Math.round(d.pesoKg * (d.objetivo === 'perder' ? 2 : 1.6));
  const grasaG = Math.round((kcal * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinaG * 4 - grasaG * 9) / 4));
  return { kcal, proteinaG, carbsG, grasaG };
}

/** Días consecutivos (terminando hoy o ayer) con al menos un registro. Fechas 'YYYY-MM-DD'. */
export function racha(fechas: string[], hoy: string): number {
  const set = new Set(fechas);
  const dia = (s: string, delta: number) => {
    const d = new Date(s + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  };
  let cursor = set.has(hoy) ? hoy : dia(hoy, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = dia(cursor, -1);
  }
  return n;
}

export function hoyISO(tz = process.env.APP_TZ ?? 'America/Lima'): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}
