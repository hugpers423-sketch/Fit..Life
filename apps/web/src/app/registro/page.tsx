"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerApi } from "@/lib/api";

export default function Registro() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const name = String(fd.get("name") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !name || password.length < 8) {
      setError("Completa correo, nombre y una contraseña de al menos 8 caracteres.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await registerApi(email, name, password);
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "No se pudo crear la cuenta.");
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <span className="logo">Nutri<b>Flow</b></span>
        <div className="cta">
          <Link className="btn ghost small" href="/ingresar">Ingresar</Link>
          <Link className="btn small" href="/">Volver al inicio</Link>
        </div>
      </nav>

      <main className="auth">
        <span className="logo">Nutri<b>Flow</b></span>
        <h1>Crea tu cuenta</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Toma menos de un minuto.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <form onSubmit={onSubmit} className="card">
          <div className="field"><label htmlFor="nombre">Nombre</label><input id="nombre" name="name" type="text" required autoComplete="name" /></div>
          <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">Contraseña (mín. 8)</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? "Creando…" : "Crear cuenta"}</button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>¿Ya tienes cuenta? <Link href="/ingresar" style={{ color: 'var(--brand)', fontWeight: 700 }}>Ingresa</Link></p>
      </main>
    </div>
  );
}