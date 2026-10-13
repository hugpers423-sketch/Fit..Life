// App Usuario — NutriFlow. Hoy + menú semanal + rutina + membresía, con el
// sistema de diseño y movimiento portado de las maquetas (ver nfui.js).
// Todo se sincroniza con la API central: el Admin General monitorea el proceso.
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  C,
  R,
  D,
  useReduceMotion,
  FadeUp,
  Press,
  ProgressBar,
  Dial,
  CountUp,
  Skeleton,
  Pill,
  KpiCard,
  SectionHead,
  EmptyState,
  StatRow,
  Sparkbars,
  Confetti,
  Pulse,
} from "./nfui";

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
let REFRESH_TOKEN = "";

// --- Sesión persistente (refresh token) ---
// Usa AsyncStorage en móvil (si está instalado) y localStorage en web.
// El require va en try/catch para no romper la app si el módulo no existe.
let AsyncStorage = null;
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch (e) {
  AsyncStorage = null;
}
async function storeGet(key) {
  try {
    if (AsyncStorage) return await AsyncStorage.getItem(key);
    if (typeof localStorage !== "undefined") return localStorage.getItem(key);
  } catch (e) {}
  return null;
}
async function storeSet(key, value) {
  try {
    if (AsyncStorage) return await AsyncStorage.setItem(key, value);
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch (e) {}
}
async function storeDel(key) {
  try {
    if (AsyncStorage) return await AsyncStorage.removeItem(key);
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch (e) {}
}
async function persistSession(data) {
  API_TOKEN = data.token || "";
  REFRESH_TOKEN = data.refreshToken || "";
  API_ROLE = (data.user && data.user.role) || "";
  await storeSet("nf_token", API_TOKEN);
  await storeSet("nf_refresh", REFRESH_TOKEN);
  await storeSet("nf_user", JSON.stringify(data.user || null));
}
async function clearSession() {
  API_TOKEN = "";
  REFRESH_TOKEN = "";
  API_ROLE = "";
  await storeDel("nf_token");
  await storeDel("nf_refresh");
  await storeDel("nf_user");
}
async function refreshToken() {
  if (!REFRESH_TOKEN) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: REFRESH_TOKEN }),
    });
    if (!res.ok) {
      await clearSession();
      return false;
    }
    const data = await res.json();
    await persistSession(data);
    return true;
  } catch (e) {
    return false;
  }
}

const GREEN = "#22c55e";
const ORANGE = "#f97316";
const DARK = "#04150a";
const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
const BENEFICIOS = [
  { t: "Menú semanal recomendado", free: true },
  { t: "Registro de comidas y calorías", free: true },
  { t: "Rutina y gimnasios cerca de ti", free: true },
  { t: "Nutricionista que revisa tu avance", free: false },
  { t: "Entrenador con plan semanal", free: false },
  { t: "Videollamadas y lives exclusivos", free: false },
];

async function api(path, init) {
  const isAuthPath = path.startsWith("/api/auth/") && path !== "/api/auth/me";
  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        ...(API_ROLE ? { "x-role": API_ROLE } : {}),
        ...((init && init.headers) || {}),
      },
    });
  let res = await doFetch();
  // Sesión expirada: renovar con el refresh token y reintentar una vez.
  if (res.status === 401 && !isAuthPath) {
    if (await refreshToken()) res = await doFetch();
  }
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

