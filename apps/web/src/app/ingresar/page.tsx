import Link from 'next/link';
import { ingresar } from '../actions';

export default async function Ingresar({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth">
      <Link className="logo" href="/">Nutri<b>Flow</b></Link>
      <h1>Ingresar</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Bienvenido de vuelta.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <form action={ingresar} className="card">
        <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
        <button className="btn" style={{ width: '100%' }}>Ingresar</button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>¿No tienes cuenta? <Link href="/registro" style={{ color: 'var(--brand)', fontWeight: 700 }}>Créala</Link></p>
    </main>
  );
}
