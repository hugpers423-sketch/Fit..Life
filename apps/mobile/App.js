import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FadeUp, useReduceMotion } from "./nfui";

// URL de la API: usa app.json (extra.apiUrl) si existe, si no la IP LAN de tu PC.
// En emulador Android usa http://10.0.2.2:3001 ; en iOS/web http://localhost:3001
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

async function af(path, init) {
  const isAuthPath = path.startsWith("/api/auth/") && path !== "/api/auth/me";
  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
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
    const err = new Error(body.error || `API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Paleta design system NutriFlow v3.0 (globals.css)
const ROLE_COLORS = {
  SUPER_ADMIN: "#f59e0b", // --amber-vivid
  ORIENTADOR: "#14b8a6",  // --teal-vivid
  VENDEDOR: "#fb7185",    // --coral-vivid
  USUARIO: "#22c55e",     // --brand-vivid
  QUIOSK: "#f97316",      // --orange-vivid
};

const FILTERS = ["Todos", "USUARIO", "ORIENTADOR", "VENDEDOR", "SUPER_ADMIN", "QUIOSK"];

function timeAgo(d, now) {
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `hace ${Math.floor(s / 3600)} h`;
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [meals, setMeals] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncAt, setSyncAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  useReduceMotion();
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [token, setToken] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState("super_admin@nutriflow.com");
  const [pass, setPass] = useState("password123");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("login"); // login | forgot | reset
  const [newPass, setNewPass] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [ok, setOk] = useState("");

  async function login() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `API ${res.status}`);
      await persistSession(data);
      setToken(API_TOKEN);
      setLoading(true);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `API ${res.status}`);
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setMode("reset");
        setOk("Código generado. Ingresa tu nueva contraseña.");
      } else {
        setOk("Si el correo existe, se enviaron las instrucciones.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPass() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken.trim(), password: newPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `API ${res.status}`);
      setMode("login");
      setNewPass("");
      setPass("");
      setOk("Contraseña actualizada. Ingresa con tu nueva clave.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function salir() {
    try {
      await af("/api/auth/logout", { method: "POST" });
    } catch (_) {}
    await clearSession();
    setToken("");
    setMode("login");
    setOk("");
    setError("");
  }

  const load = useCallback(async () => {
    try {
      const [u, m, w] = await Promise.all([
        af(`/api/admin/users?role=SUPER_ADMIN`),
        af(`/api/meals?role=SUPER_ADMIN`),
        af(`/api/workouts?role=SUPER_ADMIN`),
      ]);
      setUsers(u);
      setMeals(m.ok !== false ? m : []);
      setWorkouts(w.ok !== false ? w : []);
      setError("");
      setSyncAt(new Date());
    } catch (e) {
      // Solo un 401 real cierra la sesión; un 500/red no debe desloguear.
      if (e && e.status === 401) {
        setError("Sesión vencida: ingresa de nuevo.");
        API_TOKEN = "";
        setToken("");
      } else if (e && e.status) {
        setError(`La API respondió ${e.status}: ${e.message}`);
      } else {
        setError(`Sin conexión con la API (${API_URL}). Inicia: node src/index.js en apps/api`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Restaura la sesión guardada al abrir la app (valida el token guardado).
  useEffect(() => {
    (async () => {
      const t = await storeGet("nf_token");
      const r = await storeGet("nf_refresh");
      const uraw = await storeGet("nf_user");
      if (t) { API_TOKEN = t; setToken(t); }
      if (r) REFRESH_TOKEN = r;
      if (uraw) { try { const u = JSON.parse(uraw); if (u && u.role) API_ROLE = u.role; } catch (e) {} }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!API_TOKEN) { setLoading(false); return; }
    load();
  }, [hydrated, load]);

  // SINCRONIZACIÓN EN TIEMPO REAL (silenciosa)
  useEffect(() => {
    if (!token) return;
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
          if (vivo) load();
        }
      } catch { /* sin conexión */ }
    }, 3000);
    return () => { vivo = false; clearInterval(id); };
  }, [token, load]);

  const byRole = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const shown = filter === "Todos" ? users : users.filter((u) => u.role === filter);
  const recent = [...meals]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 5);

  const kpis = [
    { label: "Usuarios", value: String(users.length), color: "#22c55e" },       // brand-vivid
    { label: "Comidas", value: String(meals.length), color: "#14b8a6" },        // teal-vivid
    { label: "Entrenos", value: String(workouts.length), color: "#f59e0b" },    // amber-vivid
    { label: "Orientadores", value: String(byRole.ORIENTADOR || 0), color: "#0f766e" }, // teal
    { label: "Vendedores", value: String(byRole.VENDEDOR || 0), color: "#fb7185" },     // coral-vivid
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkTxt}>N</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>NutriFlow</Text>
            <Text style={styles.brandBadge}>ADMIN · APP</Text>
          </View>
          {token ? (
            <TouchableOpacity style={styles.logoutBtn} onPress={salir}>
              <Text style={styles.logoutTxt}>Salir</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.hTitle}>Dashboard General</Text>
        <Text style={styles.hSub}>Lo mismo que el Admin General web · {syncAt ? timeAgo(syncAt, now) : "sincronizando…"}</Text>
      </View>

      {!token ? (
        <ScrollView style={styles.body} contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          {mode === "login" && (
            <>
              <Text style={styles.section}>Ingresar</Text>
              <TextInput style={styles.input} placeholder="correo@ejemplo.com" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor={C.muted} secureTextEntry value={pass} onChangeText={setPass} />
              {error !== "" && <Text style={styles.alertTxt}>{error}</Text>}
              {ok !== "" && <Text style={styles.okTxt}>{ok}</Text>}
              <TouchableOpacity style={styles.loginBtn} onPress={login} disabled={busy}>
                <Text style={styles.loginTxt}>{busy ? "Ingresando…" : "Ingresar como Admin"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setMode("forgot"); }}>
                <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === "forgot" && (
            <>
              <Text style={styles.section}>Recuperar contraseña</Text>
              <Text style={styles.muted}>Te generamos un código para restablecerla. Escríbelo y define tu nueva clave.</Text>
              <TextInput style={styles.input} placeholder="correo@ejemplo.com" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              {error !== "" && <Text style={styles.alertTxt}>{error}</Text>}
              {ok !== "" && <Text style={styles.okTxt}>{ok}</Text>}
              <TouchableOpacity style={styles.loginBtn} onPress={forgot} disabled={busy}>
                <Text style={styles.loginTxt}>{busy ? "Enviando…" : "Enviar código"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setMode("login"); }}>
                <Text style={styles.link}>‹ Volver a ingresar</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === "reset" && (
            <>
              <Text style={styles.section}>Nueva contraseña</Text>
              {ok !== "" && <Text style={styles.okTxt}>{ok}</Text>}
              <TextInput style={styles.input} placeholder="Código de recuperación" placeholderTextColor={C.muted} autoCapitalize="none" value={resetToken} onChangeText={setResetToken} />
              <TextInput style={styles.input} placeholder="Nueva contraseña (mín. 8)" placeholderTextColor={C.muted} secureTextEntry value={newPass} onChangeText={setNewPass} />
              {error !== "" && <Text style={styles.alertTxt}>{error}</Text>}
              <TouchableOpacity style={styles.loginBtn} onPress={resetPass} disabled={busy}>
                <Text style={styles.loginTxt}>{busy ? "Guardando…" : "Guardar nueva contraseña"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setMode("login"); }}>
                <Text style={styles.link}>‹ Volver a ingresar</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#22c55e" />}
        >
          {error !== "" && (
            <View style={styles.alert}>
              <Text style={styles.alertTxt}>{error}</Text>
              <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); load(); }}>
                <Text style={styles.retryTxt}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          <FadeUp index={0}>
            <Text style={styles.section}>Plataforma en general</Text>
            <View style={styles.kpiGrid}>
              {kpis.map((k) => (
                <View key={k.label} style={styles.kpi}>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                  <Text style={styles.kpiVal}>{k.value}</Text>
                  <View style={[styles.kpiBar, { backgroundColor: k.color }]} />
                </View>
              ))}
            </View>
          </FadeUp>

          <FadeUp index={1}>
            <Text style={styles.section}>Apps independientes</Text>
            {["USUARIO", "ORIENTADOR", "VENDEDOR"].map((r) => (
              <View key={r} style={styles.appCard}>
                <View style={[styles.dot, { backgroundColor: ROLE_COLORS[r] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.appName}>
                    {r === "USUARIO" ? "App Usuario" : r === "ORIENTADOR" ? "App Orientador" : "App Vendedor"}
                  </Text>
                  <Text style={styles.appSub}>
                    {(byRole[r] || 0)} cuentas · {meals.filter((m) => users.find((u) => u.id === m.userId)?.role === r).length} comidas
                  </Text>
                </View>
              </View>
            ))}
          </FadeUp>

          <FadeUp index={2}>
            <Text style={styles.section}>Usuarios</Text>
          </FadeUp>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, filter === f && styles.chipOn]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.chipTxt, filter === f && styles.chipTxtOn]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {shown.map((u, i) => (
            <FadeUp key={u.id} index={i} delay={i * 35}>
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[u.role] || "#475569" }]}>
                  <Text style={styles.avatarTxt}>
                    {String(u.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{u.name}</Text>
                  <Text style={styles.rowMail}>{u.email}</Text>
                </View>
                <Text style={[styles.role, { color: ROLE_COLORS[u.role] || C.muted }]}>{u.role}</Text>
              </View>
            </FadeUp>
          ))}

          <FadeUp index={2}>
            <Text style={styles.section}>Actividad reciente</Text>
          </FadeUp>
          {recent.length === 0 && <Text style={styles.muted}>Sin actividad todavía.</Text>}
          {recent.map((m, i) => (
            <FadeUp key={m.id} index={i} delay={i * 40}>
              <View style={styles.row}>
                <View style={styles.liveDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{m.type} — {m.calories ?? 0} kcal</Text>
                  <Text style={styles.rowMail}>{new Date(m.createdAt).toLocaleString("es")}</Text>
                </View>
              </View>
            </FadeUp>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// Paleta design system NutriFlow v3.0 (globals.css)
const C = {
  bg: "#fbfaf7",        // --bg
  surface: "#ffffff",   // --surface
  surface2: "#f1f5e9",  // --surface-2
  text: "#12211a",      // --text
  text2: "#45564c",     // --text-2
  muted: "#5f7167",     // --muted
  border: "#dbe1d8",    // --border
  brand: "#15803d",     // --brand
  brandVivid: "#22c55e",// --brand-vivid
  brandSoft: "#dcfce7", // --brand-soft
  coralSoft: "#ffe4e6", // --coral-soft
  coral: "#e11d48",     // --coral
  onBrand: "#04150a",
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: 52, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  brandMark: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.brandVivid, alignItems: "center", justifyContent: "center" },
  brandMarkTxt: { fontWeight: "800", fontSize: 19, color: C.onBrand },
  brandName: { fontWeight: "800", fontSize: 16, color: C.text },
  brandBadge: { fontSize: 9, fontWeight: "700", letterSpacing: 1, color: C.brand },
  hTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  hSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 16 },
  alert: { backgroundColor: C.coralSoft, borderWidth: 1, borderColor: "rgba(225,29,72,.4)", borderRadius: 12, padding: 12, marginBottom: 14 },
  alertTxt: { color: C.coral, fontSize: 13, fontWeight: "600" },
  retry: { marginTop: 8, backgroundColor: C.brandVivid, borderRadius: 8, padding: 10, alignItems: "center" },
  retryTxt: { color: C.onBrand, fontWeight: "800" },
  section: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: C.text2, marginTop: 16, marginBottom: 10 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { width: "31%", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12 },
  kpiLabel: { fontSize: 10, fontWeight: "700", color: C.muted, textTransform: "uppercase" },
  kpiVal: { fontSize: 24, fontWeight: "800", color: C.text, marginTop: 4 },
  kpiBar: { height: 3, borderRadius: 2, marginTop: 8 },
  appCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  appName: { fontSize: 14, fontWeight: "700", color: C.text },
  appSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  chips: { flexDirection: "row", marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, marginRight: 8, backgroundColor: C.surface },
  chipOn: { backgroundColor: C.brandSoft, borderColor: "rgba(21,128,61,.4)" },
  chipTxt: { color: C.muted, fontSize: 12, fontWeight: "700" },
  chipTxtOn: { color: C.brand },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontWeight: "800", fontSize: 12, color: C.onBrand },
  rowName: { fontSize: 13, fontWeight: "700", color: C.text },
  rowMail: { fontSize: 11, color: C.muted, marginTop: 1 },
  role: { fontSize: 10, fontWeight: "800" },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.brandVivid },
  muted: { color: C.muted, fontSize: 13 },
  okTxt: { color: C.brand, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  linkBtn: { marginTop: 12, alignItems: "center" },
  link: { color: C.brand, fontWeight: "800" },
  logoutBtn: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  logoutTxt: { color: C.muted, fontWeight: "800", fontSize: 12 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, color: C.text, marginBottom: 10 },
  loginBtn: { backgroundColor: C.brandVivid, borderRadius: 10, padding: 12, alignItems: "center", marginTop: 4 },
  loginTxt: { color: C.onBrand, fontWeight: "800" },
});
