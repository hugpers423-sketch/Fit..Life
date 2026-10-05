import { describe, expect, it } from 'vitest';
import { calcularMetas, categoriaImc, imc, racha } from './nutrition';

describe('nutrition', () => {
  it('calcula IMC', () => {
    expect(imc(68, 170)).toBe(23.5);
    expect(categoriaImc(23.5)).toBe('Peso normal');
    expect(categoriaImc(26.4)).toBe('Sobrepeso');
  });
  it('calcula metas (hombre 30a, 170cm, 68kg, ligera, mantener)', () => {
    const m = calcularMetas({ sexo: 'm', edad: 30, alturaCm: 170, pesoKg: 68, actividad: 'ligera', objetivo: 'mantener' });
    expect(m.kcal).toBe(2200);
    expect(m.proteinaG).toBe(109);
  });
  it('respeta el mínimo calórico al perder peso', () => {
    const m = calcularMetas({ sexo: 'f', edad: 60, alturaCm: 150, pesoKg: 45, actividad: 'sedentaria', objetivo: 'perder' });
    expect(m.kcal).toBe(1200);
  });
  it('calcula racha', () => {
    expect(racha(['2026-10-04', '2026-10-03', '2026-10-02', '2026-09-30'], '2026-10-04')).toBe(3);
    expect(racha(['2026-10-03', '2026-10-02'], '2026-10-04')).toBe(2);
    expect(racha(['2026-10-01'], '2026-10-04')).toBe(0);
  });
});
