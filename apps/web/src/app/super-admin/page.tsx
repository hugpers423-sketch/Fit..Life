"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './super-admin.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ApiUser = { id: string; email: string; name: string; role: string; specialty?: string | null; membership?: string | null; createdAt: string };
type Meal = { id: string; userId: string; type: string; name?: string | null; source?: string | null; restaurantId?: string | null; scheduledAt?: string | null; calories: number | null; proteinG?: number | null; createdAt: string };

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const ROLE_TAG: Record<string, string> = {
  SUPER_ADMIN: 'prem',
  ORIENTADOR: 'pro',
  VENDEDOR: 'pro',
  USUARIO: 'free',
  QUIOSK: 'free',
};

const DAY_OPTS = [
  { label: 'Últimos 12 meses', days: 365 },
  { label: 'Últimos 6 meses', days: 180 },
  { label: 'Últimos 30 días', days: 30 },
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimas 24 horas', days: 1 },
];

function withinDays(iso: string, days: number) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return true;
  return Date.now() - t <= days * 864e5;
}

export default function SuperAdmin() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [apiOk, setApiOk] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ texto: string; hora: string } | null>(null);
  const [navOpen, setNavOpen] = useState(true);
  const [rangeIdx, setRangeIdx] = useState(0);
  const [donutView, setDonutView] = useState('Plan');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [planFilter, setPlanFilter] = useState('Todos');
  const [proView, setProView] = useState('Top');
  const [perfView, setPerfView] = useState('Ingresos');
  const [showClientForm, setShowClientForm] = useState(false);
  const [showTrainerForm, setShowTrainerForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSpec, setFormSpec] = useState('NUTRICIONISTA');
  const [formMsg, setFormMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [monDay, setMonDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [gyms, setGyms] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [payList, setPayList] = useState<any[]>([]);
  const [payTotal, setPayTotal] = useState(0);
  const [gName, setGName] = useState('');
  const [gAddress, setGAddress] = useState('');
  const [gService, setGService] = useState('');
  const [gVideo, setGVideo] = useState('');
  const [gSaving, setGSaving] = useState(false);
  const [gOpen, setGOpen] = useState('');
  const [gClose, setGClose] = useState('');
  const [rests, setRests] = useState<any[]>([]);
  const [rName, setRName] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rService, setRService] = useState('');
  const [rVideo, setRVideo] = useState('');
  const [rSaving, setRSaving] = useState(false);
  const [rOpen, setROpen] = useState('');
  const [rClose, setRClose] = useState('');
  const [saToken, setSaToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  function af(path: string, init?: RequestInit) {
    let t: string | null = saToken;
    let role: string | null = null;
    if (!t) {
      try {
        t = localStorage.getItem('nf_token');
        const raw = localStorage.getItem('nf_user');
        if (raw) role = (JSON.parse(raw) as { role?: string }).role ?? null;
      } catch { t = null; }
    }
    return fetch(path, {
      ...init,
      headers: {
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(role ? { 'x-role': role } : {}),
        ...(init?.headers || {}),
      },
    });
  }

  async function loginSa(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setFormMsg('');
    try {
      const res = await af(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo ingresar');
      try {
        localStorage.setItem('nf_token', data.token);
        localStorage.setItem('nf_user', JSON.stringify(data.user));
      } catch { /* sin almacenamiento */ }
      setSaToken(data.token);
      setLoginEmail('');
      setLoginPass('');
      await load();
    } catch (err: any) {
      setFormMsg(err.message);
    } finally {
      setLoginBusy(false);
    }
  }

  async function load() {
    try {
      const [u, m, g, r, d, pr, v, po, se, pa, wo, rc] = await Promise.all([
        af(`${API}/api/admin/users?role=SUPER_ADMIN`),
        af(`${API}/api/meals?role=SUPER_ADMIN`),
        af(`${API}/api/gyms`),
        af(`${API}/api/restaurants`),
        af(`${API}/api/dishes`),
        af(`${API}/api/products`),
        af(`${API}/api/visits`),
        af(`${API}/api/posts`),
        af(`${API}/api/sessions`),
        af(`${API}/api/payments`),
        af(`${API}/api/workouts?role=SUPER_ADMIN`),
        af(`${API}/api/recipes`),
      ]);
      if (u.status === 401) {
        try { localStorage.removeItem('nf_token'); localStorage.removeItem('nf_user'); } catch { /* sin almacenamiento */ }
        setSaToken(null);
        setFormMsg('Sesión vencida o sin acceso: ingresa de nuevo.');
        return;
      }
      if (!u.ok) throw new Error();
      setUsers(await u.json());
      setMeals(m.ok ? await m.json() : []);
      setGyms(g.ok ? await g.json() : []);
      setRests(r.ok ? await r.json() : []);
      setDishes(d.ok ? await d.json() : []);
      setProducts(pr.ok ? await pr.json() : []);
      setVisits(v.ok ? await v.json() : []);
      setPosts(po.ok ? await po.json() : []);
      setSessions(se.ok ? await se.json() : []);
      setWorkouts(wo.ok ? await wo.json() : []);
      setRecipes(rc.ok ? await rc.json() : []);
      if (pa.ok) {
        const pj = await pa.json();
        setPayList(Array.isArray(pj) ? pj : pj.payments || []);
        setPayTotal(Number(pj.total || 0));
      } else {
        setPayList([]);
        setPayTotal(0);
      }
      setApiOk(true);
      setUpdatedAt(new Date());
    } catch {
      setApiOk(false);
    }
  }

  useEffect(() => {
    try {
      const t = localStorage.getItem('nf_token');
      if (t) setSaToken(t);
    } catch { /* sin almacenamiento */ }
  }, []);

  useEffect(() => {
    load();
  }, []);

  // --- SINCRONIZACIÓN EN TIEMPO REAL ---
  // Pregunta cada 3s a /api/version. Si otro cliente (cualquiera de las
  // 4 apps móviles) escribió datos, el contador sube y recargamos todo.
  // El aviso SOLO se muestra aquí, en el Admin General.
  useEffect(() => {
    let ultimaV: number | null = null;
    let vivo = true;

    async function latido() {
      if (!vivo) return;
      try {
        const res = await fetch(`${API}/api/version`);
        if (!res.ok) return;
        const { v } = await res.json();
        if (ultimaV === null) {
          ultimaV = v; // primera lectura: solo guardamos, no avisamos
          return;
        }
        if (v !== ultimaV) {
          ultimaV = v;
          await load();
          const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setSyncMsg({ texto: 'Datos sincronizados desde otra app', hora });
          // El aviso se borra solo a los 6s para no estorbar
          setTimeout(() => setSyncMsg(null), 6000);
        }
      } catch {
        /* la API no responde: seguimos intentando en el siguiente ciclo */
      }
    }

    const id = setInterval(latido, 3000);
    return () => { vivo = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 820) setNavOpen(false);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  async function crearUsuario(role: 'USUARIO' | 'ORIENTADOR', specialty?: string | null) {
    setSaving(true);
    setFormMsg('');
    try {
      const res = await af(`${API}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formEmail, name: formName, role, specialty: specialty || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear');
      setFormMsg(`Creado: ${data.email} (${data.role})`);
      setFormName('');
      setFormEmail('');
      await load();
    } catch (e: any) {
      setFormMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  function exportarCSV() {
    const rows = [['nombre', 'email', 'rol', 'creado']];
    users.forEach((u) => rows.push([u.name, u.email, u.role, u.createdAt]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nutriflow-usuarios.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function copiarEmail(email: string) {
    navigator.clipboard?.writeText(email).catch(() => {});
    setFormMsg(`Email copiado: ${email}`);
  }

  async function agregarGimnasio(e: React.FormEvent) {
    e.preventDefault();
    if (!gName.trim() || !gAddress.trim() || !gService.trim()) {
      setFormMsg('Nombre, dirección y servicio son obligatorios.');
      return;
    }
    setGSaving(true);
    try {
      const res = await af(`${API}/api/gyms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: gName, address: gAddress, service: gService, videoUrl: gVideo || null, openHour: gOpen === '' ? null : Number(gOpen), closeHour: gClose === '' ? null : Number(gClose) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar');
      setFormMsg(`Gimnasio registrado: ${data.name}`);
      setGName('');
      setGAddress('');
      setGService('');
      setGVideo('');
      setGOpen('');
      setGClose('');
      await load();
    } catch (err: any) {
      setFormMsg(err.message);
    } finally {
      setGSaving(false);
    }
  }

  async function borrarGimnasio(id: string) {
    try {
      await af(`${API}/api/gyms/${id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setFormMsg(err.message);
    }
  }

  async function agregarRestaurante(e: React.FormEvent) {
    e.preventDefault();
    if (!rName.trim() || !rAddress.trim() || !rService.trim()) {
      setFormMsg('Nombre, dirección y servicio son obligatorios.');
      return;
    }
    setRSaving(true);
    try {
      const res = await af(`${API}/api/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: rName, address: rAddress, service: rService, videoUrl: rVideo || null, openHour: rOpen === '' ? null : Number(rOpen), closeHour: rClose === '' ? null : Number(rClose) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar');
      setFormMsg(`Restaurante registrado: ${data.name}`);
      setRName('');
      setRAddress('');
      setRService('');
      setRVideo('');
      setROpen('');
      setRClose('');
      await load();
    } catch (err: any) {
      setFormMsg(err.message);
    } finally {
      setRSaving(false);
    }
  }

  async function borrarRestaurante(id: string) {
    try {
      await af(`${API}/api/restaurants/${id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setFormMsg(err.message);
    }
  }

  async function borrarPost(id: string) {
    try {
      await af(`${API}/api/posts/${id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setFormMsg(err.message);
    }
  }

  const mealsByUser = meals.reduce<Record<string, number>>((acc, m) => {
    acc[m.userId] = (acc[m.userId] || 0) + 1;
    return acc;
  }, {});

  // Info que procesa cada app independiente (por rol), para el panel del Admin General
  const roleIds: Record<string, string[]> = {};
  users.forEach((u) => {
    if (!roleIds[u.role]) roleIds[u.role] = [];
    roleIds[u.role].push(u.id);
  });
  const mealsByRole: Record<string, number> = {};
  meals.forEach((m) => {
    const owner = users.find((u) => u.id === m.userId);
    const r = owner ? owner.role : 'USUARIO';
    mealsByRole[r] = (mealsByRole[r] || 0) + 1;
  });
  const lastMealByRole: Record<string, string> = {};
  [...meals]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((m) => {
      const owner = users.find((u) => u.id === m.userId);
      const r = owner ? owner.role : 'USUARIO';
      if (!lastMealByRole[r]) lastMealByRole[r] = m.createdAt;
    });

  type Row = {
    id: string;
    name: string;
    email: string;
    tag: string;
    tagLabel: string;
    imc: string;
    prog: number;
    progLabel: string;
    estado: string;
    estadoCls: string;
    live: boolean;
  };

  const mockRows: Row[] = [
    { id: 'mock-1', name: 'Carlos Méndez', email: 'carlos.m@correo.com', tag: 'pro', tagLabel: 'Pro', imc: '24.5', prog: 78, progLabel: '78%', estado: 'Activo', estadoCls: 'ok', live: false },
    { id: 'mock-2', name: 'María López', email: 'maria.l@correo.com', tag: 'free', tagLabel: 'Gratis', imc: '28.2', prog: 45, progLabel: '45%', estado: 'En riesgo', estadoCls: 'risk', live: false },
    { id: 'mock-3', name: 'Juan Pérez', email: 'juan.p@correo.com', tag: 'prem', tagLabel: 'Premium', imc: '22.1', prog: 92, progLabel: '92%', estado: 'Excelente', estadoCls: 'exc', live: false },
    { id: 'mock-4', name: 'Ana Ruiz', email: 'ana.r@correo.com', tag: 'pro', tagLabel: 'Pro', imc: '31.0', prog: 30, progLabel: '30%', estado: 'Inactivo', estadoCls: 'inact', live: false },
    { id: 'mock-5', name: 'Luis Torres', email: 'luis.t@correo.com', tag: 'free', tagLabel: 'Gratis', imc: '25.8', prog: 60, progLabel: '60%', estado: 'Activo', estadoCls: 'ok', live: false },
  ];

  const liveRows: Row[] = users
    .filter((u) => withinDays(u.createdAt, DAY_OPTS[rangeIdx].days))
    .map((u) => {
    const n = mealsByUser[u.id] || 0;
    const prog = Math.min(100, n * 25);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      tag: ROLE_TAG[u.role] || 'free',
      tagLabel: u.role,
      imc: '—',
      prog,
      progLabel: `${n} reg.`,
      estado: 'Activo',
      estadoCls: 'ok',
      live: true,
    };
  });

  const byRoleLive = users.reduce<Record<string, number>>((a, u) => {
    a[u.role] = (a[u.role] || 0) + 1;
    return a;
  }, {});
  const ROLE_DOT: Record<string, string> = {
    USUARIO: '#22c55e',
    ORIENTADOR: '#f97316',
    VENDEDOR: '#c2410c',
    SUPER_ADMIN: '#ea580c',
    QUIOSK: '#fdba74',
  };
  const donutTotal = Object.values(byRoleLive).reduce((a, n) => a + n, 0) || 1;

  // Monitoreo diario y semanal: qué comió cada cliente, cada día
  const monDayMeals = meals.filter((m) => String(m.scheduledAt || m.createdAt).slice(0, 10) === monDay);
  const monDayKcal = monDayMeals.reduce((a, m) => a + Number(m.calories ?? 0), 0);
  const clientName = (id: string) => users.find((u) => u.id === id)?.name || 'Cliente';
  const weekDays: string[] = [];
  {
    for (let i = 6; i >= 0; i--) {
      weekDays.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    }
  }
  const weekStats = weekDays.map((d) => {
    const ms = meals.filter((m) => String(m.scheduledAt || m.createdAt).slice(0, 10) === d);
    return { day: d, n: ms.length, kcal: ms.reduce((a, m) => a + Number(m.calories ?? 0), 0) };
  });
  const weekMax = Math.max(1, ...weekStats.map((w) => w.n));
  const weekClients = users
    .filter((u) => u.role === 'USUARIO')
    .map((u) => {
      const ms = meals.filter((m) => m.userId === u.id && weekDays.includes(String(m.scheduledAt || m.createdAt).slice(0, 10)));
      return {
        name: u.name,
        n: ms.length,
        kcal: ms.reduce((a, m) => a + Number(m.calories ?? 0), 0),
        days: new Set(ms.map((m) => String(m.scheduledAt || m.createdAt).slice(0, 10))).size,
      };
    })
    .sort((a, b) => b.kcal - a.kcal);

  // Retos: racha y días activos calculados de registros reales
  const mealDays = Array.from(new Set(meals.map((m) => String(m.scheduledAt || m.createdAt).slice(0, 10))));
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const todayK = dayKey(new Date());
  const yestK = dayKey(new Date(Date.now() - 864e5));
  let racha = 0;
  {
    let cursor = mealDays.includes(todayK) ? todayK : yestK;
    const set = new Set(mealDays);
    while (set.has(cursor)) {
      racha++;
      cursor = dayKey(new Date(new Date(cursor + 'T00:00:00Z').getTime() - 864e5));
    }
  }
  const allRows = [...mockRows, ...liveRows];
  const shownRows =
    planFilter === 'Todos' ? allRows : allRows.filter((r) => r.tagLabel === planFilter);

  const pros = [
    { ini: 'LR', alt: false, name: 'Laura Ramírez', top: true, group: 'NUTRICIONISTA', stat: 'Nutrición deportiva · 24 clientes', gain: '+2 este mes', rate: '4.9', rev: '128 reseñas' },
    { ini: 'DF', alt: true, name: 'Diego Fuentes', top: false, group: 'ENTRENADOR', stat: 'Fisioterapia · 18 clientes', gain: '+1 este mes', rate: '4.7', rev: '94 reseñas' },
    { ini: 'SV', alt: false, name: 'Sofía Vargas', top: true, group: 'ENTRENADOR', stat: 'Entrenamiento funcional · 31 clientes', gain: '+4 este mes', rate: '5.0', rev: '211 reseñas' },
    { ini: 'MD', alt: true, name: 'Marco Díaz', top: false, group: 'ENTRENADOR', stat: 'Psicología deportiva · 9 clientes', gain: '0 este mes', rate: '4.3', rev: '47 reseñas' },
  ];
  const livePros = users
    .filter((u) => u.role === 'ORIENTADOR')
    .map((u) => ({
      ini: u.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      alt: true,
      name: u.name,
      top: false,
      group: u.specialty === 'ENTRENADOR' ? 'ENTRENADOR' : 'NUTRICIONISTA',
      stat: `${u.specialty === 'ENTRENADOR' ? 'Entrenador' : 'Nutricionista'} · en plataforma`,
      gain: u.email,
      rate: '—',
      rev: 'en vivo API',
      live: true,
    }));
  const orderPros = (list: any[]) =>
    proView === 'Top'
      ? [...list].sort((a, b) => Number(b.rate) - Number(a.rate))
      : [...list].reverse();
  const prosEntrenadores = orderPros([...pros.filter((p) => p.group === 'ENTRENADOR'), ...livePros.filter((p) => p.group === 'ENTRENADOR')]);
  const prosNutricionistas = orderPros([...pros.filter((p) => p.group === 'NUTRICIONISTA'), ...livePros.filter((p) => p.group === 'NUTRICIONISTA')]);

  const perfRows = [
    { ini: 'SV', name: 'Sofía Vargas', sub: 'ID #2041', esp: 'Entrenamiento funcional', cli: 31, rate: '5.0', ing: '$4,820', ingN: 4820, est: 'Activo', cls: 'ok' },
    { ini: 'LR', name: 'Laura Ramírez', sub: 'ID #1987', esp: 'Nutrición deportiva', cli: 24, rate: '4.9', ing: '$3,640', ingN: 3640, est: 'Activo', cls: 'ok' },
    { ini: 'DF', name: 'Diego Fuentes', sub: 'ID #2130', esp: 'Fisioterapia', cli: 18, rate: '4.7', ing: '$2,910', ingN: 2910, est: 'Activo', cls: 'ok' },
    { ini: 'MD', name: 'Marco Díaz', sub: 'ID #2215', esp: 'Psicología deportiva', cli: 9, rate: '4.3', ing: '$1,180', ingN: 1180, est: 'Revisión', cls: 'risk' },
  ];
  const shownPerf = [...perfRows].sort((a, b) => (perfView === 'Ingresos' ? b.ingN - a.ingN : b.cli - a.cli));
  const perfMax = perfView === 'Ingresos' ? 4820 : 31;

  return (
    <div className={`sa-root${navOpen ? ' nav-open' : ''}`}>

      <div className={`scrim${navOpen ? ' on' : ''}`} onClick={() => setNavOpen(false)}></div>

      <div className="layout" id="top">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">N</div>
            <div className="brand-text">
              <div className="brand-name">NutriFlow</div>
              <span className="brand-badge">ADMIN</span>
            </div>
            <button className="drawer-close" aria-label="Cerrar menú" onClick={() => setNavOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="nav" onClick={() => { if (window.innerWidth <= 820) setNavOpen(false); }}>
            <div className="nav-section">
              <div className="nav-label">Plataforma</div>
              <Link className="nav-item active" href="#top">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
                <span className="txt">Dashboard General</span>
              </Link>
              <a className="nav-item" href="#sa-usuarios">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13A4 4 0 0 1 16 11" /></svg>
                <span className="txt">Usuarios</span>
                <span className="nav-count">{apiOk ? users.length : '—'}</span>
              </a>
              <a className="nav-item" href="#sa-profesionales">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6.5 6.5h11v13h-11z" /><path d="M9.5 6.5V4h5v2.5" /><path d="M6.5 12h11" /><path d="M12 15.5v2" /></svg>
                <span className="txt">Profesionales</span>
                <span className="nav-count">{apiOk ? users.filter((u) => u.role === 'ORIENTADOR').length : '—'}</span>
              </a>
              <a className="nav-item" href="#sa-gimnasios">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M10 21v-5h4v5" /><path d="M9 11h1.5M13.5 11H15" /></svg>
                <span className="txt">Gimnasios</span>
                <span className="nav-count">{apiOk ? gyms.length : '—'}</span>
              </a>
              <a className="nav-item" href="#sa-restaurantes">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2" /><path d="M8 2v20M16 2v20M4 11h16" /></svg>
                <span className="txt">Restaurants Fit</span>
                <span className="nav-count">{apiOk ? rests.length : 0}</span>
              </a>
              <a className="nav-item" href="#sa-retos">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" /></svg>
                <span className="txt">Retos y Recompensas</span>
              </a>
              <a className="nav-item" href="#sa-monitoreo">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
                <span className="txt">Monitoreo</span>
                <span className="nav-dot"></span>
              </a>
              <a className="nav-item" href="#sa-contenido">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M10 9.5l5 2.5-5 2.5z" /></svg>
                <span className="txt">Contenido y pagos</span>
                <span className="nav-count">{posts.length + sessions.length}</span>
              </a>
            </div>

            <div className="nav-section">
              <div className="nav-label">Operación</div>
              <a className="nav-item" href="#sa-profesionales">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                <span className="txt">Evaluaciones</span>
              </a>
              <a className="nav-item" href="#sa-rendimiento">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /><path d="M6 15h4" /></svg>
                <span className="txt">Pagos y Comisiones</span>
              </a>
              <button type="button" className="nav-item" onClick={exportarCSV}>
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></svg>
                <span className="txt">Reportes</span>
              </button>
              <a className="nav-item" href="#sa-actividad">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                <span className="txt">Notificaciones Push</span>
                <span className="nav-dot"></span>
              </a>
            </div>

            <div className="nav-section">
              <div className="nav-label">Sistema</div>
              <button type="button" className="nav-item" onClick={() => { setShowClientForm(true); setShowTrainerForm(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
                <span className="txt">Configuración</span>
              </button>
              <a className="nav-item" href="#sa-actividad">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>
                <span className="txt">Logs</span>
              </a>
            </div>
          </nav>

          <div className="sidebar-foot">
            <div className="user-box">
              <div className="avatar">SA</div>
              <div className="user-meta">
                <div className="user-name">Super Admin</div>
                <div className="user-mail">admin@nutriflow.com</div>
              </div>
              <Link className="logout" title="Cerrar sesión" href="/">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
              </Link>
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="header">
            <button className="hamb" aria-label="Abrir o cerrar el panel" aria-expanded={navOpen ? 'true' : 'false'} onClick={() => setNavOpen(!navOpen)} title="Panel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 7v10M17 7v10M4 10v4M20 10v4M7 12h10" /></svg>
            </button>
            <div>
              <div className="h-title">Dashboard General</div>
              <div className="h-sub">Visión global de la plataforma · {apiOk ? `API conectada (${users.length} usuarios)` : 'Actualizado hace 2 min'}{updatedAt ? ` · hace ${Math.max(0, Math.round((Date.now() - updatedAt.getTime()) / 60000))} min` : ''}</div>
            </div>
            <div className="h-spacer"></div>

            <button className="date-picker" onClick={() => setRangeIdx((rangeIdx + 1) % DAY_OPTS.length)} title="Cambiar rango: filtra registros en vivo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
              {DAY_OPTS[rangeIdx].label}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 13, height: 13 }}><path d="M6 9l6 6 6-6" /></svg>
            </button>

            <button className="btn" onClick={exportarCSV} disabled={!apiOk || users.length === 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
              Descargar reporte
            </button>

            <button className="btn btn-secondary" onClick={() => { setShowTrainerForm(!showTrainerForm); setShowClientForm(false); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
              Agregar Entrenador
            </button>

            <button className="btn btn-primary" onClick={() => { setShowClientForm(!showClientForm); setShowTrainerForm(false); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Agregar Cliente
            </button>

            <button className="h-avatar" title="Super Admin — ir a usuarios" onClick={() => document.getElementById('sa-usuarios')?.scrollIntoView({ behavior: 'smooth' })} style={{ border: 0, fontFamily: 'inherit' }}>SA</button>
          </header>

          <main className="content">
            {formMsg && <div className="sa-ok" role="status">{formMsg}</div>}
            {syncMsg && (
              <div className="sa-sync" role="status" aria-live="polite">
                <span className="sa-sync-dot" aria-hidden="true" />
                <span className="sa-sync-txt">{syncMsg.texto}</span>
                <span className="sa-sync-hora">{syncMsg.hora}</span>
              </div>
            )}

            {!saToken && (
              <section className="card">
                <div className="card-head">
                  <div className="card-title">Ingresar al Admin General</div>
                </div>
                <div className="card-body">
                  <form className="sa-form" onSubmit={loginSa}>
                    <input placeholder="correo@ejemplo.com" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                    <input placeholder="Contraseña" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required />
                    <button className="btn btn-primary" disabled={loginBusy}>{loginBusy ? 'Ingresando…' : 'Ingresar'}</button>
                  </form>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10 }}>Usa tu usuario SUPER_ADMIN, p. ej. super_admin@nutriflow.com</p>
                </div>
              </section>
            )}

            {(showClientForm || showTrainerForm) && (
              <section className="card">
                <div className="card-head">
                  <div className="card-title">{showClientForm ? 'Nuevo cliente (USUARIO)' : 'Nuevo entrenador (ORIENTADOR)'}</div>
                </div>
                <div className="card-body">
                  <form
                    className="sa-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      crearUsuario(showClientForm ? 'USUARIO' : 'ORIENTADOR', showClientForm ? null : formSpec);
                    }}
                  >
                    <input placeholder="Nombre" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                    <input placeholder="correo@ejemplo.com" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
                    {!showClientForm && (
                      <select value={formSpec} onChange={(e) => setFormSpec(e.target.value)} style={{ flex: 1, minWidth: 220, padding: '10px 12px', fontSize: 13, lineHeight: '20px', border: '1px solid var(--border)', borderRadius: 10, background: '#fff', color: 'var(--text-primary)' }} aria-label="Especialidad">
                        <option value="ENTRENADOR">Entrenador</option>
                        <option value="NUTRICIONISTA">Nutricionista</option>
                      </select>
                    )}
                    <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                  </form>
                </div>
              </section>
            )}

            <motion.section className="kpi-grid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
              {[
                { label: 'Usuarios totales', val: apiOk ? users.length.toLocaleString('es-PE') : '—', ico: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13A4 4 0 0 1 16 11" /></svg>), cls: '', foot: (<><span className="delta up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 11, height: 11 }}><path d="M12 19V5M5 12l7-7 7 7" /></svg>18%</span><span className="delta-note">este mes</span></>), title: undefined },
                { label: 'Ingresos al mes', val: apiOk ? `$${payTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—', ico: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 6.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>), cls: 'cyan', foot: (<><span className="delta up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 11, height: 11 }}><path d="M12 19V5M5 12l7-7 7 7" /></svg>22%</span><span className="delta-note">vs mes anterior</span></>), title: 'MRR = Ingreso mensual recurrente: cuánto dinero entra cada mes por suscripciones' },
                { label: 'Clientes que se van', val: '3.2%', ico: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M21 12V7h-5" /></svg>), cls: 'amber', foot: (<><span className="delta down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 11, height: 11 }}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>0.8%</span><span className="delta-note">mejoró</span></>), title: 'Churn = Porcentaje de clientes que se van cada mes. Mientras más bajo, mejor' },
                { label: 'Valor por cliente', val: '$142', ico: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z" /></svg>), cls: 'blue', foot: (<><span className="delta up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 11, height: 11 }}><path d="M12 19V5M5 12l7-7 7 7" /></svg>$12</span><span className="delta-note">vs trimestre</span></>), title: 'LTV = Valor de vida del cliente: cuánto dinero deja en total un cliente mientras usa la plataforma' },
                { label: 'Costo por cliente', val: '$18.40', ico: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5l-7 7" /><path d="M12 12l-3 3 3 3 3-3" /><circle cx="6.5" cy="17.5" r="3" /><path d="M9.5 14.5L18 6" /></svg>), cls: 'red', foot: (<><span className="delta down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 11, height: 11 }}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>$3.20</span><span className="delta-note">más eficiente</span></>), title: 'CAC = Costo de adquirir un cliente: cuánto cuesta conseguir cada cliente nuevo' },
              ].map((k, idx) => (
                <motion.div key={k.label} className="kpi" title={k.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: idx * 0.06 }} whileHover={{ y: -2 }}>
                  <div className="kpi-top">
                    <div className="kpi-label">{k.label}</div>
                    <div className={`kpi-ico ${k.cls}`.trim()}>{k.ico}</div>
                  </div>
                  <div className="kpi-val">{k.val}</div>
                  <div className="kpi-foot">{k.foot}</div>
                </motion.div>
              ))}
            </motion.section>

            <motion.section id="sa-apps" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.35 }}>
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13A4 4 0 0 1 16 11" /></svg>
                      Apps independientes — información en vivo
                    </div>
                    <div className="card-sub">Lo que procesa cada app móvil · el Admin General dirige las opciones</div>
                  </div>
                  <span className="live-head"><i></i> live</span>
                </div>
                <div className="card-body">
                  <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
                    {[
                      { app: 'App Usuario', role: 'USUARIO', color: '#22c55e', desc: 'Registros de comidas y entrenos personales' },
                      { app: 'App Orientador', role: 'ORIENTADOR', color: '#f97316', desc: 'Guía nutricional y seguimiento' },
                      { app: 'App Servicio', role: 'VENDEDOR', color: '#c2410c', desc: 'Restaurantes, gimnasios y ventas' },
                    ].map((a, idx) => (
                      <motion.div className="kpi" key={a.role} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: idx * 0.07 }} whileHover={{ y: -2 }}>
                        <div className="kpi-top">
                          <div className="kpi-label">{a.app}</div>
                          <div className="kpi-ico" style={{ background: `${a.color}1f`, borderColor: `${a.color}55`, color: a.color }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 6.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                          </div>
                        </div>
                        <div className="kpi-val">{apiOk ? (roleIds[a.role] || []).length : '—'}</div>
                        <div className="kpi-foot">
                          <span className="delta up">{apiOk ? `${mealsByRole[a.role] || 0} comidas` : 'app independiente'}</span>
                          <span className="delta-note">
                            {apiOk
                              ? lastMealByRole[a.role]
                                ? `últ. registro ${new Date(lastMealByRole[a.role]).toLocaleString('es')}`
                                : 'sin registros'
                              : a.desc}
                          </span>
                        </div>
                        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>{a.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>

            <section id="sa-gimnasios">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M10 21v-5h4v5" /></svg>
                      Gimnasios y restaurantes saludables
                    </div>
                    <div className="card-sub">Registrados por vendedores dueños desde su app · con video</div>
                  </div>
                  <span className="live-head"><i></i> live</span>
                </div>
                <div className="card-body">
                  <form className="sa-form" style={{ marginBottom: 16 }} onSubmit={agregarGimnasio}>
                    <input placeholder="Nombre del gimnasio" value={gName} onChange={(e) => setGName(e.target.value)} required />
                    <input placeholder="Dirección" value={gAddress} onChange={(e) => setGAddress(e.target.value)} required />
                    <input placeholder="Servicio que ofrece" value={gService} onChange={(e) => setGService(e.target.value)} required />
                    <input placeholder="URL del video (opcional)" value={gVideo} onChange={(e) => setGVideo(e.target.value)} style={{ minWidth: 220 }} />
                    <input placeholder="Abre (0-23)" value={gOpen} onChange={(e) => setGOpen(e.target.value)} style={{ width: 130 }} />
                    <input placeholder="Cierra (0-23)" value={gClose} onChange={(e) => setGClose(e.target.value)} style={{ width: 130 }} />
                    <motion.button type="submit" className="btn btn-primary" disabled={gSaving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>{gSaving ? 'Guardando…' : 'Agregar'}</motion.button>
                  </form>
                  {gyms.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin gimnasios registrados todavía.</p>
                  ) : (
                    <div className="grid g2">
                      {gyms.map((g) => (
                        <article className="card" key={g.id} style={{ background: 'var(--bg-app)', boxShadow: 'none' }}>
                          <h3>{g.name}</h3>
                          <p className="muted" style={{ fontSize: 13 }}>{g.address}</p>
                          <p style={{ marginTop: 8 }}><span className="tag pro"><i className="d"></i>{g.service}</span></p>
                          {(g.openHour != null || g.closeHour != null) && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Horario: {g.openHour ?? '?'}:00 – {g.closeHour ?? '?'}:00</p>}
                          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Productos: {products.filter((p) => p.gymId === g.id).length} ({products.filter((p) => p.gymId === g.id && p.approved).length} avalados)</p>
                          {g.owner && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Dueño: {g.owner.name}</p>}
                          {g.videoUrl && (
                            <video controls preload="none" src={g.videoUrl} style={{ width: '100%', borderRadius: 10, marginTop: 10, background: '#000' }} />
                          )}
                          <div style={{ marginTop: 10 }}>
                            <button className="btn-ghost" onClick={() => borrarGimnasio(g.id)}>Eliminar</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section id="sa-restaurantes">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2" /><path d="M8 2v20M16 2v20M4 11h16" /></svg>
                      Restaurantes de comida saludable
                    </div>
                    <div className="card-sub">Registrados por vendedores dueños desde su app · con video</div>
                  </div>
                  <span className="live-head"><i></i> live</span>
                </div>
                <div className="card-body">
                  <form className="sa-form" style={{ marginBottom: 16 }} onSubmit={agregarRestaurante}>
                    <input placeholder="Nombre del restaurante" value={rName} onChange={(e) => setRName(e.target.value)} required />
                    <input placeholder="Dirección" value={rAddress} onChange={(e) => setRAddress(e.target.value)} required />
                    <input placeholder="Servicio que ofrece" value={rService} onChange={(e) => setRService(e.target.value)} required />
                    <input placeholder="URL del video (opcional)" value={rVideo} onChange={(e) => setRVideo(e.target.value)} style={{ minWidth: 220 }} />
                    <input placeholder="Abre (0-23)" value={rOpen} onChange={(e) => setROpen(e.target.value)} style={{ width: 130 }} />
                    <input placeholder="Cierra (0-23)" value={rClose} onChange={(e) => setRClose(e.target.value)} style={{ width: 130 }} />
                    <motion.button type="submit" className="btn btn-primary" disabled={rSaving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>{rSaving ? 'Guardando…' : 'Agregar'}</motion.button>
                  </form>
                  {rests.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin restaurantes registrados todavía.</p>
                  ) : (
                    <div className="grid g2">
                      {rests.map((r) => (
                        <article className="card" key={r.id} style={{ background: 'var(--bg-app)', boxShadow: 'none' }}>
                          <h3>{r.name}</h3>
                          <p className="muted" style={{ fontSize: 13 }}>{r.address}</p>
                          <p style={{ marginTop: 8 }}><span className="tag prem"><i className="d"></i>{r.service}</span></p>
                          {(r.openHour != null || r.closeHour != null) && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Horario: {r.openHour ?? '?'}:00 – {r.closeHour ?? '?'}:00</p>}
                          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Platos en carta: {dishes.filter((dd) => dd.restaurantId === r.id).length}</p>
                          {r.owner && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Dueño: {r.owner.name}</p>}
                          {r.videoUrl && (
                            <video controls preload="none" src={r.videoUrl} style={{ width: '100%', borderRadius: 10, marginTop: 10, background: '#000' }} />
                          )}
                          <div style={{ marginTop: 10 }}>
                            <button className="btn-ghost" onClick={() => borrarRestaurante(r.id)}>Eliminar</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section id="sa-retos">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" /></svg>
                      Retos y Recompensas
                    </div>
                    <div className="card-sub">Desafío 21 días · calculado de registros reales</div>
                  </div>
                  <span className="live-head"><i></i> live</span>
                </div>
                <div className="card-body">
                  <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
                    <div className="kpi">
                      <div className="kpi-top"><div className="kpi-label">Racha actual</div></div>
                      <div className="kpi-val">{apiOk ? `${racha} días` : '—'}</div>
                      <div className="kpi-foot"><span className="delta up">en vivo</span><span className="delta-note">días consecutivos registrando</span></div>
                    </div>
                    <div className="kpi">
                      <div className="kpi-top"><div className="kpi-label">Días activos</div></div>
                      <div className="kpi-val">{apiOk ? mealDays.length : '—'}</div>
                      <div className="kpi-foot"><span className="delta up">total</span><span className="delta-note">días con registros</span></div>
                    </div>
                    <div className="kpi">
                      <div className="kpi-top"><div className="kpi-label">Registros totales</div></div>
                      <div className="kpi-val">{apiOk ? meals.length : '—'}</div>
                      <div className="kpi-foot"><span className="delta up">comidas</span><span className="delta-note">en plataforma</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="sa-monitoreo">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
                      Monitoreo diario y semanal
                    </div>
                    <div className="card-sub">Qué comió cada cliente, cada día · mejora en salud</div>
                  </div>
                  <span className="live-head"><i></i> live</span>
                </div>
                <div className="card-body">
                  <div className="sa-form" style={{ marginBottom: 16 }}>
                    <span className="sub-title">Día:</span>
                    <input type="date" value={monDay} onChange={(e) => setMonDay(e.target.value)} style={{ width: 'auto' }} />
                    <span className="sub-title">{monDayMeals.length} comidas · {monDayKcal} kcal</span>
                  </div>
                  {monDayMeals.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin registros ese día.</p>
                  ) : (
                    <div className="tbl-scroll" style={{ marginBottom: 20 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Cliente</th>
                            <th>Plato</th>
                            <th>Tipo</th>
                            <th>Kcal</th>
                            <th>Origen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monDayMeals.map((m) => (
                            <tr key={m.id}>
                              <td><b style={{ color: 'var(--text-primary)' }}>{clientName(m.userId)}</b></td>
                              <td>{m.name || m.type}</td>
                              <td>{m.type}</td>
                              <td>{m.calories ?? 0}</td>
                              <td>{m.source === 'RESTAURANTE' ? '🍽️ Restaurante' : 'Casa'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="sub-head" style={{ marginTop: 0 }}>
                    <span className="sub-title">Últimos 7 días</span>
                  </div>
                  <div className="bars">
                    {weekStats.map((w) => (
                      <div className="brow" key={w.day}>
                        <span className="bl" style={{ width: 88, color: 'var(--text-secondary)' }}>{w.day.slice(5)}</span>
                        <span className="bt"><span className="bf" style={{ width: `${Math.max(3, Math.round((w.n / weekMax) * 100))}%`, background: 'linear-gradient(90deg,#16a34a,#15803d)' }}></span></span>
                        <span className="bv">{w.n} · {w.kcal}k</span>
                      </div>
                    ))}
                  </div>
                  <div className="sub-head">
                    <span className="sub-title">Por cliente (semana)</span>
                  </div>
                  <div className="tbl-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Comidas</th>
                          <th>Kcal sem.</th>
                          <th>Días activo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekClients.length === 0 && (
                          <tr><td colSpan={4}>Sin clientes.</td></tr>
                        )}
                        {weekClients.map((c) => (
                          <tr key={c.name}>
                            <td><b style={{ color: 'var(--text-primary)' }}>{c.name}</b></td>
                            <td>{c.n}</td>
                            <td>{c.kcal}</td>
                            <td>{c.days}/7</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <section id="sa-contenido">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M10 9.5l5 2.5-5 2.5z" /></svg>
                      Contenido en vivo (reels y publicaciones)
                    </div>
                    <div className="card-sub">Publicado desde App Professional y App Servicio</div>
                  </div>
                  <span className="live-head"><i></i> live</span>
                </div>
                <div className="tbl-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Autor</th>
                        <th>Tipo</th>
                        <th>Título</th>
                        <th>Fecha</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.length === 0 ? (
                        <tr><td colSpan={5}>Sin publicaciones todavía.</td></tr>
                      ) : posts.slice(0, 10).map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="u-cell">
                              <div className="avatar">{initials(p.author?.name || '?')}</div>
                              <div>
                                <div className="nm">{p.author?.name || '—'}</div>
                                <div className="ml">{p.author?.role || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="tag pro"><i className="d"></i>{p.kind || 'REEL'}</span></td>
                          <td>{p.title}</td>
                          <td>{p.createdAt ? new Date(p.createdAt).toLocaleString('es') : '—'}</td>
                          <td><div className="acts" style={{ justifyContent: 'flex-end' }}><button className="btn-ghost" onClick={() => borrarPost(p.id)}>Eliminar</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section id="sa-sesiones">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                      Sesiones y lives
                    </div>
                    <div className="card-sub">Videollamadas creadas desde App Professional y App Servicio</div>
                  </div>
                  <span className="live-head"><i></i> live</span>
                </div>
                <div className="tbl-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Profesional</th>
                        <th>Cliente</th>
                        <th>Tema</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.length === 0 ? (
                        <tr><td colSpan={5}>Sin sesiones todavía.</td></tr>
                      ) : sessions.slice(0, 10).map((s) => (
                        <tr key={s.id}>
                          <td><b style={{ color: 'var(--text-primary)' }}>{s.professional?.name || clientName(s.professionalId)}</b></td>
                          <td>{s.client?.name || 'Abierta'}</td>
                          <td>{s.topic}</td>
                          <td><span className="tag prem"><i className="d"></i>{s.type || 'VIDEOCALL'}</span></td>
                          <td>{s.createdAt ? new Date(s.createdAt).toLocaleString('es') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section id="sa-pagos">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /><path d="M6 15h4" /></svg>
                      Pagos y comisiones
                    </div>
                    <div className="card-sub">Cobros registrados en plataforma · total ${Number(payTotal || 0).toFixed(2)}</div>
                  </div>
                  <span className="live-head"><i></i> live</span>
                </div>
                <div className="tbl-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Concepto</th>
                        <th>Monto</th>
                        <th>Mes</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payList.length === 0 ? (
                        <tr><td colSpan={5}>Sin pagos registrados todavía.</td></tr>
                      ) : payList.slice(0, 10).map((p) => (
                        <tr key={p.id}>
                          <td><b style={{ color: 'var(--text-primary)' }}>{p.user?.name || clientName(p.userId)}</b></td>
                          <td>{p.concept}</td>
                          <td><span className="money">${Number(p.amount || 0).toFixed(2)}</span></td>
                          <td>{p.month || '—'}</td>
                          <td>{p.createdAt ? new Date(p.createdAt).toLocaleString('es') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="row row-2a">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 14l3.5-4 3 3L20 7" /></svg>
                      Crecimiento de usuarios
                    </div>
                    <div className="card-sub">Usuarios totales vs. usuarios activos · {DAY_OPTS[rangeIdx].label.toLowerCase()}</div>
                  </div>
                  <div className="card-tools">
                    {[
                      { label: '12 meses', short: '12M', days: 365 },
                      { label: '6 meses', short: '6M', days: 180 },
                      { label: '30 días', short: '30D', days: 30 },
                    ].map((c) => (
                      <button
                        key={c.label}
                        className={`chip${DAY_OPTS[rangeIdx].days === c.days ? ' on' : ''}`}
                        onClick={() => setRangeIdx(DAY_OPTS.findIndex((d) => d.days === c.days))}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="card-body">
                  <div className="legend">
                    <span className="lg"><i className="lg-dot line" style={{ background: '#22c55e' }}></i> Usuarios totales</span>
                    <span className="lg"><i className="lg-dot line" style={{ background: '#f97316' }}></i> Usuarios activos</span>
                    <span className="lg" style={{ marginLeft: 'auto', color: '#5f7167', fontSize: 11.5 }}>Promedio mensual: <b style={{ color: '#45564c' }}>+118 usuarios</b></span>
                  </div>
                  <div className="chart-wrap">
                    <svg viewBox="0 0 720 300" role="img" aria-label="Gráfico de crecimiento de usuarios">
                      <defs>
                        <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="fillCyan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="strokeGreen" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#16a34a" />
                          <stop offset="100%" stopColor="#15803d" />
                        </linearGradient>
                      </defs>
                      <g>
                        <line className="grid-l" x1="52" y1="30" x2="700" y2="30" />
                        <line className="grid-l" x1="52" y1="80" x2="700" y2="80" />
                        <line className="grid-l" x1="52" y1="130" x2="700" y2="130" />
                        <line className="grid-l" x1="52" y1="180" x2="700" y2="180" />
                        <line className="grid-l" x1="52" y1="230" x2="700" y2="230" />
                        <line className="grid-l" x1="52" y1="256" x2="700" y2="256" />
                      </g>
                      <g textAnchor="end">
                        <text className="axis-lbl" x="44" y="34">1,300</text>
                        <text className="axis-lbl" x="44" y="84">1,100</text>
                        <text className="axis-lbl" x="44" y="134">900</text>
                        <text className="axis-lbl" x="44" y="184">700</text>
                        <text className="axis-lbl" x="44" y="234">500</text>
                        <text className="axis-lbl" x="44" y="260">300</text>
                      </g>
                      <g textAnchor="middle">
                        <text className="axis-lbl" x="62" y="278">Ene</text>
                        <text className="axis-lbl" x="116" y="278">Feb</text>
                        <text className="axis-lbl" x="170" y="278">Mar</text>
                        <text className="axis-lbl" x="224" y="278">Abr</text>
                        <text className="axis-lbl" x="278" y="278">May</text>
                        <text className="axis-lbl" x="332" y="278">Jun</text>
                        <text className="axis-lbl" x="386" y="278">Jul</text>
                        <text className="axis-lbl" x="440" y="278">Ago</text>
                        <text className="axis-lbl" x="494" y="278">Sep</text>
                        <text className="axis-lbl" x="548" y="278">Oct</text>
                        <text className="axis-lbl" x="602" y="278">Nov</text>
                        <text className="axis-lbl" x="656" y="278">Dic</text>
                      </g>
                      <path d="M62,238 L116,222 L170,206 L224,190 L278,168 L332,150 L386,128 L440,108 L494,88 L548,70 L602,52 L656,34 L656,256 L62,256 Z" fill="url(#fillGreen)" />
                      <path d="M62,250 L116,242 L170,232 L224,222 L278,208 L332,196 L386,182 L440,170 L494,156 L548,142 L602,126 L656,110 L656,256 L62,256 Z" fill="url(#fillCyan)" />
                      <path d="M62,238 L116,222 L170,206 L224,190 L278,168 L332,150 L386,128 L440,108 L494,88 L548,70 L602,52 L656,34" fill="none" stroke="url(#strokeGreen)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M62,250 L116,242 L170,232 L224,222 L278,208 L332,196 L386,182 L440,170 L494,156 L548,142 L602,126 L656,110" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 5" />
                      <g fill="#ffffff" stroke="#22c55e" strokeWidth="2.5">
                        <circle cx="62" cy="238" r="3.6" /><circle cx="116" cy="222" r="3.6" /><circle cx="170" cy="206" r="3.6" />
                        <circle cx="224" cy="190" r="3.6" /><circle cx="278" cy="168" r="3.6" /><circle cx="332" cy="150" r="3.6" />
                        <circle cx="386" cy="128" r="3.6" /><circle cx="440" cy="108" r="3.6" /><circle cx="494" cy="88" r="3.6" />
                        <circle cx="548" cy="70" r="3.6" /><circle cx="602" cy="52" r="3.6" />
                        <circle cx="656" cy="34" r="5.5" fill="#22c55e" />
                      </g>
                      <g fill="#ffffff" stroke="#f97316" strokeWidth="2">
                        <circle cx="62" cy="250" r="3" /><circle cx="116" cy="242" r="3" /><circle cx="170" cy="232" r="3" />
                        <circle cx="224" cy="222" r="3" /><circle cx="278" cy="208" r="3" /><circle cx="332" cy="196" r="3" />
                        <circle cx="386" cy="182" r="3" /><circle cx="440" cy="170" r="3" /><circle cx="494" cy="156" r="3" />
                        <circle cx="548" cy="142" r="3" /><circle cx="602" cy="126" r="3" />
                        <circle cx="656" cy="110" r="4.5" fill="#f97316" />
                      </g>
                      <g>
                        <rect x="596" y="0" width="98" height="26" rx="7" fill="#ffffff" stroke="#22c55e" strokeWidth="1" opacity=".96" />
                        <text x="645" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="#15803d" fontFamily="Inter, sans-serif">1,247 usuarios</text>
                      </g>
                      <g>
                        <rect x="600" y="112" width="94" height="24" rx="7" fill="#ffffff" stroke="#f97316" strokeWidth="1" opacity=".96" />
                        <text x="647" y="128" textAnchor="middle" fontSize="11" fontWeight="700" fill="#f97316" fontFamily="Inter, sans-serif">842 activos</text>
                      </g>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 8.5 6" /></svg>
                      Distribución de usuarios
                    </div>
                    <div className="card-sub">Por tipo de plan contratado</div>
                  </div>
                  <div className="card-tools">
                    <button className={`chip${donutView === 'Total' ? ' on' : ''}`} onClick={() => setDonutView('Total')}>Todos</button>
                    <button className={`chip${donutView === 'Plan' ? ' on' : ''}`} onClick={() => setDonutView('Plan')}>Por plan</button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="donut-box">
                    <svg viewBox="0 0 120 120" role="img" aria-label="Donut de distribución de usuarios">
                      <g transform="rotate(-90 60 60)" fill="none" strokeWidth="18">
                        <circle cx="60" cy="60" r="46" stroke="#e8efe0" />
                        <circle cx="60" cy="60" r="46" stroke="#22c55e" strokeDasharray="196.5 92.5" strokeDashoffset="0" />
                        <circle cx="60" cy="60" r="46" stroke="#f97316" strokeDasharray="69.4 219.6" strokeDashoffset="-196.5" />
                        <circle cx="60" cy="60" r="46" stroke="#ea580c" strokeDasharray="23.1 265.9" strokeDashoffset="-265.9" />
                      </g>
                    </svg>
                    <div className="donut-center">
                      <div className="big">{donutView === 'Total' && apiOk ? users.length.toLocaleString('es') : '1,247'}</div>
                      <div className="sm">usuarios{donutView === 'Total' ? ' en vivo' : ''}</div>
                    </div>
                  </div>

                  <div className="dlist">
                    {donutView === 'Total' && apiOk && users.length > 0 ? (
                      Object.entries(byRoleLive).map(([r, n]) => (
                        <div className="ditem" key={r}>
                          <i className="sw" style={{ background: ROLE_DOT[r] || '#5f7167' }}></i>
                          <span className="nm">{r}</span>
                          <span className="vl">{n}</span>
                          <span className="pc">{Math.round((n / donutTotal) * 100)}%</span>
                        </div>
                      ))
                    ) : (
                      <>
                    <div className="ditem">
                      <i className="sw" style={{ background: '#22c55e' }}></i>
                      <span className="nm">Plan Gratis</span>
                      <span className="vl">848</span>
                      <span className="pc">68%</span>
                    </div>
                    <div className="ditem">
                      <i className="sw" style={{ background: '#f97316' }}></i>
                      <span className="nm">Plan Pro</span>
                      <span className="vl">299</span>
                      <span className="pc">24%</span>
                    </div>
                    <div className="ditem">
                      <i className="sw" style={{ background: '#ea580c' }}></i>
                      <span className="nm">Plan Premium</span>
                      <span className="vl">100</span>
                      <span className="pc">8%</span>
                    </div>
                      </>
                    )}
                  </div>

                  <div className="sub-head">
                    <span className="sub-title">Ingresos por plan</span>
                    <span className="delta up">+22% MRR</span>
                  </div>
                  <div className="bars">
                    <div className="brow">
                      <span className="bl" style={{ color: '#22c55e' }}>Free</span>
                      <span className="bt"><span className="bf" style={{ width: '14%', background: 'linear-gradient(90deg,#16a34a,#22c55e)' }}></span></span>
                      <span className="bv">$0</span>
                    </div>
                    <div className="brow">
                      <span className="bl" style={{ color: '#f97316' }}>Pro</span>
                      <span className="bt"><span className="bf" style={{ width: '62%', background: 'linear-gradient(90deg,#c2410c,#f97316)' }}></span></span>
                      <span className="bv">$11.4k</span>
                    </div>
                    <div className="brow">
                      <span className="bl" style={{ color: '#f97316' }}>Prem</span>
                      <span className="bt"><span className="bf" style={{ width: '38%', background: 'linear-gradient(90deg,#ea580c,#fdba74)' }}></span></span>
                      <span className="bv">$7.0k</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="row row-2b" id="sa-usuarios">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
                      Usuarios recientes
                    </div>
                    <div className="card-sub">Últimos registros y actividad de la comunidad{apiOk ? ' · + usuarios en vivo de la API' : ''}</div>
                  </div>
                  <div className="card-tools">
                    {['Todos', 'Pro', 'Premium', 'Gratis'].map((f) => (
                      <button key={f} className={`chip${planFilter === f ? ' on' : ''}`} onClick={() => setPlanFilter(f)}>{f}</button>
                    ))}
                  </div>
                </div>
                <div className="tbl-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Plan</th>
                        <th>IMC</th>
                        <th>Progreso</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownRows.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div className="u-cell">
                              <div className="avatar">{initials(r.name)}</div>
                              <div>
                                <div className="nm">{r.name}{r.live ? ' · en vivo' : ''}</div>
                                <div className="ml">{r.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className={`tag ${r.tag}`}><i className="d"></i>{r.tagLabel}</span></td>
                          <td><b style={{ color: '#12211a' }}>{r.imc}</b></td>
                          <td>
                            <div className="mini-bar">
                              <span className="mini-track"><span className="mini-fill" style={{ width: `${r.prog}%` }}></span></span>
                              <span className="mini-num">{r.progLabel}</span>
                            </div>
                          </td>
                          <td><span className={`tag ${r.estadoCls}`}><i className="d"></i>{r.estado}</span></td>
                          <td>
                            <div className="acts" style={{ justifyContent: 'flex-end' }}>
                              <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setExpanded(expanded === r.id ? null : r.id)}>{expanded === r.id ? 'Ocultar' : 'Ver'}</button>
                              <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => { setFormName(r.name); setFormEmail(r.email); setShowClientForm(true); setShowTrainerForm(false); }}>Editar</button>
                              <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => copiarEmail(r.email)}>Copiar correo</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {shownRows.length === 0 && (
                        <tr><td colSpan={6}>Sin filas para este filtro.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {expanded && (
                  <div className="card-body" style={{ borderTop: '1px solid var(--border)' }}>
                    {(() => {
                      const r = allRows.find((x) => x.id === expanded);
                      if (!r) return null;
                      const u = r.live ? users.find((x) => x.id === r.id) : null;
                      const n = u ? mealsByUser[u.id] || 0 : 0;
                      return (
                        <>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            <b style={{ color: 'var(--text-primary)' }}>{r.name}</b> · {r.email} · Plan {r.tagLabel} · IMC {r.imc} · Progreso {r.progLabel} · Estado {r.estado}
                            {r.live ? ' · registro en vivo de la API' : ' · registro de la maqueta'}
                          </p>
                          {u && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                              Membresía: <b>{u.membership || 'BASICA'}</b>{u.membership === 'PREMIUM' ? ' (con seguimiento profesional)' : ''} · Comidas monitoreadas: <b>{n}</b>
                              {meals.filter((mm) => mm.userId === u.id && mm.name).slice(-3).reverse().map((mm) => mm.name).join(' · ') !== '' && (
                                <> · Últimos platos: <b>{meals.filter((mm) => mm.userId === u.id && mm.name).slice(-3).reverse().map((mm) => mm.name).join(' · ')}</b></>
                              )}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                <div className="tbl-foot">
                  <button className="btn-ghost" onClick={exportarCSV} disabled={!apiOk}>
                    Descargar lista completa en CSV
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                </div>
              </div>

              <div className="card" id="sa-profesionales">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z" /></svg>
                      Evaluaciones de profesionales
                    </div>
                    <div className="card-sub">Rating y cartera de clientes</div>
                  </div>
                  <div className="card-tools">
                    <button className={`chip${proView === 'Top' ? ' on' : ''}`} onClick={() => setProView('Top')}>Mejor valorados</button>
                    <button className={`chip${proView === 'Nuevos' ? ' on' : ''}`} onClick={() => setProView('Nuevos')}>Recientes</button>
                  </div>
                </div>
                <div className="card-body">
                  <form
                    className="sa-form"
                    style={{ marginBottom: 16, padding: 14, border: '1px dashed var(--border)', borderRadius: 12 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      crearUsuario('ORIENTADOR', formSpec);
                    }}
                  >
                    <span className="sub-title" style={{ width: '100%' }}>Crear profesional</span>
                    <input placeholder="Nombre" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                    <input placeholder="correo@ejemplo.com" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
                    <select value={formSpec} onChange={(e) => setFormSpec(e.target.value)} style={{ flex: 1, minWidth: 220, padding: '10px 12px', fontSize: 13, lineHeight: '20px', border: '1px solid var(--border)', borderRadius: 10, background: '#fff', color: 'var(--text-primary)' }} aria-label="Especialidad">
                      <option value="ENTRENADOR">Entrenador</option>
                      <option value="NUTRICIONISTA">Nutricionista</option>
                    </select>
                    <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Crear'}</button>
                  </form>
                  <div className="sub-head" style={{ marginTop: 0 }}>
                    <span className="sub-title">Entrenadores ({prosEntrenadores.length})</span>
                  </div>
                  <div className="plist">
                    {prosEntrenadores.map((p) => (
                      <div className="pitem" key={p.name}>
                        <div className={`avatar${p.alt ? ' alt' : ''}`}>{p.ini}</div>
                        <div className="pmeta">
                          <div className="pname">{p.name} {p.top && <span className="pro-badge">TOP</span>}{p.live && <span className="pro-badge">EN VIVO</span>}</div>
                          <div className="pstat">{p.stat} · <span className="gain">{p.gain}</span></div>
                        </div>
                        <div className="prate">
                          <div className="r">{p.rate} <svg viewBox="0 0 24 24"><path d="M12 2l3 6.9 7.4.6-5.6 5 1.7 7.3L12 18l-6.5 3.8 1.7-7.3-5.6-5L9 8.9z" /></svg></div>
                          <div className="c">{p.rev}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="sub-head">
                    <span className="sub-title">Nutricionistas ({prosNutricionistas.length})</span>
                  </div>
                  <div className="plist">
                    {prosNutricionistas.map((p) => (
                      <div className="pitem" key={p.name}>
                        <div className={`avatar${p.alt ? ' alt' : ''}`}>{p.ini}</div>
                        <div className="pmeta">
                          <div className="pname">{p.name} {p.top && <span className="pro-badge">TOP</span>}{p.live && <span className="pro-badge">EN VIVO</span>}</div>
                          <div className="pstat">{p.stat} · <span className="gain">{p.gain}</span></div>
                        </div>
                        <div className="prate">
                          <div className="r">{p.rate} <svg viewBox="0 0 24 24"><path d="M12 2l3 6.9 7.4.6-5.6 5 1.7 7.3L12 18l-6.5 3.8 1.7-7.3-5.6-5L9 8.9z" /></svg></div>
                          <div className="c">{p.rev}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card" style={{ background: 'var(--bg-app)', boxShadow: 'none' }}>
                    <div className="card-head" style={{ padding: '13px 15px' }}>
                      <div className="card-title" style={{ fontSize: 12.5 }}>Distribución de evaluaciones</div>
                      <span className="live-head"><i></i> en vivo</span>
                    </div>
                    <div className="card-body" style={{ padding: 15 }}>
                      <div className="bars">
                        <div className="brow">
                          <span className="bl" style={{ color: '#fdba74' }}>5 ★</span>
                          <span className="bt"><span className="bf" style={{ width: '68%', background: 'linear-gradient(90deg,#ea580c,#fdba74)' }}></span></span>
                          <span className="bv">68%</span>
                        </div>
                        <div className="brow">
                          <span className="bl" style={{ color: '#45564c' }}>4 ★</span>
                          <span className="bt"><span className="bf" style={{ width: '24%', background: 'linear-gradient(90deg,#c2cdbe,#5f7167)' }}></span></span>
                          <span className="bv">24%</span>
                        </div>
                        <div className="brow">
                          <span className="bl" style={{ color: '#c2410c' }}>3 ★</span>
                          <span className="bt"><span className="bf" style={{ width: '6%', background: 'linear-gradient(90deg,#c2410c,#c2410c)' }}></span></span>
                          <span className="bv">6%</span>
                        </div>
                        <div className="brow">
                          <span className="bl" style={{ color: '#c2410c' }}>2 ★</span>
                          <span className="bt"><span className="bf" style={{ width: '2%', background: 'linear-gradient(90deg,#c2410c,#c2410c)' }}></span></span>
                          <span className="bv">2%</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Total reseñas</div>
                          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.6px' }}>480</div>
                        </div>
                        <div style={{ width: 1, background: 'var(--border)' }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Promedio</div>
                          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.6px', color: '#fdba74' }}>4.6 ★</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="row row-2b">
              <div className="card" id="sa-rendimiento">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
                      Profesionales — Rendimiento
                    </div>
                    <div className="card-sub">Ingresos y cartera · mes en curso</div>
                  </div>
                  <div className="card-tools">
                    <button className={`chip${perfView === 'Ingresos' ? ' on' : ''}`} onClick={() => setPerfView('Ingresos')}>Ingresos</button>
                    <button className={`chip${perfView === 'Clientes' ? ' on' : ''}`} onClick={() => setPerfView('Clientes')}>Clientes</button>
                  </div>
                </div>
                <div className="tbl-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Profesional</th>
                        <th>Especialidad</th>
                        <th>Clientes</th>
                        <th>Rating</th>
                        <th>Ingresos</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownPerf
                        .map((r) => (
                          <tr key={r.name}>
                            <td>
                              <div className="u-cell">
                                <div className="avatar">{r.ini}</div>
                                <div><div className="nm">{r.name}</div><div className="ml">{r.sub}</div></div>
                              </div>
                            </td>
                            <td>{r.esp}</td>
                            <td><b style={{ color: '#12211a' }}>{r.cli}</b></td>
                            <td><span className="star">{r.rate} <svg viewBox="0 0 24 24"><path d="M12 2l3 6.9 7.4.6-5.6 5 1.7 7.3L12 18l-6.5 3.8 1.7-7.3-5.6-5L9 8.9z" /></svg></span></td>
                            <td><span className="money">{r.ing}</span></td>
                            <td><span className={`tag ${r.cls}`}><i className="d"></i>{r.est}</span></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="card-body" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="sub-head" style={{ marginTop: 0 }}>
                    <span className="sub-title">Top performers del mes · por {perfView === 'Ingresos' ? 'ingresos' : 'clientes'}</span>
                    <span className="delta up">+$2,410 vs. mes anterior</span>
                  </div>
                  <div className="bars">
                    {shownPerf.map((r, i) => {
                      const v = perfView === 'Ingresos' ? r.ingN : r.cli;
                      const w = Math.max(4, Math.round((v / perfMax) * 100));
                      const grads = [
                        'linear-gradient(90deg,#16a34a,#15803d)',
                        'linear-gradient(90deg,#16a34a,#15803d)',
                        'linear-gradient(90deg,#c2410c,#f97316)',
                        'linear-gradient(90deg,#ea580c,#fdba74)',
                      ];
                      return (
                        <div className="brow" key={r.name}>
                          <span className="bl" style={{ width: 88, color: 'var(--text-secondary)' }}>{r.name.split(' ').map((w, j) => (j === 0 ? w[0] + '.' : w)).join(' ')}</span>
                          <span className="bt"><span className="bf" style={{ width: `${w}%`, background: grads[i % grads.length] }}></span></span>
                          <span className="bv">{perfView === 'Ingresos' ? `${w}%` : `${r.cli} cli`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="card" id="sa-actividad">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
                      Actividad en tiempo real
                    </div>
                    <div className="card-sub">Eventos en vivo de la plataforma</div>
                  </div>
                  <span className="live-head"><i></i> live</span>
                </div>
                <div className="card-body">
                  <div className="feed">
                    {apiOk && meals.filter((m) => withinDays(m.createdAt, DAY_OPTS[rangeIdx].days)).slice(-3).reverse().map((m) => (
                      <div className="feed-item" key={m.id}>
                        <div className="live-dot"><i></i></div>
                        <div className="feed-body">
                          <div className="feed-txt"><b>Comida registrada:</b> {m.type} — {m.calories ?? 0} kcal</div>
                          <div className="feed-meta">
                            <span className="feed-type ft-user">Registro</span>
                            <span className="feed-time">{new Date(m.createdAt).toLocaleString('es')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="feed-item">
                      <div className="live-dot"><i></i></div>
                      <div className="feed-body">
                        <div className="feed-txt"><b>Carlos Miz</b> completó un reto de 7 días</div>
                        <div className="feed-meta">
                          <span className="feed-type ft-chal">Reto</span>
                          <span className="feed-time">hace 1 min</span>
                        </div>
                      </div>
                    </div>

                    <div className="feed-item">
                      <div className="live-dot"><i></i></div>
                      <div className="feed-body">
                        <div className="feed-txt"><b>Nuevo usuario registrado</b> — plan Pro</div>
                        <div className="feed-meta">
                          <span className="feed-type ft-user">Registro</span>
                          <span className="feed-time">hace 3 min</span>
                        </div>
                      </div>
                    </div>

                    <div className="feed-item">
                      <div className="live-dot"><i></i></div>
                      <div className="feed-body">
                        <div className="feed-txt"><b>Pago recibido: $49.99</b> — Plan Pro</div>
                        <div className="feed-meta">
                          <span className="feed-type ft-money">Pago</span>
                          <span className="feed-time">hace 5 min</span>
                        </div>
                      </div>
                    </div>

                    <div className="feed-item">
                      <div className="live-dot"><i></i></div>
                      <div className="feed-body">
                        <div className="feed-txt"><b>Laura Ramírez</b> completó un video de presentación</div>
                        <div className="feed-meta">
                          <span className="feed-type ft-media">Contenido</span>
                          <span className="feed-time">hace 8 min</span>
                        </div>
                      </div>
                    </div>

                    <div className="feed-item">
                      <div className="live-dot"><i></i></div>
                      <div className="feed-body">
                        <div className="feed-txt">El reto <b>&quot;Desafío 21 días&quot;</b> alcanzó <b>500 participantes</b></div>
                        <div className="feed-meta">
                          <span className="feed-type ft-chal">Hito</span>
                          <span className="feed-time">hace 12 min</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Eventos/h</div>
                      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.6px', color: '#15803d' }}>184</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Usuarios online</div>
                      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.6px', color: '#f97316' }}>63</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Uptime</div>
                      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.6px', color: '#fdba74' }}>99.98%</div>
                    </div>
                  </div>

                  <Link className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} href="/comidas">
                    Ver bitácora completa
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </Link>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
