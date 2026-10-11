import Link from 'next/link';

export default function Orientador() {
  return (
    <div className="wrap">
      <nav className="nav">
        <span className="logo">Nutri<b>Flow</b></span>
        <div className="cta">
          <Link className="btn ghost small" href="/ingresar">Ingresar</Link>
          <Link className="btn small" href="/">Volver al inicio</Link>
        </div>
      </nav>

      {/* Toggle de movimiento - diseño system v3.0 */}


      <main className="auth">
        <span className="logo">Nutri<b>Flow</b></span>
        <h1>Panel Orientador</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Gestión de clientes y seguimiento de progreso.</p>
        <div className="grid g2">
          <div className="card">
            <h3>Clientes Activos</h3>
            <p className="stat">8</p>
            <p className="muted">Usuarios registrados hoy</p>
          </div>
          <div className="card">
            <h3>Progreso Semanal</h3>
            <p className="stat">4.5 kg</p>
            <p className="muted">Pérdida promedio</p>
          </div>
        </div>
        <section className="block" style={{ marginTop: 40 }}>
          <h2>Estadísticas Rápidas</h2>
          <div className="grid g4" style={{ marginTop: 16 }}>
            <div className="card"><p className="stat">24</p><p className="muted">Comidas registradas</p></div>
            <div className="card"><p className="stat">12</p><p className="muted">Entrenos completados</p></div>
            <div className="card"><p className="stat">3.2</p><p className="muted">IMC promedio</p></div>
            <div className="card"><p className="stat">89%</p><p className="muted">Meta cumplida</p></div>
          </div>
        </section>
      </main>
    </div>
  );
}