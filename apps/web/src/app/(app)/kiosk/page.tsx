import Link from 'next/link';

export default function Kiosk() {
  return (
    <div className="wrap">
      <nav className="nav">
        <span className="logo">Nutri<b>Flow</b></span>
        <div className="cta">
          <Link className="btn ghost small" href="/ingresar">Ingresar</Link>
          <Link className="btn small" href="/">Volver al inicio</Link>
        </div>
      </nav>



      <main>
        <div className="kiosk-box">
          <span className="tag t-coral">Cero navegación</span>
          <p className="kiosk-num">1 tarea</p>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-2)', maxWidth: '30ch' }}>
            Solo <strong>check-in</strong>. Máximo <strong>2 acciones en pantalla</strong>.
          </p>
          <div className="sep-safe" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" href="/registro">Registrar entrada</Link>
            <Link className="btn btn-secondary" style={{ marginLeft: '16px' }} href="/">Cancelar</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
