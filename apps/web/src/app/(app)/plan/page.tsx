"use client";
import { useCallback, useEffect, useState } from "react";
import UserSwitcher from "@/components/UserSwitcher";
import { api, type ApiMeal, type ApiProfile, type ApiWorkout } from "@/lib/api";
import { calcularMetas, hoyISO, type Actividad, type Objetivo } from "@/lib/nutrition";

function edadDesde(birth: string | null): number {
  if (!birth) return 30;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return 30;
  const now = new Date();
  let e = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) e--;
  return Math.min(100, Math.max(14, e));
}

function mapActividad(v: string | null): Actividad {
  const s = (v || "").toLowerCase();
  if (s.includes("sedent")) return "sedentaria";
  if (s.includes("liger")) return "ligera";
  if (s.includes("alt") || s.includes("intens")) return "alta";
  return "moderada";
}

function mapObjetivo(v: string | null): Objetivo {
  const s = (v || "").toLowerCase();
  if (s.includes("perder") || s.includes("bajar")) return "perder";
  if (s.includes("ganar") || s.includes("subir")) return "ganar";
  return "mantener";
}

export default function Plan() {
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [meals, setMeals] = useState<ApiMeal[]>([]);
  const [workouts, setWorkouts] = useState<ApiWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ heightCm: "", weightKg: "", activityLevel: "Moderado", goal: "Mantener peso" });

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [p, m, w] = await Promise.all([api.profile(id), api.meals(id), api.workouts(id)]);
      setProfile(p);
      setMeals(m);
      setWorkouts(w);
      setForm({
        heightCm: p.heightCm != null ? String(p.heightCm) : "",
        weightKg: p.weightKg != null ? String(p.weightKg) : "",
        activityLevel: p.activityLevel || "Moderado",
        goal: p.goal || "Mantener peso",
      });
    } catch (e: any) {
      setError(e.message || "No se pudo cargar. Verifica que la API esté corriendo en el puerto 3001.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const h = Number(String(form.heightCm).replace(",", "."));
    const p = Number(String(form.weightKg).replace(",", "."));
    if (!(h >= 100 && h <= 230) || !(p >= 30 && p <= 300)) {
      setError("Revisa altura (100-230 cm) y peso (30-300 kg).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.saveProfile({ userId, heightCm: h, weightKg: p, activityLevel: form.activityLevel, goal: form.goal });
      await load(userId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hoy = hoyISO();
  const mealsHoy = meals.filter((m) => (m.scheduledAt || m.createdAt).slice(0, 10) === hoy);
  const kcal = mealsHoy.reduce((a, m) => a + Number(m.calories ?? 0), 0);
  const prot = mealsHoy.reduce((a, m) => a + Number(m.proteinG ?? 0), 0);
  const quemadas = workouts
    .filter((w) => (w.date || w.createdAt).slice(0, 10) === hoy)
    .reduce((a, w) => a + Number(w.caloriesBurned ?? 0), 0);

  const metas =
    profile && profile.heightCm && profile.weightKg
      ? calcularMetas({
          sexo: (profile.gender || "").toLowerCase().startsWith("m") ? "m" : "f",
          edad: edadDesde(profile.birthDate),
          alturaCm: Number(profile.heightCm),
          pesoKg: Number(profile.weightKg),
          actividad: mapActividad(profile.activityLevel),
          objetivo: mapObjetivo(profile.goal),
        })
      : null;

  const faltaK = metas ? Math.max(0, metas.kcal - kcal + quemadas) : 0;
  const faltaP = metas ? Math.max(0, Math.round(metas.proteinaG - prot)) : 0;

  return (
    <>

      <span className="kicker">Plan integral · un solo día, un solo sistema</span>
      <h1 style={{ marginTop: 12 }}>Tu día completo</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Comer y moverse no son dos planes. Son uno y se ajustan entre sí.</p>
      <UserSwitcher value={userId} onChange={setUserId} />
      {error && <div className="alert" role="alert">{error}</div>}
      {loading ? (
        <p>Cargando…</p>
      ) : !metas ? (
        <div className="card"><p className="muted">Completa tu altura y peso para calcular tus metas.</p></div>
      ) : (
        <div className="grid g2">
          <section className="card"><span className="muted">Lo que comiste</span>
            <div className="stat">{kcal} <small>kcal</small></div><p className="muted">{Math.round(prot)} g de proteína</p></section>
          <section className="card"><span className="muted">Lo que te falta</span>
            <div className="stat">{faltaK} <small>kcal</small></div><p className="muted">{faltaP} g de proteína para tu meta</p></section>
          <section className="card"><span className="muted">Tus metas (Mifflin-St Jeor)</span>
            <div className="stat">{metas.kcal} <small>kcal/día</small></div>
            <p className="muted">{metas.proteinaG}g proteína · {metas.carbsG}g carbs · {metas.grasaG}g grasa</p>
            <p className="muted">{quemadas} kcal quemadas hoy (se suman a lo que puedes comer).</p></section>
          <section className="card">
            <h3 style={{ marginBottom: 8 }}>Mis datos</h3>
            <form onSubmit={guardar}>
              <div className="row">
                <div className="field"><label htmlFor="altura">Altura (cm)</label><input id="altura" type="number" step="0.1" min={100} max={230} value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} required /></div>
                <div className="field"><label htmlFor="peso">Peso (kg)</label><input id="peso" type="number" step="0.1" min={30} max={300} value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} required /></div>
              </div>
              <div className="row">
                <div className="field"><label htmlFor="act">Actividad</label>
                  <select id="act" value={form.activityLevel} onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}>
                    <option>Sedentario</option><option>Ligera</option><option>Moderado</option><option>Alta</option>
                  </select></div>
                <div className="field"><label htmlFor="goal">Objetivo</label>
                  <select id="goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                    <option>Perder peso</option><option>Mantener peso</option><option>Ganar peso</option>
                  </select></div>
              </div>
              <button className="btn" disabled={saving}>{saving ? "Guardando…" : "Guardar y recalcular"}</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
