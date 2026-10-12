"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, storedUserId } from "@/lib/api";
import { calcularMetas, type Actividad, type Objetivo, type Sexo } from "@/lib/nutrition";

export default function Onboarding() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const userId = storedUserId();
    if (!userId) {
      router.push("/ingresar");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const nombre = String(fd.get("nombre") ?? "").trim();
    const sexo = String(fd.get("sexo") ?? "m") as Sexo;
    const edad = Number(String(fd.get("edad") ?? "").replace(",", "."));
    const alturaCm = Number(String(fd.get("altura") ?? "").replace(",", "."));
    const pesoKg = Number(String(fd.get("peso") ?? "").replace(",", "."));
    const actividad = String(fd.get("actividad") ?? "ligera") as Actividad;
    const objetivo = String(fd.get("objetivo") ?? "mantener") as Objetivo;
    const objetivoKg = Number(String(fd.get("peso_objetivo") ?? "").replace(",", "."));

    if (!nombre || !["m", "f"].includes(sexo) || !(edad >= 14 && edad <= 100) ||
        !(alturaCm >= 100 && alturaCm <= 230) || !(pesoKg >= 30 && pesoKg <= 300)) {
      setError("Revisa tus datos: nombre, sexo, edad (14-100), altura (100-230 cm) y peso (30-300 kg).");
      return;
    }

    const m = calcularMetas({ sexo, edad, alturaCm, pesoKg, actividad, objetivo });
    const birthDate = new Date(Date.now());
    birthDate.setFullYear(birthDate.getFullYear() - edad);

    setBusy(true);
    setError("");
    try {
      await api.saveProfile({
        userId,
        name: nombre,
        gender: sexo === "m" ? "Masculino" : "Femenino",
        birthDate: birthDate.toISOString(),
        heightCm: alturaCm,
        weightKg: pesoKg,
        targetWeightKg: objetivoKg > 0 ? objetivoKg : null,
        activityLevel: actividad,
        goal: objetivo,
        targetCalories: m.kcal,
        targetProtein: m.proteinaG,
        targetCarbs: m.carbsG,
        targetFat: m.grasaG,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "No se pudo guardar tu perfil.");
      setBusy(false);
    }
  }

  return (
    <main className="auth" style={{ maxWidth: 520 }}>
      <span className="logo">Nutri<b>Flow</b></span>
      <h1>Cuéntanos de ti</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Con esto calculamos tu IMC y tus metas diarias. Los números pueden ser aproximados.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <form onSubmit={onSubmit} className="card">
        <div className="field"><label htmlFor="nombre">Nombre</label><input id="nombre" name="nombre" required /></div>
        <div className="row">
          <div className="field"><label htmlFor="sexo">Sexo</label><select id="sexo" name="sexo" defaultValue="m"><option value="m">Masculino</option><option value="f">Femenino</option></select></div>
          <div className="field"><label htmlFor="edad">Edad</label><input id="edad" name="edad" type="number" min={14} max={100} defaultValue={30} required /></div>
        </div>
        <div className="row">
          <div className="field"><label htmlFor="altura">Altura (cm)</label><input id="altura" name="altura" type="number" step="0.1" min={100} max={230} defaultValue={170} required /></div>
          <div className="field"><label htmlFor="peso">Peso (kg)</label><input id="peso" name="peso" type="number" step="0.1" min={30} max={300} defaultValue={68} required /></div>
        </div>
        <div className="field"><label htmlFor="actividad">Actividad</label>
          <select id="actividad" name="actividad" defaultValue="ligera">
            <option value="sedentaria">Sedentaria (poco o nada de ejercicio)</option>
            <option value="ligera">Ligera (1-3 días por semana)</option>
            <option value="moderada">Moderada (3-5 días por semana)</option>
            <option value="alta">Alta (6-7 días por semana)</option>
          </select></div>
        <div className="row">
          <div className="field"><label htmlFor="objetivo">Objetivo</label><select id="objetivo" name="objetivo" defaultValue="mantener"><option value="perder">Perder peso</option><option value="mantener">Mantener</option><option value="ganar">Ganar masa</option></select></div>
          <div className="field"><label htmlFor="peso_objetivo">Peso objetivo (kg, opcional)</label><input id="peso_objetivo" name="peso_objetivo" type="number" step="0.1" min={30} max={300} /></div>
        </div>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? "Guardando…" : "Calcular mi plan"}</button>
      </form>
    </main>
  );
}