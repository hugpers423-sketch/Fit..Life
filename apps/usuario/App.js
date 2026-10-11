// App Usuario — NutriFlow. Menú semanal recomendado + 2 opciones + rutina + membresía.
// Todo se sincroniza con la API central: el Admin General monitorea el proceso.
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// URL de la API: usa app.json (extra.apiUrl) si existe, si no la IP LAN de tu PC.
let API_URL = "http://192.168.18.167:3001";
try {
  const Constants = require("expo-constants").default;
  const cfg = (Constants && Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.apiUrl)
    || (Constants && Constants.manifest && Constants.manifest.extra && Constants.manifest.extra.apiUrl);
  if (cfg) API_URL = cfg;
} catch (e) {}
let API_TOKEN = "";
let API_ROLE = "";
const GREEN = "#22c55e";
const ORANGE = "#f97316";
const DARK = "#04150a";
const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

async function api(path, init) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      ...(API_ROLE ? { "x-role": API_ROLE } : {}),
      ...((init && init.headers) || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${res.status}`);
  }
  return res.json();
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#8A968F" {...props} />
    </View>
  );
}

function openVideo(url) {
  if (url) Linking.openURL(url).catch(() => {});
}

function openNow(r, hour) {
  if (r.openHour == null || r.closeHour == null) return true;
  if (r.openHour <= r.closeHour) return hour >= r.openHour && hour < r.closeHour;
  return hour >= r.openHour || hour < r.closeHour;
}

function matchZone(address, zone) {
  if (!zone.trim()) return true;
  return String(address || "").toLowerCase().includes(zone.trim().toLowerCase());
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("usuario@nutriflow.com");
  const [pass, setPass] = useState("password123");
  const [tab, setTab] = useState("menu");
  const [recipes, setRecipes] = useState([]);
  const [rests, setRests] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [meals, setMeals] = useState([]);
  const [selRecipe, setSelRecipe] = useState(null);
  const [mode, setMode] = useState(null);
  const [zone, setZone] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [fWake, setFWake] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  const todayNum = ((new Date().getDay() + 6) % 7) + 1;
  const hourNow = new Date().getHours();
  const todayRecipe = recipes.find((r) => r.day === todayNum) || null;

  async function login() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      setUser(data.user);
      API_TOKEN = data.token || "";
      API_ROLE = (data.user && data.user.role) || "";
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function load(uid) {
    const id = uid || (user && user.id);
    if (!id) return;
    setRefreshing(true);
    try {
      const [rec, r, g, m, p] = await Promise.all([
        api("/api/recipes"),
        api("/api/restaurants"),
        api("/api/gyms"),
        api(`/api/meals?userId=${id}`),
        api(`/api/user/profile?userId=${id}`).catch(() => null),
      ]);
      setRecipes(rec);
      setRests(r);
      setGyms(g);
      setMeals(m);
      if (p) {
        setProfile(p);
        setFWake(p.wakeTime || "");
        setFStart(p.workStart || "");
        setFEnd(p.workEnd || "");
      }
      if (p && p.membership !== user?.membership && user) {
        setUser({ ...user, membership: p.membership || user.membership });
      }
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (user) load(user.id);
  }, [user]);

  // SINCRONIZACIÓN EN TIEMPO REAL (silenciosa)
  // Pregunta cada 3s a /api/version. Si otro cliente escribió datos,
  // recargamos sin mostrar aviso (el aviso vive solo en el Admin General).
  useEffect(() => {
    if (!user) return;
    let ultimaV = null;
    let vivo = true;
    const id = setInterval(async () => {
      if (!vivo) return;
      try {
        const res = await fetch(`${API_URL}/api/version`);
        if (!res.ok) return;
        const data = await res.json();
        if (ultimaV === null) { ultimaV = data.v; return; }
        if (data.v !== ultimaV) {
          ultimaV = data.v;
          if (vivo) load(user.id);
        }
      } catch { /* sin conexión: se reintenta en el siguiente ciclo */ }
    }, 3000);
    return () => { vivo = false; clearInterval(id); };
  }, [user]);

  async function saveRoutine() {
    try {
      const p = await api("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ userId: user.id, wakeTime: fWake, workStart: fStart, workEnd: fEnd }),
      });
      setProfile(p);
      setOk("Rutina guardada. Te recomendamos el mejor horario abajo.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function upgrade() {
    try {
      const u = await api("/api/users/membership", {
        method: "PATCH",
        body: JSON.stringify({ userId: user.id, membership: "PREMIUM" }),
      });
      setUser({ ...user, membership: u.membership });
      try {
        await api("/api/payments", {
          method: "POST",
          body: JSON.stringify({ userId: user.id, amount: 49.99, concept: "Membresía PREMIUM" }),
        });
      } catch (_) {}
      setOk("¡Membresía PREMIUM activa! Nutricionista + entrenador asignados a tu seguimiento.");
    } catch (e) {
      setError(e.message);
    }
  }

  function bestGymHour() {
    const toH = (s) => {
      if (!s || !s.includes(":")) return null;
      const h = Number(s.split(":")[0]);
      return isNaN(h) ? null : h;
    };
    const wake = toH(profile?.wakeTime) ?? 6;
    const end = toH(profile?.workEnd) ?? 18;
    if (end + 1 <= 22) return { h: end + 1, why: `al salir del trabajo (${profile?.workEnd || "18:00"})` };
    return { h: wake + 1, why: `al levantarte (${profile?.wakeTime || "06:00"})` };
  }

  async function logConsumption(source, name, calories, proteinG, dishId, restaurantId) {
    try {
      await api("/api/meals", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          type: selRecipe ? selRecipe.mealType : "Comida",
          name,
          dishId: dishId || null,
          restaurantId: restaurantId || null,
          source,
          calories: calories ?? 0,
          proteinG: proteinG ?? 0,
        }),
      });
      setOk(`Registrado: ${name}. Tu admin lo ve en tu monitoreo.`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function checkin(gymId, gymName) {
    try {
      const v = await api("/api/visits", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, gymId }),
      });
      setOk(`Visita registrada en ${gymName} a las ${v.hour}:00.`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!user) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.loginCard}>
          <Text style={styles.brand}>Nutri<Text style={{ color: GREEN }}>Flow</Text></Text>
          <Text style={styles.appTag}>APP USUARIO</Text>
          <Text style={styles.title}>Tu menú semanal te espera</Text>
          <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Contraseña" value={pass} onChangeText={setPass} secureTextEntry />
          {error !== "" && <Text style={styles.err}>{error}</Text>}
          <Pressable style={styles.btn} onPress={login} disabled={loading}>
            <Text style={styles.btnTxt}>{loading ? "Ingresando…" : "Ingresar"}</Text>
          </Pressable>
          <Text style={styles.hint}>Tu admin monitorea tu progreso con tus registros.</Text>
        </View>
      </View>
    );
  }

  const rec = bestGymHour();
  const openRests = rests.filter((r) => openNow(r, hourNow) && matchZone(r.address, zone));
  const openGyms = gyms.filter((g) => openNow(g, rec.h) && matchZone(g.address, zone));
  const isPremium = user.membership === "PREMIUM";

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.hello}>Hola, {user.name.split(" ")[0]} {isPremium ? "★" : ""}</Text>
        <Text style={styles.sub}>Membresía {user.membership || "BASICA"} · Admin monitorea tu avance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {[["menu", "Menú"], ["rutina", "Rutina"], ["comidas", "Mis comidas"], ["plan", "Membresía"]].map(([t, label]) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => { setTab(t); setSelRecipe(null); setMode(null); }}>
              <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView
        style={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={GREEN} />}
      >
        {error !== "" && <Text style={styles.err}>{error}</Text>}
        {ok !== "" && <Text style={styles.ok}>{ok}</Text>}

        {tab === "menu" && !selRecipe && (
          <View>
            <Text style={styles.secT}>Menú semanal recomendado</Text>
            {recipes.map((r) => (
              <Pressable key={r.id} style={styles.row} onPress={() => setSelRecipe(r)}>
                <View style={[styles.dayBadge, r.day === todayNum && styles.dayToday]}>
                  <Text style={styles.dayTxt}>{DIAS[r.day]?.slice(0, 3)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{r.name}</Text>
                  <Text style={styles.rowS}>{r.calories ?? 0} kcal · S/ {Number(r.totalPrice || 0).toFixed(2)}{r.day === todayNum ? " · HOY" : ""}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {tab === "menu" && selRecipe && !mode && (
          <View>
            <Pressable onPress={() => setSelRecipe(null)}>
              <Text style={styles.back}>‹ Volver al menú</Text>
            </Pressable>
            <Text style={styles.secT}>{selRecipe.name}</Text>
            <Text style={styles.rowS}>{DIAS[selRecipe.day]} · {selRecipe.calories ?? 0} kcal · {selRecipe.proteinG ?? 0}g proteína</Text>
            <View style={styles.card}>
              <Text style={styles.cardT}>Opción 1 · Prepárala con nosotros</Text>
              <Text style={styles.rowS}>Video paso a paso + ingredientes + lista de compras.</Text>
              <Pressable style={styles.btn} onPress={() => setMode("cook")}>
                <Text style={styles.btnTxt}>Ver receta</Text>
              </Pressable>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardT}>Opción 2 · Pídela cerca de ti</Text>
              <Text style={styles.rowS}>Restaurantes abiertos ahora con este plato.</Text>
              <Pressable style={[styles.btn, { backgroundColor: ORANGE }]} onPress={() => setMode("eat")}>
                <Text style={styles.btnTxt}>Ver restaurantes</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === "menu" && selRecipe && mode === "cook" && (
          <View>
            <Pressable onPress={() => setMode(null)}>
              <Text style={styles.back}>‹ Volver</Text>
            </Pressable>
            <Text style={styles.secT}>{selRecipe.name}</Text>
            {selRecipe.videoUrl ? (
              <Pressable style={[styles.btn, { backgroundColor: DARK }]} onPress={() => openVideo(selRecipe.videoUrl)}>
                <Text style={styles.btnTxt}>▶ Ver video de preparación</Text>
              </Pressable>
            ) : null}
            <Text style={styles.secT2}>Ingredientes</Text>
            {(selRecipe.ingredients || []).map((ing, i) => (
              <View key={i} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{ing.name}</Text>
                  <Text style={styles.rowS}>{ing.qty}</Text>
                </View>
                <Text style={styles.price}>S/ {Number(ing.price || 0).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.card}>
              <Text style={styles.cardT}>Lista de compras · Total aprox: S/ {Number(selRecipe.totalPrice || 0).toFixed(2)}</Text>
              <Text style={styles.rowS}>Precios actualizados de nuestra base de datos.</Text>
              <Pressable
                style={[styles.btn, { marginTop: 10 }]}
                onPress={() => logConsumption("CASA", selRecipe.name, selRecipe.calories, selRecipe.proteinG, null)}
              >
                <Text style={styles.btnTxt}>✓ Ya la preparé y comí</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === "menu" && selRecipe && mode === "eat" && (
          <View>
            <Pressable onPress={() => setMode(null)}>
              <Text style={styles.back}>‹ Volver</Text>
            </Pressable>
            <Text style={styles.secT}>Restaurantes abiertos ahora</Text>
            <Field label="Tu zona (ej. Miraflores)" value={zone} onChangeText={setZone} placeholder="Escribe tu distrito" />
            {openRests.length === 0 && <Text style={styles.muted}>Ninguno coincide ahora. Prueba otra zona u horario.</Text>}
            {openRests.map((r) => (
              <View key={r.id} style={styles.card}>
                <Text style={styles.cardT}>{r.name}</Text>
                <Text style={styles.rowS}>{r.address}</Text>
                <Text style={styles.rowS}>Abierto {r.openHour ?? "?"}:00 – {r.closeHour ?? "?"}:00 · {r.service}</Text>
                <Text style={[styles.rowS, { marginTop: 6 }]}>Pide hoy: <Text style={{ fontWeight: "800" }}>{selRecipe.name}</Text> ({selRecipe.calories ?? 0} kcal)</Text>
                <Pressable
                  style={[styles.btn, { marginTop: 10 }]}
                  onPress={() => logConsumption("RESTAURANTE", `${selRecipe.name} (${r.name})`, selRecipe.calories, selRecipe.proteinG, null, r.id)}
                >
                  <Text style={styles.btnTxt}>✓ Comí aquí: registrar consumo</Text>
                </Pressable>
                {r.videoUrl ? (
                  <Pressable style={[styles.btn, { backgroundColor: DARK, marginTop: 10 }]} onPress={() => openVideo(r.videoUrl)}>
                    <Text style={styles.btnTxt}>▶ Video del restaurante</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {tab === "rutina" && (
          <View>
            <Text style={styles.secT}>Tu rutina diaria</Text>
            <View style={styles.card}>
              <Text style={styles.cardT}>¿A qué hora te levantas y trabajas/estudias?</Text>
              <Field label="Me levanto (ej. 06:00)" value={fWake} onChangeText={setFWake} placeholder="06:00" />
              <Field label="Entro a trabajar/estudiar (ej. 08:00)" value={fStart} onChangeText={setFStart} placeholder="08:00" />
              <Field label="Salgo (ej. 18:00)" value={fEnd} onChangeText={setFEnd} placeholder="18:00" />
              <Pressable style={styles.btn} onPress={saveRoutine}>
                <Text style={styles.btnTxt}>Guardar rutina</Text>
              </Pressable>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardT}>Tu mejor horario: {String(rec.h).padStart(2, "0")}:00</Text>
              <Text style={styles.rowS}>Te conviene entrenar {rec.why}.</Text>
            </View>
            <Text style={styles.secT}>Gimnasios abiertos a esa hora</Text>
            <Field label="Tu zona (ej. Miraflores)" value={zone} onChangeText={setZone} placeholder="Escribe tu distrito" />
            {openGyms.length === 0 && <Text style={styles.muted}>Ninguno coincide. Prueba otra zona.</Text>}
            {openGyms.map((g) => (
              <View key={g.id} style={styles.card}>
                <Text style={styles.cardT}>{g.name}</Text>
                <Text style={styles.rowS}>{g.address}</Text>
                <Text style={styles.rowS}>Abierto {g.openHour ?? "?"}:00 – {g.closeHour ?? "?"}:00 · {g.service}</Text>
                <Pressable style={[styles.btn, { marginTop: 10 }]} onPress={() => checkin(g.id, g.name)}>
                  <Text style={styles.btnTxt}>✓ Estoy aquí: registrar visita</Text>
                </Pressable>
                {g.videoUrl ? (
                  <Pressable style={[styles.btn, { backgroundColor: DARK, marginTop: 10 }]} onPress={() => openVideo(g.videoUrl)}>
                    <Text style={styles.btnTxt}>▶ Video del gimnasio</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {tab === "comidas" && (
          <View>
            <Text style={styles.secT}>Lo que comiste (lo ve tu admin)</Text>
            {meals.length === 0 && <Text style={styles.muted}>Aún sin registros. Elige tu menú de hoy arriba.</Text>}
            {meals.slice(-10).reverse().map((m) => (
              <View key={m.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{m.name || m.type}{m.source === "RESTAURANTE" ? " 🍽️" : ""}</Text>
                  <Text style={styles.rowS}>{m.calories ?? 0} kcal · {String(m.scheduledAt || m.createdAt).slice(0, 10)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === "plan" && (
          <View>
            <Text style={styles.secT}>Membresía</Text>
            <View style={styles.card}>
              <Text style={styles.cardT}>Actual: {user.membership || "BASICA"}</Text>
              {isPremium ? (
                <Text style={styles.rowS}>Tienes seguimiento profesional de nutricionista + entrenador. Sigue registrando tus comidas.</Text>
              ) : (
                <View>
                  <Text style={styles.rowS}>Con PREMIUM un nutricionista y un entrenador siguen tu progreso para mejores resultados.</Text>
                  <Pressable style={[styles.btn, { backgroundColor: ORANGE, marginTop: 10 }]} onPress={upgrade}>
                    <Text style={styles.btnTxt}>Subir a PREMIUM</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fbfaf7" },
  loginCard: { flex: 1, justifyContent: "center", padding: 24 },
  brand: { fontSize: 30, fontWeight: "900", color: "#12211a" },
  appTag: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: GREEN, marginTop: 4 },
  title: { fontSize: 22, fontWeight: "800", color: "#12211a", marginTop: 12, marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "700", color: "#45564c", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#dbe1d8", borderRadius: 12, padding: 12, fontSize: 15, color: "#12211a" },
  btn: { backgroundColor: GREEN, borderRadius: 999, padding: 15, alignItems: "center", marginTop: 6 },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  err: { color: "#e11d48", fontWeight: "700", marginBottom: 8 },
  ok: { color: "#15803d", fontWeight: "700", marginBottom: 8 },
  muted: { color: "#5f7167", fontSize: 13 },
  hint: { color: "#5f7167", fontSize: 12, marginTop: 14, textAlign: "center" },
  header: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#dbe1d8" },
  hello: { fontSize: 22, fontWeight: "900", color: "#12211a" },
  sub: { fontSize: 12, color: "#5f7167", marginTop: 2 },
  tabs: { marginTop: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f1f5e9", marginRight: 8 },
  tabOn: { backgroundColor: "#12211a" },
  tabTxt: { fontWeight: "700", color: "#45564c" },
  tabTxtOn: { color: "#fff" },
  body: { flex: 1, padding: 16 },
  secT: { fontSize: 18, fontWeight: "900", color: "#12211a", marginBottom: 10, marginTop: 4 },
  secT2: { fontSize: 15, fontWeight: "800", color: "#12211a", marginBottom: 8, marginTop: 14 },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe1d8", borderRadius: 20, padding: 18, marginBottom: 14 },
  cardT: { fontSize: 16, fontWeight: "800", color: "#12211a", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe1d8", borderRadius: 14, padding: 12, marginBottom: 8 },
  rowT: { fontSize: 14, fontWeight: "800", color: "#12211a" },
  rowS: { fontSize: 12, color: "#5f7167", marginTop: 2 },
  price: { fontSize: 14, fontWeight: "800", color: "#15803d" },
  back: { color: "#15803d", fontWeight: "800", marginBottom: 8 },
  dayBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f1f5e9", alignItems: "center", justifyContent: "center", marginRight: 10 },
  dayToday: { backgroundColor: GREEN },
  dayTxt: { fontWeight: "800", color: "#12211a", fontSize: 12 },
});
