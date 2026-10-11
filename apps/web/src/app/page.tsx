"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

const FUNCIONES = [
  { i: '⚖️', t: 'IMC y metas automaticas', d: 'Calculamos tu IMC y tus metas diarias de calorias y macros.' },
  { i: '🍽️', t: 'Registro de comidas', d: 'Anota lo que comes en segundos.' },
  { i: '🏃', t: 'Registro de entrenos', d: 'Guarda tus sesiones y calorias quemadas.' },
  { i: '🔥', t: 'Rachas y progreso', d: 'Tu racha de dias registrando.' },
];

const ROLES = [
  { r: "SUPER_ADMIN", href: "/super-admin", desc: "Admin General - Web + Movil, comanda todo" },
  { r: "VENDEDOR", href: "/vendedor", desc: "App Movil Vendedor - ventas y clientes" },
  { r: "USUARIO", href: "/dashboard", desc: "App Usuario - panel personal de salud" },
  { r: "ORIENTADOR", href: "/orientador", desc: "App Orientador - guia nutricional" },
  { r: "QUIOSK", href: "/kiosk", desc: "App Kiosk - consulta publica" },
];

export default function Landing() {
  const [user, setUser] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState('USUARIO');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('rol');
    if (r && ROLES.some((x) => x.r === r)) setRol(r);
    async function cargar() {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const uid = params.get('userId') || '1';
        const pm = await fetch(base + '/api/meals?userId=' + uid);
        if (pm.ok) setMeals(await pm.json());
        const pp = await fetch(base + '/api/user/profile?userId=' + uid);
        if (pp.ok) setUser(await pp.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

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
        <span className="kicker">Nutricion + fitness</span>
        <h1>Come bien. <em>Muevete.</em> Un solo plan.</h1>
        <p>Rol actual: <b>{rol}</b>. NutriFlow te ayuda a registrar comidas y entrenos.</p>
        <div className="cta">
          <Link className="btn" href="/registro">Empezar gratis</Link>
          <Link className="btn ghost" href="/super-admin">Ir al dashboard</Link>
        </div>
      </header>

      <section className="block" id="roles">
        <h2>Acceso por rol - Admin General y 4 Apps Moviles</h2>
        <p className="muted" style={{ marginBottom: 20 }}>SUPER_ADMIN comanda y vigila todo.</p>
        <div className="grid g2">
          {ROLES.map(({ r, href, desc }) => (
            <article className="card" key={r}>
              <h3>{r}</h3>
              <p className="muted">{desc}</p>
              <div className="cta" style={{ marginTop: 12 }}>
                <Link className="btn small" href={href}>Entrar como {r}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>Todo lo que necesitas</h2>
        {loading ? (
          <p>Cargando datos...</p>
        ) : (
          <div className="grid g2" style={{ marginBottom: 20 }}>
            <article className="card">
              <h3>Comidas registradas</h3>
              <p className="muted">{meals.length} registros desde API</p>
            </article>
            <article className="card">
              <h3>Usuario</h3>
              <p className="muted">{user ? 'Perfil cargado' : 'Sin perfil - usa seed'}</p>
            </article>
          </div>
        )}
        <div className="grid g2">
          {FUNCIONES.map((f) => (
            <article className="card" key={f.t}>
              <div className="feat">{f.i}</div>
              <h3>{f.t}</h3>
              <p className="muted">{f.d}</p>
            </article>
          ))}
        </div>
      </section>

      {meals.length > 0 && (
        <section className="block" id="comidas">
          <h2>Mis Comidas</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Calorias</th>
                  <th>Proteina</th>
                  <th>Carbs</th>
                  <th>Grasa</th>
                </tr>
              </thead>
              <tbody>
                {meals.slice(0, 10).map((m: any, i: number) => (
                  <tr key={m.id || i}>
                    <td>{m.type}</td>
                    <td>{m.calories || 0} kcal</td>
                    <td>{m.proteinG || 0}g</td>
                    <td>{m.carbsG || 0}g</td>
                    <td>{m.fatG || 0}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="block" id="como">
        <h2>Como funciona</h2>
        <div className="grid g4" style={{ marginTop: 16 }}>
          {['Crea tu cuenta', 'Cuentanos edad altura peso y objetivo', 'Recibe tus metas diarias', 'Registra y mira tu progreso'].map((s, n) => (
            <div className="card" key={s}>
              <div className="stat" style={{ color: 'var(--brand)' }}>{n + 1}</div>
              <p>{s}</p>
            </div>
          ))}
        </div>
      </section>

      <footer>© 2026 NutriFlow. Las metas son orientativas.</footer>
    </div>
  );
}
