"use client";
import { useCallback, useEffect, useState } from "react";
import UserSwitcher from "@/components/UserSwitcher";
import { api, type ApiMeal } from "@/lib/api";
import { hoyISO } from "@/lib/nutrition";

const TIPOS = ["Desayuno", "Comida", "Cena", "Colación"];

export default function Comidas() {
  const [userId, setUserId] = useState("");
  const [meals, setMeals] = useState<ApiMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "Desayuno", nombre: "", calories: "", proteinG: "", carbsG: "", fatG: "" });

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      setMeals(await api.meals(id));
    } catch (e: any) {
      setError(e.message || "No se pudo cargar. Verifica que la API esté corriendo en el puerto 3001.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  const num = (v: string) => (v === "" ? null : Number(String(v).replace(",", ".")));

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const kcal = num(form.calories) ?? 0;
    if (!(kcal >= 0 && kcal <= 5000)) {
      setError("Indica las calorías (0-5000).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.addMeal({
        userId,
        type: form.type,
        name: form.nombre.trim() || null,
        source: "CASA",
        calories: kcal,
        proteinG: num(form.proteinG),
        carbsG: num(form.carbsG),
        fatG: num(form.fatG),
      });
      setForm({ type: "Desayuno", nombre: "", calories: "", proteinG: "", carbsG: "", fatG: "" });
      await load(userId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function borrar(id: string) {
    try {
      await api.delMeal(id);
      await load(userId);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const hoy = hoyISO();
  const hoyMeals = meals.filter((m) => (m.scheduledAt || m.createdAt).slice(0, 10) === hoy);
  const totalKcal = hoyMeals.reduce((a, m) => a + Number(m.calories ?? 0), 0);

  return (
    <>

      <h1>Comidas</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Registra lo que comes hoy.</p>
      <UserSwitcher value={userId} onChange={setUserId} />
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="grid g2">
        <form onSubmit={agregar} className="card">
          <div className="field"><label htmlFor="nombre">Plato / comida</label><input id="nombre" name="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Quinua con pollo" /></div>
          <div className="field"><label htmlFor="tipo">Momento</label>
            <select id="tipo" name="tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div className="row">
            <div className="field"><label htmlFor="kcal">Calorías</label><input id="kcal" name="kcal" type="number" min={0} max={5000} value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} required /></div>
            <div className="field"><label htmlFor="proteina">Proteína (g)</label><input id="proteina" name="proteina" type="number" step="0.1" min={0} value={form.proteinG} onChange={(e) => setForm({ ...form, proteinG: e.target.value })} /></div>
            <div className="field"><label htmlFor="carbs">Carbs (g)</label><input id="carbs" name="carbs" type="number" step="0.1" min={0} value={form.carbsG} onChange={(e) => setForm({ ...form, carbsG: e.target.value })} /></div>
            <div className="field"><label htmlFor="grasa">Grasas (g)</label><input id="grasa" name="grasa" type="number" step="0.1" min={0} value={form.fatG} onChange={(e) => setForm({ ...form, fatG: e.target.value })} /></div>
          </div>
          <button className="btn" disabled={saving || !userId}>{saving ? "Guardando…" : "Agregar"}</button>
        </form>
        <section className="card"><h3 style={{ marginBottom: 8 }}>Hoy · {totalKcal} kcal</h3>
          {loading ? <p className="muted">Cargando…</p> : hoyMeals.length === 0 ? <p className="muted">Nada registrado todavía.</p> : (
            <ul className="list">{hoyMeals.map((c) => (
              <li key={c.id}><span className="pill">{c.type}</span>
                <span className="grow">{c.name || c.type}{c.source === "RESTAURANTE" ? " · 🍽️ restaurante" : ""}<br /><span className="muted">{Number(c.proteinG ?? 0)}P · {Number(c.carbsG ?? 0)}C · {Number(c.fatG ?? 0)}G</span></span>
                <b>{c.calories ?? 0}</b>
                <button className="linkbtn" aria-label={`Borrar ${c.name || c.type}`} onClick={() => borrar(c.id)}>Borrar</button>
              </li>))}</ul>)}
        </section>
      </div>
    </>
  );
}
