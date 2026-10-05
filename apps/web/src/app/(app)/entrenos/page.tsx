import { createClient } from '@/lib/supabase/server';
import { hoyISO } from '@/lib/nutrition';
import { agregarEntreno } from '../../actions';

export default async function Entrenos({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const { data } = await supabase.from('workout_logs').select('*').eq('user_id', u.user!.id).order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(20);
  const es = data ?? [];
  return (
    <>
      <h1>Entrenos</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Registra tus sesiones de ejercicio.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="grid g2">
        <form action={agregarEntreno} className="card">
          <div className="field"><label htmlFor="nombre">Actividad</label><input id="nombre" name="nombre" placeholder="Cardio, fuerza, caminata…" required /></div>
          <div className="row">
            <div className="field"><label htmlFor="fecha">Fecha</label><input id="fecha" name="fecha" type="date" defaultValue={hoyISO()} required /></div>
            <div className="field"><label htmlFor="minutos">Minutos</label><input id="minutos" name="minutos" type="number" min={1} max={600} required /></div>
            <div className="field"><label htmlFor="kcal">Kcal quemadas</label><input id="kcal" name="kcal" type="number" min={0} /></div>
          </div>
          <button className="btn">Agregar</button>
        </form>
        <section className="card"><h3 style={{ marginBottom: 8 }}>Últimas sesiones</h3>
          {es.length === 0 ? <p className="muted">Aún no registras entrenos.</p> : (
            <ul className="list">{es.map((e) => <li key={e.id}><span className="pill">{e.fecha}</span><span className="grow">{e.nombre}</span><b>{e.minutos} min</b><span className="muted">{e.kcal_quemadas} kcal</span></li>)}</ul>)}
        </section>
      </div>
    </>
  );
}
