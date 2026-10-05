import Link from 'next/link';
import { registrar } from '../actions';

export default async function Registro({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth">
      <Link className="logo" href="/">Nutri<b>Flow</b></Link>
      <h1>Crea tu cuenta</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Toma menos de un minuto.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <form action={registrar} className="card">
        <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><label htmlFor="password">Contraseña (mín. 8)</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
        <button className="btn" style={{ width: '100%' }}>Crear cuenta</button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>¿Ya tienes cuenta? <Link href="/ingresar" style={{ color: 'var(--brand)', fontWeight: 700 }}>Ingresa</Link></p>
    </main>
  );
}
