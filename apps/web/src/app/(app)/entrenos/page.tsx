"use client";
import { useCallback, useEffect, useState } from "react";
import UserSwitcher from "@/components/UserSwitcher";
import { api, type ApiWorkout } from "@/lib/api";
import { hoyISO } from "@/lib/nutrition";

const TIPOS = ["Carrera", "Fuerza", "Yoga", "Natación", "Caminata", "Cardio"];

export default function Entrenos() {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<ApiWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "Carrera", date: hoyISO(), duration: "30", kcal: "" });

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const list = await api.workouts(id);
      setItems([...list].sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt)).slice(0, 20));
    } catch (e: any) {
      setError(e.message || "No se pudo cargar. Verifica que la API esté corriendo en el puerto 3001.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const min = Math.round(Number(String(form.duration).replace(",", ".")));
    if (!(min > 0 && min <= 600)) {
      setError("Indica los minutos (1-600).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.addWorkout({
        userId,
        type: form.type,
        date: form.date,
        durationMin: min,
        caloriesBurned: form.kcal === "" ? Math.round(min * 8) : Math.max(0, Math.round(Number(form.kcal))),
      });
      setForm({ type: "Carrera", date: hoyISO(), duration: "30", kcal: "" });
      await load(userId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function borrar(id: string) {
    try {
      await api.delWorkout(id);
      await load(userId);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <>

      <h1>Entrenos</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Registra tus sesiones de ejercicio.</p>
      <UserSwitcher value={userId} onChange={setUserId} />
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="grid g2">
        <form onSubmit={agregar} className="card">
          <div className="field"><label htmlFor="tipo">Actividad</label>
            <select id="tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div className="row">
            <div className="field"><label htmlFor="fecha">Fecha</label><input id="fecha" name="fecha" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
            <div className="field"><label htmlFor="minutos">Minutos</label><input id="minutos" name="minutos" type="number" min={1} max={600} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required /></div>
            <div className="field"><label htmlFor="kcal">Kcal quemadas</label><input id="kcal" name="kcal" type="number" min={0} placeholder="auto" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} /></div>
          </div>
          <button className="btn" disabled={saving || !userId}>{saving ? "Guardando…" : "Agregar"}</button>
        </form>
        <section className="card"><h3 style={{ marginBottom: 8 }}>Últimas sesiones</h3>
          {loading ? <p className="muted">Cargando…</p> : items.length === 0 ? <p className="muted">Aún no registras entrenos.</p> : (
            <ul className="list">{items.map((w) => (
              <li key={w.id}><span className="pill">{(w.date || w.createdAt).slice(0, 10)}</span>
                <span className="grow">{w.type}</span>
                <b>{w.durationMin ?? 0} min</b>
                <span className="muted">{w.caloriesBurned ?? 0} kcal</span>
                <button className="linkbtn" aria-label={`Borrar ${w.type}`} onClick={() => borrar(w.id)}>Borrar</button>
              </li>))}</ul>)}
        </section>
      </div>
    </>
  );
}
