import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/server';
import { salir } from '../actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabase()) {
    return <main className="auth"><div className="alert">Falta configurar Supabase. Copia .env.example a .env.local y completa las claves.</div></main>;
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/ingresar');
  return (
    <>
      <header className="appbar">
        <div className="wrap">
          <Link className="logo" href="/dashboard">Nutri<b>Flow</b></Link>
          <nav className="tabs" aria-label="Principal">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/plan">Plan integral</Link>
            <Link href="/comidas">Comidas</Link>
            <Link href="/entrenos">Entrenos</Link>
          </nav>
          <form action={salir}><button className="btn ghost small">Salir</button></form>
        </div>
      </header>
      <main className="wrap page">{children}</main>
    </>
  );
}
