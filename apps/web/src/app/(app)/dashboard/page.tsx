"use client";
import { useCallback, useEffect, useState } from "react";
import UserSwitcher from "@/components/UserSwitcher";
import { api, type ApiMeal, type ApiProfile, type ApiWorkout } from "@/lib/api";
import { categoriaImc, hoyISO, imc, racha } from "@/lib/nutrition";

const pct = (v: number, m: number) => Math.min(100, Math.round((v / Math.max(1, m)) * 100));

function Macro({ n, v, m, c }: { n: string; v: number; m: number; c: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <b>{n}</b>
        <span className="muted">{Math.round(v)} / {m} g</span>
      </div>
      <div className={`bar ${c}`} role="progressbar" aria-valuenow={pct(v, m)} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${pct(v, m)}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [meals, setMeals] = useState<ApiMeal[]>([]);
  const [workouts, setWorkouts] = useState<ApiWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [peso, setPeso] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [p, m, w] = await Promise.all([api.profile(id), api.meals(id), api.workouts(id)]);
      setProfile(p);
      setMeals(m);
      setWorkouts(w);
    } catch (e: any) {
      setError(e.message || "No se pudo cargar. Verifica que la API esté corriendo en el puerto 3001.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  async function guardarPeso(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(String(peso).replace(",", "."));
    if (!(v >= 30 && v <= 300) || !userId) return;
    setSaving(true);
    try {
      await api.saveProfile({ userId, weightKg: v });
      await load(userId);
      setPeso("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const hoy = hoyISO();
  const mealsHoy = meals.filter((m) => (m.scheduledAt || m.createdAt).slice(0, 10) === hoy);
  const sum = (k: "calories" | "proteinG" | "carbsG" | "fatG") =>
    mealsHoy.reduce((a, m) => a + Number((m[k] as number) ?? 0), 0);
  const kcal = sum("calories");
  const hace7 = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const sem = workouts.filter((w) => (w.date || w.createdAt).slice(0, 10) >= hace7);
  const minSemana = sem.reduce((a, w) => a + Number(w.durationMin ?? 0), 0);
  const quemadas = sem.reduce((a, w) => a + Number(w.caloriesBurned ?? 0), 0);
  const pesoKg = Number(profile?.weightKg ?? 0);
  const alturaCm = Number(profile?.heightCm ?? 0);
  const valorImc = pesoKg > 0 && alturaCm > 0 ? imc(pesoKg, alturaCm) : 0;
  const dias = racha(meals.map((m) => (m.scheduledAt || m.createdAt).slice(0, 10)), hoy);
  const metaKcal = 2000;

  return (
    <>

      <h1>Dashboard</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Tu resumen, con datos en vivo de la API local.</p>
      <UserSwitcher value={userId} onChange={setUserId} />
      {error && <div className="alert" role="alert">{error}</div>}
      {loading ? (
        <p>Cargando…</p>
      ) : (
        <>
          <div className="grid g4">
            <div className="card"><span className="muted">Peso actual</span><div className="stat">{pesoKg || "—"} <small>kg</small></div></div>
            <div className="card"><span className="muted">IMC</span><div className="stat">{valorImc || "—"}</div>{valorImc > 0 && <span className="pill">{categoriaImc(valorImc)}</span>}</div>
            <div className="card"><span className="muted">Calorías hoy</span><div className="stat">{kcal} <small>/ {metaKcal} kcal</small></div>
              <div className="bar"><i style={{ width: `${pct(kcal, metaKcal)}%` }} /></div>
              <span className="muted">{kcal >= metaKcal ? "Meta alcanzada" : `Te faltan ${metaKcal - kcal} kcal`}</span></div>
            <div className="card"><span className="muted">Racha</span><div className="stat">{dias} <small>{dias === 1 ? "día" : "días"}</small> ✓</div></div>
          </div>
          <div className="grid g2" style={{ marginTop: 16 }}>
            <section className="card" aria-labelledby="macros"><h3 id="macros" style={{ marginBottom: 12 }}>Macros del día</h3>
              <Macro n="Proteínas" v={sum("proteinG")} m={109} c="p" />
              <Macro n="Carbohidratos" v={sum("carbsG")} m={250} c="c" />
              <Macro n="Grasas" v={sum("fatG")} m={67} c="g" />
            </section>
            <section className="card" aria-labelledby="hoy"><h3 id="hoy" style={{ marginBottom: 8 }}>Comidas de hoy</h3>
              {mealsHoy.length === 0 ? <p className="muted">Aún no registras nada hoy.</p> : (
                <ul className="list">{mealsHoy.map((c) => <li key={c.id}><span className="pill">{c.type}</span><span className="grow">{c.name || c.type}{c.source === "RESTAURANTE" ? " 🍽️" : ""}</span><b>{c.calories ?? 0} kcal</b></li>)}</ul>
              )}
              <a className="btn small" href="/comidas" style={{ marginTop: 12 }}>Registrar comida</a>
            </section>
            <section className="card" aria-labelledby="peso"><h3 id="peso" style={{ marginBottom: 8 }}>Peso actual</h3>
              <form onSubmit={guardarPeso} style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input name="peso" type="number" step="0.1" min={30} max={300} placeholder="Peso de hoy (kg)" aria-label="Peso de hoy" value={peso} onChange={(e) => setPeso(e.target.value)} required />
                <button className="btn small" disabled={saving}>{saving ? "…" : "Guardar"}</button>
              </form>
            </section>
            <section className="card" aria-labelledby="sem"><h3 id="sem" style={{ marginBottom: 8 }}>Entrenos (7 días)</h3>
              <div className="stat">{minSemana} <small>min</small></div>
              <p className="muted">{sem.length} sesiones · {quemadas} kcal quemadas</p>
              <a className="btn small" href="/entrenos" style={{ marginTop: 12 }}>Registrar entreno</a>
            </section>
          </div>
        </>
      )}
    </>
  );
}
