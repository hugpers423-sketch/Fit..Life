import { guardarPerfil } from '../actions';

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth" style={{ maxWidth: 520 }}>
      <span className="logo">Nutri<b>Flow</b></span>
      <h1>Cuéntanos de ti</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Con esto calculamos tu IMC y tus metas diarias. Los números pueden ser aproximados.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <form action={guardarPerfil} className="card">
        <div className="field"><label htmlFor="nombre">Nombre</label><input id="nombre" name="nombre" required /></div>
        <div className="row">
          <div className="field"><label htmlFor="sexo">Sexo</label><select id="sexo" name="sexo" defaultValue="m"><option value="m">Masculino</option><option value="f">Femenino</option></select></div>
          <div className="field"><label htmlFor="edad">Edad</label><input id="edad" name="edad" type="number" min={14} max={100} defaultValue={30} required /></div>
        </div>
        <div className="row">
          <div className="field"><label htmlFor="altura">Altura (cm)</label><input id="altura" name="altura" type="number" step="0.1" min={100} max={230} defaultValue={170} required /></div>
          <div className="field"><label htmlFor="peso">Peso (kg)</label><input id="peso" name="peso" type="number" step="0.1" min={30} max={300} defaultValue={68} required /></div>
        </div>
        <div className="field"><label htmlFor="actividad">Actividad</label>
          <select id="actividad" name="actividad" defaultValue="ligera">
            <option value="sedentaria">Sedentaria (poco o nada de ejercicio)</option>
            <option value="ligera">Ligera (1-3 días por semana)</option>
            <option value="moderada">Moderada (3-5 días por semana)</option>
            <option value="alta">Alta (6-7 días por semana)</option>
          </select></div>
        <div className="row">
          <div className="field"><label htmlFor="objetivo">Objetivo</label><select id="objetivo" name="objetivo" defaultValue="mantener"><option value="perder">Perder peso</option><option value="mantener">Mantener</option><option value="ganar">Ganar masa</option></select></div>
          <div className="field"><label htmlFor="peso_objetivo">Peso objetivo (kg, opcional)</label><input id="peso_objetivo" name="peso_objetivo" type="number" step="0.1" min={30} max={300} /></div>
        </div>
        <button className="btn" style={{ width: '100%' }}>Calcular mi plan</button>
      </form>
    </main>
  );
}
