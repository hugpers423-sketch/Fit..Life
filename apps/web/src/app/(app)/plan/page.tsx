import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hoyISO } from '@/lib/nutrition';

const TZ = () => process.env.APP_TZ ?? 'America/Lima';
const dia = (offset: number) => new Date(Date.now() - offset * 864e5).toLocaleDateString('en-CA', { timeZone: TZ() });
const nombreDia = (f: string) => new Date(f + 'T12:00:00Z').toLocaleDateString('es', { weekday: 'long', timeZone: 'UTC' });

export default async function Plan() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const id = u.user!.id;
  const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!p) redirect('/onboarding');
  const hoy = hoyISO();
  const dias = Array.from({ length: 7 }, (_, i) => dia(6 - i));
  const [m, e] = await Promise.all([
    supabase.from('meal_logs').select('fecha,tipo,kcal,proteina_g').eq('user_id', id).gte('fecha', dias[0]),
    supabase.from('workout_logs').select('fecha,nombre,minutos,kcal_quemadas').eq('user_id', id).gte('fecha', dias[0]),
  ]);
  const comidas = m.data ?? [], entrenos = e.data ?? [];
  const delDia = (f: string) => ({
    c: comidas.filter((x) => x.fecha === f),
    e: entrenos.filter((x) => x.fecha === f),
  });
  const h = delDia(hoy);
  const kcal = h.c.reduce((a, x) => a + x.kcal, 0);
  const prot = h.c.reduce((a, x) => a + Number(x.proteina_g), 0);
  const quemadas = h.e.reduce((a, x) => a + x.kcal_quemadas, 0);
  const faltaK = Math.max(0, p.kcal_meta - kcal + quemadas);
  const faltaP = Math.max(0, Math.round(p.prot_meta - prot));
  const totComidas = comidas.length;
  const sesiones = new Set(entrenos.map((x) => x.fecha + x.nombre)).size;
  const minutos = entrenos.reduce((a, x) => a + x.minutos, 0);

  return (
    <>
      <span className="kicker">Plan integral · un solo día, un solo sistema</span>
      <h1 style={{ marginTop: 12 }}>Tu día completo</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Comer y moverse no son dos planes. Son uno y se ajustan entre sí.</p>
      <div className="grid g2">
        <section className="card"><span className="muted">Lo que comiste</span>
          <div className="stat">{kcal} <small>kcal</small></div><p className="muted">{Math.round(prot)} g de proteína</p></section>
        <section className="card"><span className="muted">Lo que te falta</span>
          <div className="stat">{faltaK} <small>kcal</small></div><p className="muted">{faltaP} g de proteína para tu meta</p></section>
        <section className="card"><span className="muted">Lo que harás / hiciste</span>
          {h.e.length === 0 ? <p>Sin entreno registrado hoy.</p> : (
            <ul className="list">{h.e.map((x, i) => <li key={i}><span className="grow">{x.nombre}</span><b>{x.minutos} min</b></li>)}</ul>)}
          <p className="muted">{quemadas} kcal quemadas hoy (se suman a lo que puedes comer).</p></section>
      </div>
      <section className="card" style={{ marginTop: 16 }} aria-labelledby="sem">
        <h3 id="sem">Tu semana</h3>
        <p className="muted" style={{ marginBottom: 12 }}>{totComidas} comidas registradas · {sesiones} sesiones · {minutos} min de entrenamiento.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
            <thead><tr style={{ textAlign: 'left' }}><th>Día</th><th>Comidas</th><th>Entrenamiento</th><th>Calorías netas</th></tr></thead>
            <tbody>
              {dias.map((f) => {
                const d = delDia(f);
                const neto = d.c.reduce((a, x) => a + x.kcal, 0) - d.e.reduce((a, x) => a + x.kcal_quemadas, 0);
                const mins = d.e.reduce((a, x) => a + x.minutos, 0);
                return (
                  <tr key={f} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 0', textTransform: 'capitalize' }}>{nombreDia(f)}</td>
                    <td>{d.c.length}/3 {d.c.length >= 3 ? '✓' : ''}</td>
                    <td>{mins ? `${mins} min ✓` : '—'}</td>
                    <td>{d.c.length || d.e.length ? neto : '—'}</td>
                  </tr>);
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
