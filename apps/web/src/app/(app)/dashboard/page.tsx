import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { categoriaImc, hoyISO, imc, racha } from '@/lib/nutrition';
import { registrarPeso } from '../../actions';

const pct = (v: number, m: number) => Math.min(100, Math.round((v / Math.max(1, m)) * 100));

function Macro({ n, v, m, c }: { n: string; v: number; m: number; c: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{n}</b><span className="muted">{Math.round(v)} / {m} g</span></div>
      <div className={`bar ${c}`} role="progressbar" aria-valuenow={pct(v, m)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct(v, m)}%` }} /></div>
    </div>
  );
}

function GraficaPeso({ datos, objetivo }: { datos: { fecha: string; peso: number }[]; objetivo: number | null }) {
  if (datos.length < 2) return <p className="muted">Registra tu peso en más de un día para ver tu evolución.</p>;
  const W = 520, H = 160, P = 24;
  const vals = datos.map((d) => d.peso).concat(objetivo ? [objetivo] : []);
  const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (datos.length - 1);
  const y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  const pts = datos.map((d, i) => `${x(i)},${y(d.peso)}`).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución del peso">
      {objetivo && <line x1={P} x2={W - P} y1={y(objetivo)} y2={y(objetivo)} stroke="#c2410c" strokeDasharray="5 5" />}
      <polyline points={pts} fill="none" stroke="#15803d" strokeWidth="3" strokeLinejoin="round" />
      {datos.map((d, i) => <circle key={d.fecha} cx={x(i)} cy={y(d.peso)} r="4" fill="#22c55e" />)}
      <text x={W - P} y={y(datos[datos.length - 1].peso) - 10} textAnchor="end" fontSize="12" fill="#12211a">{datos[datos.length - 1].peso} kg</text>
    </svg>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const id = u.user!.id;
  const hoy = hoyISO();
  const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!p) redirect('/onboarding');

  const hace7 = new Date(Date.now() - 6 * 864e5).toLocaleDateString('en-CA', { timeZone: process.env.APP_TZ ?? 'America/Lima' });
  const [comidas, entrenos, pesos, fechas] = await Promise.all([
    supabase.from('meal_logs').select('*').eq('user_id', id).eq('fecha', hoy).order('created_at'),
    supabase.from('workout_logs').select('*').eq('user_id', id).gte('fecha', hace7),
    supabase.from('weight_logs').select('fecha,peso_kg').eq('user_id', id).order('fecha', { ascending: false }).limit(8),
    supabase.from('meal_logs').select('fecha').eq('user_id', id).gte('fecha', new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)),
  ]);
  const cs = comidas.data ?? [];
  const sum = (k: 'kcal' | 'proteina_g' | 'carbs_g' | 'grasa_g') => cs.reduce((a, c) => a + Number(c[k] ?? 0), 0);
  const kcal = sum('kcal');
  const en = entrenos.data ?? [];
  const minSemana = en.reduce((a, e) => a + e.minutos, 0);
  const quemadas = en.reduce((a, e) => a + e.kcal_quemadas, 0);
  const serie = (pesos.data ?? []).map((w) => ({ fecha: w.fecha as string, peso: Number(w.peso_kg) })).reverse();
  const valorImc = imc(Number(p.peso_kg), Number(p.altura_cm));
  const dias = racha((fechas.data ?? []).map((f) => f.fecha as string), hoy);

  return (
    <>
      <h1>Hola, {p.nombre} 👋</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Tu resumen de hoy.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="grid g4">
        <div className="card"><span className="muted">Peso actual</span><div className="stat">{Number(p.peso_kg)} <small>kg</small></div></div>
        <div className="card"><span className="muted">IMC</span><div className="stat">{valorImc}</div><span className="pill">{categoriaImc(valorImc)}</span></div>
        <div className="card"><span className="muted">Calorías hoy</span><div className="stat">{kcal} <small>/ {p.kcal_meta} kcal</small></div>
          <div className="bar"><i style={{ width: `${pct(kcal, p.kcal_meta)}%` }} /></div>
          <span className="muted">{kcal >= p.kcal_meta ? 'Meta alcanzada' : `Te faltan ${p.kcal_meta - kcal} kcal`}</span></div>
        <div className="card"><span className="muted">Racha</span><div className="stat">{dias} <small>{dias === 1 ? 'día' : 'días'}</small> 🔥</div></div>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <section className="card" aria-labelledby="macros"><h3 id="macros" style={{ marginBottom: 12 }}>Macros del día</h3>
          <Macro n="Proteínas" v={sum('proteina_g')} m={p.prot_meta} c="p" />
          <Macro n="Carbohidratos" v={sum('carbs_g')} m={p.carb_meta} c="c" />
          <Macro n="Grasas" v={sum('grasa_g')} m={p.grasa_meta} c="g" />
        </section>
        <section className="card" aria-labelledby="hoy"><h3 id="hoy" style={{ marginBottom: 8 }}>Comidas de hoy</h3>
          {cs.length === 0 ? <p className="muted">Aún no registras nada hoy.</p> : (
            <ul className="list">{cs.map((c) => <li key={c.id}><span className="pill">{c.tipo}</span><span className="grow">{c.nombre}</span><b>{c.kcal} kcal</b></li>)}</ul>
          )}
          <a className="btn small" href="/comidas" style={{ marginTop: 12 }}>Registrar comida</a>
        </section>
        <section className="card" aria-labelledby="peso"><h3 id="peso" style={{ marginBottom: 8 }}>Evolución de peso</h3>
          <GraficaPeso datos={serie} objetivo={p.peso_objetivo_kg ? Number(p.peso_objetivo_kg) : null} />
          <form action={registrarPeso} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input name="peso" type="number" step="0.1" min={30} max={300} placeholder="Peso de hoy (kg)" aria-label="Peso de hoy" required />
            <button className="btn small">Guardar</button>
          </form>
        </section>
        <section className="card" aria-labelledby="sem"><h3 id="sem" style={{ marginBottom: 8 }}>Entrenos (7 días)</h3>
          <div className="stat">{minSemana} <small>min</small></div>
          <p className="muted">{en.length} sesiones · {quemadas} kcal quemadas</p>
          <a className="btn small" href="/entrenos" style={{ marginTop: 12 }}>Registrar entreno</a>
        </section>
      </div>
    </>
  );
}
