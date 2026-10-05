import Link from 'next/link';

const FUNCIONES = [
  { i: '⚖️', t: 'IMC y metas automáticas', d: 'Con tu edad, altura, peso y nivel de actividad calculamos tu IMC y tus metas diarias de calorías y macros.' },
  { i: '🍽️', t: 'Registro de comidas', d: 'Anota lo que comes en segundos y mira cuánto te falta para tu meta del día.' },
  { i: '🏃', t: 'Registro de entrenos', d: 'Guarda tus sesiones y mira tus minutos y calorías quemadas de la semana.' },
  { i: '🔥', t: 'Rachas y progreso', d: 'Tu racha de días registrando y la evolución de tu peso hacia tu objetivo.' },
  { i: '🎙️', t: 'Asistente de voz Nutri', d: 'Habla y Nutri registra por ti.', soon: true },
  { i: '📸', t: 'Escaneo de comida por foto', d: 'Una foto de tu plato y estimamos calorías y macros.', soon: true },
];

export default function Landing() {
  return (
    <div className="wrap">
      <nav className="nav">
        <span className="logo">Nutri<b>Flow</b></span>
        <div className="cta">
          <Link className="btn ghost small" href="/ingresar">Ingresar</Link>
          <Link className="btn small" href="/registro">Crear cuenta</Link>
        </div>
      </nav>
      <header className="hero">
        <span className="kicker">Nutrición + fitness</span>
        <h1>Come bien. <em>Muévete.</em> Un solo plan.</h1>
        <p>NutriFlow calcula tu IMC, arma tus metas diarias y te ayuda a registrar comidas y entrenos para que la constancia se vea.</p>
        <div className="cta">
          <Link className="btn" href="/registro">Empezar gratis</Link>
          <Link className="btn ghost" href="#como">Cómo funciona</Link>
        </div>
      </header>
      <section className="block">
        <h2>Todo lo que necesitas, en un solo lugar</h2>
        <p className="muted" style={{ marginBottom: 20 }}>Lo marcado como próximamente está en camino.</p>
        <div className="grid g2">
          {FUNCIONES.map((f) => (
            <article className="card" key={f.t}>
              <div className="feat">{f.i}</div>
              <h3>{f.t}{f.soon && <span className="soon">Próximamente</span>}</h3>
              <p className="muted">{f.d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="block" id="como">
        <h2>Cómo funciona</h2>
        <div className="grid g4" style={{ marginTop: 16 }}>
          {['Crea tu cuenta', 'Cuéntanos de ti: edad, altura, peso y objetivo', 'Recibe tus metas diarias', 'Registra y mira tu progreso'].map((s, n) => (
            <div className="card" key={s}><div className="stat" style={{ color: 'var(--brand)' }}>{n + 1}</div><p>{s}</p></div>
          ))}
        </div>
      </section>
      <footer>© 2026 NutriFlow. Las metas son orientativas y no reemplazan la consulta con un profesional de la salud.</footer>
    </div>
  );
}
