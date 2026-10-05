import { createClient } from '@/lib/supabase/server';
import { hoyISO } from '@/lib/nutrition';
import { agregarComida, borrarComida } from '../../actions';

export default async function Comidas({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const { data } = await supabase.from('meal_logs').select('*').eq('user_id', u.user!.id).eq('fecha', hoyISO()).order('created_at');
  const cs = data ?? [];
  return (
    <>
      <h1>Comidas</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Registra lo que comes hoy.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="grid g2">
        <form action={agregarComida} className="card">
          <div className="field"><label htmlFor="tipo">Momento</label>
            <select id="tipo" name="tipo" defaultValue="desayuno"><option value="desayuno">Desayuno</option><option value="almuerzo">Almuerzo</option><option value="cena">Cena</option><option value="snack">Snack</option></select></div>
          <div className="field"><label htmlFor="nombre">¿Qué comiste?</label><input id="nombre" name="nombre" required /></div>
          <div className="row">
            <div className="field"><label htmlFor="kcal">Calorías</label><input id="kcal" name="kcal" type="number" min={0} max={5000} required /></div>
            <div className="field"><label htmlFor="proteina">Proteína (g)</label><input id="proteina" name="proteina" type="number" step="0.1" min={0} /></div>
            <div className="field"><label htmlFor="carbs">Carbs (g)</label><input id="carbs" name="carbs" type="number" step="0.1" min={0} /></div>
            <div className="field"><label htmlFor="grasa">Grasas (g)</label><input id="grasa" name="grasa" type="number" step="0.1" min={0} /></div>
          </div>
          <button className="btn">Agregar</button>
        </form>
        <section className="card"><h3 style={{ marginBottom: 8 }}>Hoy · {cs.reduce((a, c) => a + c.kcal, 0)} kcal</h3>
          {cs.length === 0 ? <p className="muted">Nada registrado todavía.</p> : (
            <ul className="list">{cs.map((c) => (
              <li key={c.id}><span className="pill">{c.tipo}</span>
                <span className="grow">{c.nombre}<br /><span className="muted">{Number(c.proteina_g)}P · {Number(c.carbs_g)}C · {Number(c.grasa_g)}G</span></span>
                <b>{c.kcal}</b>
                <form action={borrarComida}><input type="hidden" name="id" value={c.id} /><button className="linkbtn" aria-label={`Borrar ${c.nombre}`}>Borrar</button></form>
              </li>))}</ul>)}
        </section>
      </div>
    </>
  );
}
