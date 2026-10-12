"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { storedUser, logoutApi, type ApiUser } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    setUser(storedUser());
  }, []);

  async function salir() {
    await logoutApi().catch(() => {});
    router.push("/");
  }

  return (
    <>
      <header className="appbar">
        <div className="wrap">
          <Link className="logo" href="/">Nutri<b>Flow</b></Link>
          <nav className="tabs" aria-label="Principal">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/plan">Plan integral</Link>
            <Link href="/comidas">Comidas</Link>
            <Link href="/entrenos">Entrenos</Link>
            <Link href="/super-admin">Admin</Link>
          </nav>
          {user ? (
            <>
              <span className="pill">{user.name}</span>
              <button className="btn ghost small" onClick={salir}>Salir</button>
            </>
          ) : (
            <Link className="btn ghost small" href="/ingresar">Ingresar</Link>
          )}
        </div>
      </header>
      <main className="wrap page">{children}</main>
    </>
  );
}