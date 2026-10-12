"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginApi } from "@/lib/api";

export default function Ingresar() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) return;
    setBusy(true);
    setError("");
    try {
      await loginApi(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "No se pudo iniciar sesión. Verifica que la API esté corriendo.");
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <span className="logo">Nutri<b>Flow</b></span>
        <div className="cta">
          <Link className="btn ghost small" href="/registro">Crear cuenta</Link>
          <Link className="btn small" href="/">Volver al inicio</Link>
        </div>
      </nav>

      <main className="auth">
        <span className="logo">Nutri<b>Flow</b></span>
        <h1>Ingresar</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Bienvenido de vuelta.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <form onSubmit={onSubmit} className="card">
          <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>¿No tienes cuenta? <Link href="/registro" style={{ color: 'var(--brand)', fontWeight: 700 }}>Créalas</Link></p>
      </main>
    </div>
  );
}