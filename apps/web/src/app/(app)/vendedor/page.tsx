"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ApiUser = { id: string; email: string; name: string; role: string };

export default function Vendedor() {
  const [clients, setClients] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);

  async function authed(path: string, init?: RequestInit) {
    let t: string | null = token;
    if (!t) {
      try { t = localStorage.getItem('nf_token'); } catch { t = null; }
    }
    return fetch(path, {
      ...init,
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(init?.headers || {}) },
    });
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo ingresar');
      try {
        localStorage.setItem('nf_token', data.token);
        localStorage.setItem('nf_user', JSON.stringify(data.user));
      } catch { /* sin almacenamiento */ }
      setToken(data.token);
      setEmail('');
      setPass('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    try {
      const t = localStorage.getItem('nf_token');
      if (t) setToken(t);
    } catch { /* sin almacenamiento */ }
  }, []);

  useEffect(() => {
    if (!token) {
      try {
        if (!localStorage.getItem('nf_token')) { setLoading(false); return; }
      } catch { setLoading(false); return; }
    }
    async function load() {
      try {
        const res = await authed(`${API}/api/admin/users?role=SUPER_ADMIN`);
        if (res.status === 401) throw new Error('Sesión vencida: ingresa de nuevo.');
        if (!res.ok) throw new Error(`API ${res.status}`);
        const users: ApiUser[] = await res.json();
        setClients(users.filter((u) => u.role === 'USUARIO'));
      } catch (err: any) {
        setError(err.message || ('No se pudo conectar con la API en ' + API));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  return (
    <div className="wrap">
      <nav className="nav">
        <span className="logo">Nutri<b>Flow</b></span>
        <div className="cta">
          <Link className="btn ghost small" href="/super-admin">Admin</Link>
          <Link className="btn small" href="/">Volver al inicio</Link>
        </div>
      </nav>



      <header className="hero">
        <span className="kicker">App Vendedor</span>
        <h1>Panel Vendedor</h1>
        <p className="muted">Gestiona tus clientes y ventas con NutriFlow.</p>
      </header>

      <section className="block">
        <h2>Mis clientes</h2>
        {!token ? (
          <form className="card" onSubmit={login} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16 }}>
            <input placeholder="correo@ejemplo.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input placeholder="Contraseña" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
            <button className="btn" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
          </form>
        ) : loading ? (
          <p>Cargando…</p>
        ) : error ? (
          <div className="alert" role="alert">{error}</div>
        ) : clients.length === 0 ? (
          <p className="muted">Sin clientes todavía. Crea uno desde el panel Admin.</p>
        ) : (
          <div className="grid g2">
            {clients.map((c) => (
              <article className="card" key={c.id}>
                <h3>{c.name}</h3>
                <p className="muted">{c.email}</p>
                <p><span className="pill">{c.role}</span></p>
              </article>
            ))}
          </div>
        )}
        <div className="cta" style={{ marginTop: 20 }}>
          <Link className="btn" href="/super-admin">Agregar cliente</Link>
          <Link className="btn ghost" href="/comidas">Ver comidas</Link>
        </div>
      </section>

      <footer>© 2026 NutriFlow.</footer>
    </div>
  );
}