function timeAgo(d, now) {
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `hace ${Math.floor(s / 3600)} h`;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("usuario@nutriflow.com");
  const [pass, setPass] = useState("password123");
  const [authMode, setAuthMode] = useState("login"); // login | register | forgot | reset
  const [regName, setRegName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [tab, setTab] = useState("hoy");
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
  const [syncAt, setSyncAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [celebrar, setCelebrar] = useState(false);

  // Refresca el "hace Xs" sin recargar datos.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useReduceMotion();

  const todayNum = ((new Date().getDay() + 6) % 7) + 1;
  const hourNow = new Date().getHours();
  const todayRecipe = recipes.find((r) => r.day === todayNum) || null;

  // ---------------- Métricas del día (las mismas que ve el Admin General) ---
  const goalKcal = Number(profile?.targetCalories) || 2000;
  const goalProtein = Number(profile?.targetProtein) || 120;
  const goalCarbs = Number(profile?.targetCarbs) || 200;
  const goalFat = Number(profile?.targetFat) || 70;
  const dayKey = (m) => String(m.scheduledAt || m.createdAt || "").slice(0, 10);
  const todayISO = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const todays = meals.filter((m) => dayKey(m) === todayISO);
    const sum = (k, arr) => arr.reduce((a, m) => a + (Number(m[k]) || 0), 0);
    // Racha: días seguidos hacia atrás con al menos un registro.
    const days = new Set(meals.map(dayKey));
    let streak = days.has(todayISO) ? 1 : 0;
    for (let i = 1; i < 400; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      if (days.has(dt.toISOString().slice(0, 10))) streak += 1;
      else break;
    }
    // kcal de los últimos 7 días, para el mini gráfico.
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      week.push(sum("calories", meals.filter((m) => dayKey(m) === key)));
    }
    return {
      todayCount: todays.length,
      kcal: sum("calories", todays),
      protein: sum("proteinG", todays),
      carbs: sum("carbsG", todays),
      fat: sum("fatG", todays),
      streak,
      week,
      eaten: new Set(meals.map((m) => String(m.name || "").split(" (")[0].trim())),
    };
  }, [meals, todayISO, profile]);

  // Registros agrupados por día, del más reciente al más antiguo.
  const byDay = useMemo(() => {
    const map = new Map();
    meals.forEach((m) => {
      const k = dayKey(m) || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(m);
    });
    return [...map.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  }, [meals]);

  function labelDay(k) {
    if (k === "—") return "Sin fecha";
    if (k === todayISO) return "Hoy";
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    if (k === ayer.toISOString().slice(0, 10)) return "Ayer";
    const dt = new Date(`${k}T12:00:00`);
    if (isNaN(dt.getTime())) return k;
    return `${DIAS[((dt.getDay() + 6) % 7) + 1]} ${dt.getDate()}`;
  }

  // Qué toca comer según la hora (guía del día, como el dashboard de la maqueta).
  const nextSlot = useMemo(() => {
    if (!todayRecipe) return null;
    const slot = [
      { h: 6, t: "Desayuno", e: "🌅" },
      { h: 11, t: "Almuerzo", e: "☀️" },
      { h: 16, t: "Snack", e: "🍎" },
      { h: 19, t: "Cena", e: "🌙" },
    ].find((s) => hourNow < s.h);
    return slot || { h: 6, t: "Desayuno de mañana", e: "🌅" };
  }, [todayRecipe, hourNow]);

  const imc = Number(profile?.bmi) || null;
  const imcTag = imc == null ? null : imc < 18.5 ? "Peso bajo" : imc < 25 ? "Peso normal" : imc < 30 ? "Sobrepeso" : "Obesidad";
  const imcColor = imc == null ? C.muted : imc < 18.5 ? C.infoVivid : imc < 25 ? C.brandVivid : imc < 30 ? C.amberVivid : C.coralVivid;

  async function login() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      await persistSession(data);
      setUser(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), name: regName.trim(), password: pass }),
      });
      await persistSession(data);
      setUser(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function forgot() {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const data = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setAuthMode("reset");
        setOk("Código generado. Ingresa tu nueva contraseña.");
      } else {
        setOk("Si el correo existe, se enviaron las instrucciones.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetPass() {
    setLoading(true);
    setError("");
    setOk("");
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken.trim(), password: newPass }),
      });
      setAuthMode("login");
      setNewPass("");
      setPass("");
      setOk("Contraseña actualizada. Ingresa con tu nueva clave.");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (_) {}
    await clearSession();
    setUser(null);
    setAuthMode("login");
    setOk("");
    setError("");
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
      setSyncAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }

  // Restaura la sesión guardada al abrir la app (valida y renueva el token).
  useEffect(() => {
    (async () => {
      const t = await storeGet("nf_token");
      const r = await storeGet("nf_refresh");
      const uraw = await storeGet("nf_user");
      if (!t || !r) return;
      API_TOKEN = t;
      REFRESH_TOKEN = r;
      let u = null;
      try { u = uraw ? JSON.parse(uraw) : null; } catch (e) {}
      if (u && u.role) API_ROLE = u.role;
      try {
        const me = await api("/api/auth/me");
        if (me && me.user) u = me.user;
        if (u) setUser(u);
      } catch (e) {
        await clearSession();
      }
    })();
  }, []);

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
      celebrarLogro();
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

  function celebrarLogro() {
    setCelebrar(true);
    setTimeout(() => setCelebrar(false), 1000);
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
      celebrarLogro();
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
      celebrarLogro();
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!user) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.loginCard} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Nutri<Text style={{ color: GREEN }}>Flow</Text></Text>
          <Text style={styles.appTag}>APP USUARIO</Text>

          {authMode === "login" && (
            <>
              <Text style={styles.title}>Tu menú semanal te espera</Text>
              <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Contraseña" value={pass} onChangeText={setPass} secureTextEntry />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              {ok !== "" && <Text style={styles.ok}>{ok}</Text>}
              <Pressable style={styles.btn} onPress={login} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Ingresando…" : "Ingresar"}</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setAuthMode("forgot"); }}>
                <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setAuthMode("register"); }}>
                <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
              </Pressable>
              <Text style={styles.hint}>Tu admin monitorea tu progreso con tus registros.</Text>
            </>
          )}

          {authMode === "register" && (
            <>
              <Text style={styles.title}>Crea tu cuenta</Text>
              <Field label="Nombre" value={regName} onChangeText={setRegName} />
              <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Contraseña (mín. 8)" value={pass} onChangeText={setPass} secureTextEntry />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              <Pressable style={styles.btn} onPress={register} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Creando…" : "Crear cuenta y entrar"}</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setAuthMode("login"); }}>
                <Text style={styles.link}>‹ Volver a ingresar</Text>
              </Pressable>
            </>
          )}

          {authMode === "forgot" && (
            <>
              <Text style={styles.title}>Recuperar contraseña</Text>
              <Text style={styles.muted}>Te generamos un código para restablecerla. Escríbelo y define tu nueva clave.</Text>
              <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              {ok !== "" && <Text style={styles.ok}>{ok}</Text>}
              <Pressable style={styles.btn} onPress={forgot} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Enviando…" : "Enviar código"}</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setAuthMode("login"); }}>
                <Text style={styles.link}>‹ Volver a ingresar</Text>
              </Pressable>
            </>
          )}

          {authMode === "reset" && (
            <>
              <Text style={styles.title}>Nueva contraseña</Text>
              {ok !== "" && <Text style={styles.ok}>{ok}</Text>}
              <Field label="Código de recuperación" value={resetToken} onChangeText={setResetToken} autoCapitalize="none" />
              <Field label="Nueva contraseña (mín. 8)" value={newPass} onChangeText={setNewPass} secureTextEntry />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              <Pressable style={styles.btn} onPress={resetPass} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Guardando…" : "Guardar nueva contraseña"}</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setAuthMode("login"); }}>
                <Text style={styles.link}>‹ Volver a ingresar</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
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
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{String(user.name || "U").slice(0, 1).toUpperCase()}</Text>
            {isPremium ? (
              <View style={styles.avatarStar}><Text style={{ fontSize: 9 }}>★</Text></View>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hola, {user.name.split(" ")[0]} {isPremium ? "★" : ""}</Text>
            <View style={styles.subRow}>
              <Pill color={C.info} soft={C.infoSoft}>{user.membership || "BASICA"}</Pill>
              <Pulse size={7} color={C.brandVivid} />
              <Text style={styles.sub}>{syncAt ? timeAgo(syncAt, now) : "sincronizando…"}</Text>
            </View>
          </View>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutTxt}>Salir</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {[["hoy", "Hoy"], ["menu", "Menú"], ["rutina", "Rutina"], ["comidas", "Mis comidas"], ["plan", "Membresía"]].map(([t, label]) => (
            <Press
              key={t}
              style={[styles.tab, tab === t && styles.tabOn]}
              scale={0.94}
              onPress={() => { setTab(t); setSelRecipe(null); setMode(null); }}
            >
              <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>{label}</Text>
            </Press>
          ))}
        </ScrollView>
      </View>
      <ScrollView
        style={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={GREEN} />}
      >
        {error !== "" && <Text style={styles.err}>{error}</Text>}
        {ok !== "" && <Text style={styles.ok}>{ok}</Text>}
        {celebrar && <Confetti count={16} />}

        {tab === "hoy" && (
          <View>
            <FadeUp index={0} style={today.dateRow}>
              <Text style={today.date}>{DIAS[todayNum]}, {new Date().getDate()} de {MESES[new Date().getMonth()]}</Text>
              {stats.streak > 0 ? (
                <Pill color={C.orange} soft={C.orangeSoft}>🔥 {stats.streak} {stats.streak === 1 ? "día" : "días"}</Pill>
              ) : null}
            </FadeUp>

            <FadeUp index={1} style={today.hero}>
              <Dial
                value={stats.kcal}
                max={goalKcal}
                size={132}
                segments={28}
                color={C.brandVivid}
                label={<CountUp to={stats.kcal} style={today.heroVal} />}
                sub={<Text style={today.heroGoal}>de {goalKcal} kcal</Text>}
              />
              <View style={today.heroSide}>
                <Text style={today.heroRest}>
                  {stats.kcal <= goalKcal
                    ? `Te faltan ${Math.max(0, goalKcal - stats.kcal)} kcal`
                    : `${stats.kcal - goalKcal} kcal de más`}
                </Text>
                <StatRow label="Proteína" value={Math.round(stats.protein)} max={goalProtein} unit="g" color={C.brandVivid} index={2} />
                <StatRow label="Carbohidratos" value={Math.round(stats.carbs)} max={goalCarbs} unit="g" color={C.amberVivid} index={3} />
                <StatRow label="Grasas" value={Math.round(stats.fat)} max={goalFat} unit="g" color={C.tealVivid} index={4} />
              </View>
            </FadeUp>

            <View style={today.kpiRow}>
              <KpiCard index={5} icon="🍽️" value={stats.todayCount} max={4} label="Comidas de hoy" color={C.brandVivid} />
              <KpiCard index={6} icon="⚖️" value={imc ?? 0} label={imcTag || "IMC"} color={imcColor}
                format={() => (imc == null ? "—" : imc.toFixed(1))} />
            </View>

            <FadeUp index={7} style={today.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardT}>Tu semana en calorías</Text>
                <Pill color={C.muted} soft={C.surface2}>7 días</Pill>
              </View>
              <Sparkbars data={stats.week} height={44} color={C.brandVivid} highlight={6} />
              <View style={today.weekLabels}>
                {["L", "M", "M", "J", "V", "S", "D"].map((l, i) => (
                  <Text key={i} style={[today.weekL, i === 6 && { color: C.brand, fontWeight: "900" }]}>{l}</Text>
                ))}
              </View>
            </FadeUp>

            {todayRecipe && nextSlot ? (
              <FadeUp index={8} style={today.card}>
                <Text style={styles.cardT}>Ahora te toca</Text>
                <Text style={styles.rowS}>{nextSlot.e} {nextSlot.t} · <Text style={{ fontWeight: "800", color: C.text }}>{todayRecipe.name}</Text></Text>
                <Text style={styles.rowS}>{todayRecipe.calories ?? 0} kcal · {todayRecipe.proteinG ?? 0}g proteína · S/ {Number(todayRecipe.totalPrice || 0).toFixed(2)}</Text>
                <Press style={[today.btn, { backgroundColor: C.brand }]} onPress={() => { setTab("menu"); setSelRecipe(todayRecipe); }}>
                  <Text style={styles.btnTxt}>Ver el menú de hoy</Text>
                </Press>
              </FadeUp>
            ) : (
              <EmptyState
                icon="🥗"
                title="Todavía no hay menú para hoy"
                text="Tu nutricionista publica el menú semanal. Entra a la pestaña Menú en cuanto aparezca."
              />
            )}

            <FadeUp index={9} style={today.card}>
              <Text style={styles.cardT}>Tus datos</Text>
              <View style={today.dataGrid}>
                {[
                  ["Altura", profile?.heightCm ? `${profile.heightCm} cm` : "—"],
                  ["Peso", profile?.weightKg ? `${profile.weightKg} kg` : "—"],
                  ["Meta", profile?.targetWeightKg ? `${profile.targetWeightKg} kg` : "—"],
                  ["Actividad", profile?.activityLevel ? String(profile.activityLevel).toLowerCase() : "—"],
                ].map(([k, v]) => (
                  <View key={k} style={today.dataCell}>
                    <Text style={today.dataK}>{k}</Text>
                    <Text style={today.dataV}>{v}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.rowS}>Guarda tu rutina para afinar estos objetivos.</Text>
            </FadeUp>
          </View>
        )}

        {tab === "menu" && !selRecipe && (
          <View>
            <SectionHead title="Menú semanal recomendado" count={recipes.length} />
            {recipes.length === 0 && (
              <EmptyState
                icon="📋"
                title="Sin menú esta semana"
                text="Tu nutricionista todavía no publica el menú. Mientras tanto puedes registrar lo que comas en la pestaña Mis comidas."
              />
            )}
            {recipes.map((r, i) => {
              const eaten = stats.eaten.has(String(r.name || "").trim());
              const isToday = r.day === todayNum;
              return (
                <FadeUp key={r.id} index={i}>
                  <Press style={[menu.card, isToday && menu.cardToday]} onPress={() => setSelRecipe(r)}>
                    <View style={[styles.dayBadge, isToday && styles.dayToday]}>
                      <Text style={[styles.dayTxt, isToday && { color: "#fff" }]}>{DIAS[r.day]?.slice(0, 3)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={menu.headRow}>
                        <Text style={styles.rowT} numberOfLines={1}>{r.name}</Text>
                        {isToday ? <Pill color={C.coral} soft={C.coralSoft}>HOY</Pill> : null}
                      </View>
                      <Text style={styles.rowS}>{r.calories ?? 0} kcal · {r.proteinG ?? 0}g proteína</Text>
                      <ProgressBar value={r.proteinG ?? 0} max={goalProtein} height={5} delay={i * 60} style={{ marginTop: 7 }} />
                      <View style={menu.footRow}>
                        <Text style={styles.price}>S/ {Number(r.totalPrice || 0).toFixed(2)}</Text>
                        {eaten ? <Pill color={C.brand} soft={C.brandSoft}>✓ Registrado</Pill> : null}
                      </View>
                    </View>
                  </Press>
                </FadeUp>
              );
            })}
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
            <FadeUp index={0} style={styles.card}>
              <Text style={styles.cardT}>Tu mejor horario para entrenar</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 10 }}>
                <Dial
                  value={rec.h}
                  max={24}
                  size={104}
                  segments={24}
                  thickness={6}
                  color={C.tealVivid}
                  label={<Text style={rut.hour}>{String(rec.h).padStart(2, "0")}:00</Text>}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowS}>
                    Te conviene entrenar <Text style={{ fontWeight: "800", color: C.text }}>{rec.why}</Text>.
                  </Text>
                  <Text style={[styles.rowS, { marginTop: 6 }]}>
                    {openGyms.length} {openGyms.length === 1 ? "gimnasio abierto" : "gimnasios abiertos"} a esa hora
                  </Text>
                </View>
              </View>
            </FadeUp>

            <SectionHead title="Tu rutina diaria" />
            <FadeUp index={1} style={styles.card}>
              <Text style={styles.rowS}>Con tu horario calculamos la mejor franja para entrenar.</Text>
              <Field label="Me levanto (ej. 06:00)" value={fWake} onChangeText={setFWake} placeholder="06:00" />
              <Field label="Entro a trabajar / estudiar (ej. 08:00)" value={fStart} onChangeText={setFStart} placeholder="08:00" />
              <Field label="Salgo (ej. 18:00)" value={fEnd} onChangeText={setFEnd} placeholder="18:00" />
              <Press style={[styles.btn, { backgroundColor: C.brand }]} onPress={saveRoutine}>
                <Text style={styles.btnTxt}>Guardar rutina</Text>
              </Press>
            </FadeUp>

            <SectionHead title="Gimnasios cerca de ti" count={openGyms.length} />
            <FadeUp index={2}>
              <Field label="Tu zona (ej. Miraflores)" value={zone} onChangeText={setZone} placeholder="Escribe tu distrito" />
            </FadeUp>
            {openGyms.length === 0 && (
              <EmptyState
                icon="🏋️"
                title="Ninguno abierto ahora"
                text="Prueba con otra zona o vuelve más tarde: los horarios se actualizan solos."
              />
            )}
            {openGyms.map((g, i) => (
              <FadeUp key={g.id} index={i + 3}>
                <View style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardT}>{g.name}</Text>
                    <Pill color={C.brand} soft={C.brandSoft}>Abierto</Pill>
                  </View>
                  <Text style={styles.rowS}>{g.address}</Text>
                  <Text style={styles.rowS}>{g.openHour ?? "?"}:00 – {g.closeHour ?? "?"}:00 · {g.service}</Text>
                  <Press style={[styles.btn, { marginTop: 10 }]} onPress={() => checkin(g.id, g.name)}>
                    <Text style={styles.btnTxt}>✓ Estoy aquí: registrar visita</Text>
                  </Press>
                  {g.videoUrl ? (
                    <Press style={[styles.btn, { backgroundColor: DARK, marginTop: 10 }]} onPress={() => openVideo(g.videoUrl)}>
                      <Text style={styles.btnTxt}>▶ Video del gimnasio</Text>
                    </Press>
                  ) : null}
                </View>
              </FadeUp>
            ))}
          </View>
        )}

        {tab === "comidas" && (
          <View>
            <SectionHead title="Lo que comiste" count={meals.length} right={<Pill color={C.info} soft={C.infoSoft}>Lo ve tu admin</Pill>} />
            {meals.length === 0 ? (
              <EmptyState
                icon="🍽️"
                title="Sin registros todavía"
                text="Marca en el menú que preparaste o comiste una comida y aparecerá aquí. Tu admin lo usa para acompañarte."
              />
            ) : (
              <View>
                <FadeUp index={0} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardT}>Tu semana</Text>
                    <Pill color={C.brand} soft={C.brandSoft}>
                      {stats.week.reduce((a, b) => a + b, 0)} kcal
                    </Pill>
                  </View>
                  <Sparkbars data={stats.week} height={40} color={C.brandVivid} highlight={6} />
                </FadeUp>

                {byDay.map(([day, items], gi) => (
                  <View key={day}>
                    <SectionHead title={labelDay(day)} count={items.length} index={gi} />
                    {items.map((m, i) => (
                      <FadeUp key={m.id} index={i} delay={i * 40}>
                        <View style={styles.row}>
                          <View style={[styles.srcIcon, { backgroundColor: m.source === "RESTAURANTE" ? C.orangeSoft : C.brandSoft }]}>
                            <Text style={{ fontSize: 14 }}>{m.source === "RESTAURANTE" ? "🍽️" : "🏠"}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowT}>{m.name || m.type}</Text>
                            <Text style={styles.rowS}>{m.calories ?? 0} kcal · {m.proteinG ?? 0}g proteína</Text>
                          </View>
                          <Pill color={m.source === "RESTAURANTE" ? C.orange : C.brand} soft={m.source === "RESTAURANTE" ? C.orangeSoft : C.brandSoft}>
                            {m.source === "RESTAURANTE" ? "Local" : "Casa"}
                          </Pill>
                        </View>
                      </FadeUp>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {tab === "plan" && (
          <View>
            <SectionHead
              title="Tu membresía"
              right={
                <Pill color={isPremium ? C.amber : C.muted} soft={isPremium ? C.amberSoft : C.surface2}>
                  {user.membership || "BASICA"}
                </Pill>
              }
            />
            <FadeUp index={0} style={[styles.card, isPremium && { borderColor: C.amberVivid + "66" }]}>
              <Text style={styles.cardT}>{isPremium ? "PREMIUM · activo" : "BÁSICA · gratis"}</Text>
              <Text style={styles.rowS}>
                {isPremium
                  ? "Un nutricionista y un entrenador siguen tu progreso cada semana."
                  : "Con PREMIUM un nutricionista y un entrenador siguen tu progreso para mejores resultados."}
              </Text>
              {BENEFICIOS.map((b) => {
                const on = isPremium || b.free;
                return (
                  <View key={b.t} style={plan.row}>
                    <View style={[plan.tick, { backgroundColor: on ? C.brandSoft : C.surface2 }]}>
                      <Text style={{ fontSize: 11, color: on ? C.brand : C.muted }}>{on ? "✓" : "—"}</Text>
                    </View>
                    <Text style={[plan.txt, on && { color: C.text, fontWeight: "700" }]}>{b.t}</Text>
                  </View>
                );
              })}
              {!isPremium && (
                <Press style={[styles.btn, { backgroundColor: C.amberVivid, marginTop: 12 }]} onPress={upgrade}>
                  <Text style={styles.btnTxt}>Subir a PREMIUM · S/ 49.90</Text>
                </Press>
              )}
            </FadeUp>
            {isPremium && (
              <FadeUp index={1} style={styles.card}>
                <Text style={styles.cardT}>Sigue así</Text>
                <Text style={styles.rowS}>Registra tus comidas cada día: con eso tu equipo arma tus siguientes menús.</Text>
                <Press style={[styles.btn, { backgroundColor: C.brand, marginTop: 10 }]} onPress={() => setTab("hoy")}>
                  <Text style={styles.btnTxt}>Ver mi progreso de hoy</Text>
                </Press>
              </FadeUp>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fbfaf7" },
  loginCard: { flexGrow: 1, justifyContent: "center", padding: 24 },
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
  linkBtn: { marginTop: 10 },
  link: { color: "#15803d", fontWeight: "800", textAlign: "center" },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#22c55e", alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarTxt: { color: "#04150a", fontWeight: "900", fontSize: 18 },
  avatarStar: { position: "absolute", right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: "#f59e0b", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" },
  srcIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginRight: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  logoutBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#dbe1d8", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 10 },
  logoutTxt: { color: "#45564c", fontWeight: "800", fontSize: 12 },
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

// --- Estilos del rediseño (usuario) ---
const menu = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe1d8",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  cardToday: { borderColor: "#22c55e", backgroundColor: "#f0fdf4", shadowColor: "#15803d", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  footRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
});

const today = StyleSheet.create({
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  date: { fontSize: 13, fontWeight: "800", color: "#5f7167" },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe1d8",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
  },
  heroSide: { flex: 1 },
  heroRest: { fontSize: 12, fontWeight: "800", color: "#12211a", marginBottom: 4 },
  heroVal: { fontSize: 26, fontWeight: "900", color: "#12211a", letterSpacing: -0.6 },
  heroGoal: { fontSize: 11, color: "#5f7167", fontWeight: "700", marginTop: 1 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe1d8",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardT: { fontSize: 15, fontWeight: "900", color: "#12211a" },
  rowS: { fontSize: 12, color: "#5f7167", marginTop: 2 },
  weekLabels: { flexDirection: "row", gap: 4, marginTop: 6 },
  weekL: { flex: 1, textAlign: "center", fontSize: 10, color: "#5f7167", fontWeight: "700" },
  btn: { marginTop: 12, borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  dataGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, marginBottom: 4 },
  dataCell: { flexGrow: 1, minWidth: 70, backgroundColor: "#f1f5e9", borderRadius: 14, padding: 10 },
  dataK: { fontSize: 10, fontWeight: "800", color: "#5f7167", textTransform: "uppercase", letterSpacing: 0.6 },
  dataV: { fontSize: 15, fontWeight: "900", color: "#12211a", marginTop: 2 },
});

const rut = StyleSheet.create({
  hour: { fontSize: 21, fontWeight: "900", color: "#0f766e", letterSpacing: -0.5 },
});

const plan = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 9 },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  txt: { flex: 1, fontSize: 12.5, color: "#5f7167" },
});
