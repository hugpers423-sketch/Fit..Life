import Link from 'next/link';
import { ingresar } from '../actions';

export default function Ingresar() {
  return (
    <div className="wrap">
      <nav className="nav">
        <span className="logo">Nutri<b>Flow</b></span>
        <div className="cta">
          <Link className="btn ghost small" href="/registro">Crear cuenta</Link>
          <Link className="btn small" href="/">Volver al inicio</Link>
        </div>
      </nav>

      {/* Toggle de movimiento - diseño system v3.0 */}


      <main className="auth">
        <span className="logo">Nutri<b>Flow</b></span>
        <h1>Ingresar</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Bienvenido de vuelta.</p>
        <form action={ingresar} className="card">
          <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
          <button className="btn" style={{ width: '100%' }}>Ingresar</button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>¿No tienes cuenta? <Link href="/registro" style={{ color: 'var(--brand)', fontWeight: 700 }}>Créalas</Link></p>
      </main>
    </div>
  );
}