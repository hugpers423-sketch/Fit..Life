// App Profesional (Orientador) — NutriFlow. Atiende clientes con servicio especializado.
// Reels/tips por especialidad, videollamadas y lives (Jitsi), progreso semanal,
// ingresos mensuales y detalle total de cada cliente. Todo sincronizado con el Admin.
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { C, useReduceMotion, FadeUp, Press, Pill, KpiCard, SectionHead, EmptyState, Sparkbars, Confetti } from "./nfui";
import { IconRun, IconTrophy, IconBell, IconLeaf, IconDumbbell, IconSparkle } from "./nf-icons";

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
const TEAL = "#14b8a6";
const ORANGE = "#f97316";
const DARK = "#04150a";

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

function timeAgo(d, now) {
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `hace ${Math.floor(s / 3600)} h`;
}

function weekKey(iso) {
  const d = new Date(iso);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 864e5 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${week}`;
}

// Los ingredientes pueden venir como texto plano o como lista de objetos
// { name|item, qty, price }. Se normaliza a una sola línea legible.
function fmtIngredientes(ing) {
  if (!ing) return "";
  if (typeof ing === "string") return ing;
  if (Array.isArray(ing)) {
    return ing
      .map((x) => {
        if (typeof x === "string") return x;
        if (!x || typeof x !== "object") return "";
        const nombre = x.name || x.item || x.ingredient || "";
        const qty = x.qty || x.quantity || x.amount || "";
        return [nombre, qty].filter(Boolean).join(" ");
      })
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("orientador@nutriflow.com");
  const [pass, setPass] = useState("orientador1");
  const [mode, setMode] = useState("login"); // login | forgot | reset
  const [newPass, setNewPass] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [tab, setTab] = useState("clientes");
  const [clients, setClients] = useState([]);
  const [meals, setMeals] = useState([]);
  const [posts, setPosts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [payments, setPayments] = useState({ total: 0, count: 0, payments: [] });
  const [selClient, setSelClient] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [pTitle, setPTitle] = useState("");
  const [pKind, setPKind] = useState("REEL");
  const [pMedia, setPMedia] = useState("");
  const [pDesc, setPDesc] = useState("");
  // Recetas (menú semanal)
  const [recipes, setRecipes] = useState([]);
  const [rName, setRName] = useState("");
  const [rDay, setRDay] = useState(1);
  const [rMealType, setRMealType] = useState("DESAYUNO");
  const [rVideo, setRVideo] = useState("");
  const [rIngredients, setRIngredients] = useState("");
  const [rPrice, setRPrice] = useState("");
  const [rCalories, setRCalories] = useState("");
  const [rProtein, setRProtein] = useState("");
  const [reelsSubTab, setReelsSubTab] = useState("reels"); // 'reels' | 'recetas'
  const [showConfetti, setShowConfetti] = useState(false);
  const [sTopic, setSTopic] = useState("");
  const [sClient, setSClient] = useState("");
  const [sType, setSType] = useState("VIDEOCALL");
  const [syncAt, setSyncAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  useReduceMotion();

  // Métricas del panel (lo mismo que muestra el dashboard de la maqueta).
  const monthTotal = Number(payments.total || 0);
  const hoyISO = new Date().toISOString().slice(0, 10);
  const sessionsToday = sessions.filter((s) => String(s.createdAt || s.scheduledAt || "").slice(0, 10) === hoyISO);
  const registros = meals.length;
  const pendientes = pending.length;

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
        setMode("reset");
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
      setMode("login");
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
    setMode("login");
    setOk("");
    setError("");
  }

  async function load(uid) {
    const id = uid || (user && user.id);
    if (!id) return;
    setRefreshing(true);
    try {
      const [u, m, p, s, pay, pend] = await Promise.all([
        api(`/api/clients`),
        api(`/api/meals?role=SUPER_ADMIN`),
        api(`/api/posts?authorId=${id}`),
        api(`/api/sessions?professionalId=${id}`),
        api(`/api/payments?professionalId=${id}`),
        api(`/api/products?approved=false`),
      ]);
      setClients(u.filter((x) => x.role === "USUARIO"));
      setMeals(m);
      setPosts(p);
      setSessions(s);
      setPayments(pay);
      setPending(pend);
      setError("");
      setSyncAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
    loadRecipes();
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
      } catch { /* sin conexión */ }
    }, 3000);
    return () => { vivo = false; clearInterval(id); };
  }, [user]);

  const spec = user?.specialty === "ENTRENADOR" ? "ENTRENADOR" : "NUTRICIONISTA";

  async function publish() {
    if (!pTitle.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    try {
      await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ authorId: user.id, kind: pKind, title: pTitle.trim(), mediaUrl: pMedia.trim() || null, description: pDesc.trim() || null, specialty: spec }),
      });
      setOk(`${pKind === "REEL" ? "Reel" : "Publicación"} publicada.`);
      setPTitle("");
      setPMedia("");
      setPDesc("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function createSession() {
    if (!sTopic.trim()) {
      setError("El tema es obligatorio.");
      return;
    }
    try {
      const s = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          professionalId: user.id,
          clientId: sClient || null,
          type: sType,
          topic: sTopic.trim(),
        }),
      });
      setOk(`${sType === "LIVE" ? "Live creado" : "Videollamada programada"}. Enlace: ${s.meetUrl}`);
      setSTopic("");
      setSClient("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function approveProduct(id, okVal) {
    try {
      await api(`/api/products/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ approved: okVal, approvedById: user.id }),
      });
      setOk(okVal ? "Producto avalado." : "Aval retirado.");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadRecipes() {
    try {
      const data = await api(`/api/recipes`);
      setRecipes(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      // Silencioso si falla
    }
  }

  async function publishRecipe() {
    if (!rName.trim()) {
      setError("El nombre de la receta es obligatorio.");
      return;
    }
    if (!rIngredients.trim()) {
      setError("Los ingredientes son obligatorios.");
      return;
    }
    try {
      await api("/api/recipes", {
        method: "POST",
        body: JSON.stringify({
          authorId: user.id,
          name: rName.trim(),
          day: Number(rDay),
          mealType: rMealType,
          videoUrl: rVideo.trim() || null,
          ingredients: rIngredients.trim(),
          totalPrice: Number(rPrice) || 0,
          calories: Number(rCalories) || 0,
          proteinG: Number(rProtein) || 0,
        }),
      });
      setOk("Receta publicada en el menú semanal.");
      setError("");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1200);
      setRName("");
      setRVideo("");
      setRIngredients("");
      setRPrice("");
      setRCalories("");
      setRProtein("");
      setRDay(1);
      setRMealType("DESAYUNO");
      loadRecipes();
    } catch (e) {
      setError(e.message);
    }
  }

  function join(url) {
    if (url) Linking.openURL(url).catch(() => {});
  }

  const mealsByUser = {};
  meals.forEach((m) => {
    mealsByUser[m.userId] = mealsByUser[m.userId] || [];
    mealsByUser[m.userId].push(m);
  });

  function weekly(userId) {
    const map = {};
    (mealsByUser[userId] || []).forEach((m) => {
      const k = weekKey(m.scheduledAt || m.createdAt);
      map[k] = map[k] || { kcal: 0, n: 0 };
      map[k].kcal += Number(m.calories || 0);
      map[k].n += 1;
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 8);
  }

  const monthNow = new Date().toISOString().slice(0, 7);

  if (!user) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.loginCard} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Nutri<Text style={{ color: GREEN }}>Flow</Text></Text>
          <Text style={[styles.appTag, { color: TEAL }]}>APP PROFESIONAL</Text>

          {mode === "login" && (
            <>
              <Text style={styles.title}>Atiende a tus clientes</Text>
              <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Contraseña" value={pass} onChangeText={setPass} secureTextEntry />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              {ok !== "" && <Text style={styles.ok}>{ok}</Text>}
              <Pressable style={[styles.btn, { backgroundColor: TEAL }]} onPress={login} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Ingresando…" : "Ingresar"}</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setMode("forgot"); }}>
                <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
              <Text style={styles.hint}>Reels, videollamadas, lives, progreso e ingresos.</Text>
            </>
          )}

          {mode === "forgot" && (
            <>
              <Text style={styles.title}>Recuperar contraseña</Text>
              <Text style={styles.muted}>Te generamos un código para restablecerla. Escríbelo y define tu nueva clave.</Text>
              <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              {ok !== "" && <Text style={styles.ok}>{ok}</Text>}
              <Pressable style={[styles.btn, { backgroundColor: TEAL }]} onPress={forgot} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Enviando…" : "Enviar código"}</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setMode("login"); }}>
                <Text style={styles.link}>‹ Volver a ingresar</Text>
              </Pressable>
            </>
          )}

          {mode === "reset" && (
            <>
              <Text style={styles.title}>Nueva contraseña</Text>
              {ok !== "" && <Text style={styles.ok}>{ok}</Text>}
              <Field label="Código de recuperación" value={resetToken} onChangeText={setResetToken} autoCapitalize="none" />
              <Field label="Nueva contraseña (mín. 8)" value={newPass} onChangeText={setNewPass} secureTextEntry />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              <Pressable style={[styles.btn, { backgroundColor: TEAL }]} onPress={resetPass} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Guardando…" : "Guardar nueva contraseña"}</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setMode("login"); }}>
                <Text style={styles.link}>‹ Volver a ingresar</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  const TABS = [["clientes", "Clientes"], ["reels", "Reels"], ["sesiones", "Lives/Tel"], ["progreso", "Progreso"], ["ingresos", "Ingresos"], ["avales", "Avales"]];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: C.tealVivid }]}>
            <Text style={styles.avatarTxt}>{String(user.name || "P").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hola, {user.name.split(" ")[0]}</Text>
            <View style={styles.subRow}>
              <Pill color={C.teal} soft={C.tealSoft}>{spec}</Pill>
              <Pill color={C.muted} soft={C.surface2}>{clients.length} clientes</Pill>
              <Text style={styles.sub}>{syncAt ? timeAgo(syncAt, now) : "sincronizando…"}</Text>
            </View>
          </View>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutTxt}>Salir</Text>
          </Pressable>
        </View>
        <View style={styles.kpiRow}>
          <KpiCard index={0} icon={<IconRun size={17} color={C.tealVivid} />} value={clients.length} label="Clientes" color={C.tealVivid} />
          <KpiCard index={1} icon={<IconTrophy size={17} color={C.amberVivid} />} value={monthTotal} label="Ingresos del mes" color={C.amberVivid} format={(n) => `S/ ${Math.round(n)}`} />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard index={2} icon={<IconBell size={17} color={C.brandVivid} />} value={sessionsToday.length} label="Sesiones de hoy" color={C.brandVivid} />
          <KpiCard index={3} icon={<IconLeaf size={17} color={C.coralVivid} />} value={registros} label="Registros recibidos" color={C.coralVivid} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {TABS.map(([t, label]) => (
            <Press
              key={t}
              style={[styles.tab, tab === t && styles.tabOn]}
              scale={0.94}
              onPress={() => { setTab(t); setSelClient(null); }}
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

        {tab === "clientes" && !selClient && (
          <View>
            <SectionHead title="Tus clientes" count={clients.length} />
            {clients.length === 0 && (
              <EmptyState
                icon="👥"
                title="Sin clientes todavía"
                text="Cuando un usuario contrate tu servicio aparecerá aquí con todo su registro de comidas."
              />
            )}
            {clients.map((c, i) => {
              const regs = (mealsByUser[c.id] || []).length;
              const kcal = (mealsByUser[c.id] || []).reduce((a, m) => a + (Number(m.calories) || 0), 0);
              return (
                <FadeUp key={c.id} index={i}>
                  <Press style={pro.card} onPress={() => setSelClient(c)}>
                    <View style={pro.avatar}>
                      <Text style={pro.avatarTxt}>{String(c.name || "?").slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={pro.headRow}>
                        <Text style={styles.rowT} numberOfLines={1}>{c.name}</Text>
                        {c.membership === "PREMIUM" ? <Pill color={C.amber} soft={C.amberSoft}>PREMIUM</Pill> : null}
                      </View>
                      <Text style={styles.rowS}>{c.email}</Text>
                      <Text style={styles.rowS}>{regs} registros · {kcal} kcal acumuladas</Text>
                    </View>
                    <Text style={pro.more}>›</Text>
                  </Press>
                </FadeUp>
              );
            })}
          </View>
        )}

        {tab === "clientes" && selClient && (
          <View>
            <Pressable onPress={() => setSelClient(null)}>
              <Text style={styles.back}>‹ Volver a clientes</Text>
            </Pressable>
            <Text style={styles.secT}>{selClient.name}</Text>
            <Text style={styles.rowS}>{selClient.email} · Membresía {selClient.membership || "BASICA"}</Text>
            <Text style={styles.secT2}>Todo lo ocurrido en plataforma</Text>
            {(mealsByUser[selClient.id] || []).slice(-15).reverse().map((m) => (
              <View key={m.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{m.name || m.type}{m.source === "RESTAURANTE" ? " 🍽️" : ""}</Text>
                  <Text style={styles.rowS}>{m.calories ?? 0} kcal · {m.proteinG ?? 0}g prot · {String(m.scheduledAt || m.createdAt).slice(0, 10)}</Text>
                </View>
              </View>
            ))}
            {(mealsByUser[selClient.id] || []).length === 0 && <Text style={styles.muted}>Sin registros todavía.</Text>}
            <Pressable
              style={[styles.btn, { backgroundColor: TEAL, marginTop: 10 }]}
              onPress={() => {
                setSTopic(`Seguimiento ${selClient.name}`);
                setSClient(selClient.id);
                setSType("VIDEOCALL");
                setTab("sesiones");
              }}
            >
              <Text style={styles.btnTxt}>Agendar videollamada</Text>
            </Pressable>
          </View>
        )}

        {tab === "reels" && (
          <View>
            <View style={styles.chips}>
              {["reels", "recetas"].map((k) => (
                <Pressable key={k} style={[styles.chip, reelsSubTab === k && styles.chipOn]} onPress={() => setReelsSubTab(k)}>
                  <Text style={[styles.chipTxt, reelsSubTab === k && styles.chipTxtOn]}>{k === "reels" ? "Reels / Tips" : "Recetas"}</Text>
                </Pressable>
              ))}
            </View>
            {reelsSubTab === "reels" && (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardT}>Publicar reel / tip ({spec})</Text>
                  <View style={styles.chips}>
                    {["REEL", "VIDEO", "FOTO", "TIP"].map((k) => (
                      <Pressable key={k} style={[styles.chip, pKind === k && styles.chipOn]} onPress={() => setPKind(k)}>
                        <Text style={[styles.chipTxt, pKind === k && styles.chipTxtOn]}>{k}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Field label="Título" value={pTitle} onChangeText={setPTitle} placeholder="Rutina de pierna en 20 min" />
                  <Field label="URL foto/video (opcional)" value={pMedia} onChangeText={setPMedia} autoCapitalize="none" placeholder="https://…" />
                  <Field label="Descripción / tip" value={pDesc} onChangeText={setPDesc} placeholder="3 series de 12…" />
                  <Pressable style={styles.btn} onPress={publish}>
                    <Text style={styles.btnTxt}>Publicar</Text>
                  </Pressable>
                </View>
                {posts.map((p) => (
                  <View key={p.id} style={styles.card}>
                    <Text style={[styles.rowS, { fontWeight: "800", color: TEAL }]}>{p.kind} · {p.specialty || ""}</Text>
                    <Text style={styles.cardT}>{p.title}</Text>
                    {p.mediaUrl && p.kind === "FOTO" ? (
                      <Image source={{ uri: p.mediaUrl }} style={{ width: "100%", height: 180, borderRadius: 12, marginTop: 8 }} />
                    ) : null}
                    {p.description ? <Text style={styles.rowS}>{p.description}</Text> : null}
                    {p.mediaUrl && p.kind !== "FOTO" ? (
                      <Pressable style={[styles.btn, { backgroundColor: DARK, marginTop: 10 }]} onPress={() => Linking.openURL(p.mediaUrl).catch(() => {})}>
                        <Text style={styles.btnTxt}>▶ Ver {p.kind === "LIVE" ? "live" : "video"}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
            {reelsSubTab === "recetas" && (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardT}>Publicar receta en menú semanal</Text>
                  <Field label="Nombre" value={rName} onChangeText={setRName} placeholder="Ensalada de quinoa y pollo" />
                  <View style={styles.chips}>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <Pressable key={d} style={[styles.chip, rDay === d && styles.chipOn]} onPress={() => setRDay(d)}>
                        <Text style={[styles.chipTxt, rDay === d && styles.chipTxtOn]}>Día {d}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.chips}>
                    {["DESAYUNO", "COMIDA", "CENA", "SNACK"].map((k) => (
                      <Pressable key={k} style={[styles.chip, rMealType === k && styles.chipOn]} onPress={() => setRMealType(k)}>
                        <Text style={[styles.chipTxt, rMealType === k && styles.chipTxtOn]}>{k}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Field label="URL video (opcional)" value={rVideo} onChangeText={setRVideo} autoCapitalize="none" placeholder="https://…" />
                  <Field label="Ingredientes (JSON o texto)" value={rIngredients} onChangeText={setRIngredients} placeholder='[{"item":"Pollo","qty":"150g"},{"item":"Quinoa","qty":"80g"}]' />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Field style={{ flex: 1 }} label="Precio total (S/)" value={rPrice} onChangeText={setRPrice} keyboardType="numeric" placeholder="12.50" />
                    <Field style={{ flex: 1 }} label="Calorías" value={rCalories} onChangeText={setRCalories} keyboardType="numeric" placeholder="350" />
                    <Field style={{ flex: 1 }} label="Proteína (g)" value={rProtein} onChangeText={setRProtein} keyboardType="numeric" placeholder="28" />
                  </View>
                  <Pressable style={styles.btn} onPress={publishRecipe}>
                    <Text style={styles.btnTxt}>Publicar receta</Text>
                  </Pressable>
                </View>
                {recipes.length === 0 ? (
                  <EmptyState
                    icon="🍽️"
                    title="Sin recetas publicadas"
                    text="Crea tu menú semanal día por día. Se hace upsert por día y tipo de comida."
                  />
                ) : (
                  recipes.map((rc, i) => (
                    <FadeUp key={rc.id} index={i} style={styles.card}>
                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <View style={pro.headRow}>
                            <Text style={styles.rowT}>{rc.name}</Text>
                            <Pill color={C.teal} soft={C.tealSoft}>{rc.mealType}</Pill>
                            <Pill color={C.info} soft={C.infoSoft}>Día {rc.day}</Pill>
                          </View>
                          <Text style={styles.rowS}>{rc.calories} kcal · {rc.proteinG}g prot · S/ {Number(rc.totalPrice || 0).toFixed(2)}</Text>
                          <Text style={styles.rowS}>{fmtIngredientes(rc.ingredients)}</Text>
                        </View>
                      </View>
                    </FadeUp>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {tab === "sesiones" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardT}>Nueva videollamada o live</Text>
              <View style={styles.chips}>
                {["VIDEOCALL", "LIVE"].map((k) => (
                  <Pressable key={k} style={[styles.chip, sType === k && styles.chipOn]} onPress={() => setSType(k)}>
                    <Text style={[styles.chipTxt, sType === k && styles.chipTxtOn]}>{k === "VIDEOCALL" ? "Videollamada" : "Live"}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Tema (ej. Capacitación nutrición)" value={sTopic} onChangeText={setSTopic} placeholder="Tema de la sesión" />
              <Text style={styles.label}>Cliente (opcional en lives)</Text>
              <View style={styles.chips}>
                <Pressable style={[styles.chip, sClient === "" && styles.chipOn]} onPress={() => setSClient("")}>
                  <Text style={[styles.chipTxt, sClient === "" && styles.chipTxtOn]}>Abierto</Text>
                </Pressable>
                {clients.map((c) => (
                  <Pressable key={c.id} style={[styles.chip, sClient === c.id && styles.chipOn]} onPress={() => setSClient(c.id)}>
                    <Text style={[styles.chipTxt, sClient === c.id && styles.chipTxtOn]}>{c.name.split(" ")[0]}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={[styles.btn, { backgroundColor: TEAL, marginTop: 10 }]} onPress={createSession}>
                <Text style={styles.btnTxt}>Crear y obtener enlace</Text>
              </Pressable>
            </View>
            {sessions.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{s.type === "LIVE" ? "🔴 LIVE" : "📞 Videollamada"} · {s.topic}</Text>
                  <Text style={styles.rowS}>{s.client ? s.client.name : "Abierto"} · {s.status}</Text>
                </View>
                <Pressable style={styles.join} onPress={() => join(s.meetUrl)}>
                  <Text style={styles.joinTxt}>Unirse</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {tab === "progreso" && (
          <View>
            <Text style={styles.secT}>Avance semana a semana</Text>
            {clients.length === 0 && <Text style={styles.muted}>Sin clientes todavía.</Text>}
            {clients.map((c) => (
              <View key={c.id} style={styles.card}>
                <Text style={styles.cardT}>{c.name}</Text>
                {weekly(c.id).length === 0 && <Text style={styles.rowS}>Sin registros.</Text>}
                {weekly(c.id).map(([w, d]) => (
                  <View key={w} style={styles.prow}>
                    <Text style={styles.rowT}>{w}</Text>
                    <Text style={styles.rowS}>{d.n} comidas · {d.kcal} kcal</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFg, { width: `${Math.min(100, d.n * 20)}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {tab === "ingresos" && (
          <View>
            <SectionHead title="Ingresos" right={<Pill color={C.amber} soft={C.amberSoft}>{monthNow}</Pill>} />
            <FadeUp index={0} style={styles.card}>
              <Text style={styles.cardT}>Total {monthNow}</Text>
              <Text style={pro.big}>S/ {Number(payments.total || 0).toFixed(2)}</Text>
              <Text style={styles.rowS}>{payments.count || 0} cobros registrados · 85% para ti</Text>
              <View style={{ marginTop: 12 }}>
                <Sparkbars
                  data={(payments.payments || []).slice(-7).map((p) => Number(p.amount) || 0)}
                  height={40}
                  color={C.amberVivid}
                />
                <Text style={[styles.rowS, { marginTop: 6 }]}>Últimos {(payments.payments || []).slice(-7).length} cobros</Text>
              </View>
            </FadeUp>
            {(payments.payments || []).map((p, i) => (
              <FadeUp key={p.id} index={i} delay={i * 40}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowT}>S/ {Number(p.amount).toFixed(2)} · {p.concept}</Text>
                    <Text style={styles.rowS}>{p.user ? p.user.name : ""} · {p.month}</Text>
                  </View>
                  <Pill color={C.brand} soft={C.brandSoft}>85%</Pill>
                </View>
              </FadeUp>
            ))}
          </View>
        )}
        {tab === "avales" && (
          <View>
            <Text style={styles.secT}>Productos pendientes de aval</Text>
            <Text style={styles.rowS}>Solo marcas reconocidas, avaladas por nutricionista.</Text>
            {pending.length === 0 && <Text style={styles.muted}>Sin pendientes. Todo avalado ✓</Text>}
            {pending.map((p) => (
              <View key={p.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{p.name}</Text>
                  <Text style={styles.rowS}>{p.brand}</Text>
                </View>
                <Pressable style={[styles.btn, { padding: 10, marginTop: 0 }]} onPress={() => approveProduct(p.id, true)}>
                  <Text style={styles.btnTxt}>Avalar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
        {showConfetti && <Confetti count={18} duration={900} active={true} colors={[C.brandVivid, C.amberVivid, C.coralVivid, C.tealVivid, C.infoVivid]} />}
      </ScrollView>
    </View>
  );

  function weekly(userId) {
    const map = {};
    (mealsByUser[userId] || []).forEach((m) => {
      const k = weekKey(m.scheduledAt || m.createdAt);
      map[k] = map[k] || { kcal: 0, n: 0 };
      map[k].kcal += Number(m.calories || 0);
      map[k].n += 1;
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 8);
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fbfaf7" },
  loginCard: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: { fontSize: 30, fontWeight: "900", color: "#12211a" },
  appTag: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginTop: 4 },
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
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarTxt: { color: "#04150a", fontWeight: "900", fontSize: 18 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" },
  kpiRow: { flexDirection: "row", gap: 10, marginTop: 12 },
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
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe1d8", borderRadius: 20, padding: 18, marginBottom: 14 },
  cardT: { fontSize: 16, fontWeight: "800", color: "#12211a", marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "#dbe1d8" },
  chipOn: { backgroundColor: "#dcfce7", borderColor: GREEN },
  chipTxt: { color: "#5f7167", fontSize: 12, fontWeight: "700" },
  chipTxtOn: { color: "#15803d" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe1d8", borderRadius: 14, padding: 12, marginBottom: 8 },
  rowT: { fontSize: 14, fontWeight: "800", color: "#12211a" },
  rowS: { fontSize: 12, color: "#5f7167", marginTop: 2 },
  more: { fontSize: 22, fontWeight: "800", color: GREEN },
  back: { color: "#15803d", fontWeight: "800", marginBottom: 8 },
  join: { backgroundColor: DARK, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  joinTxt: { color: "#fff", fontWeight: "800" },
  big: { fontSize: 30, fontWeight: "900", color: "#12211a", marginTop: 4 },
  prow: { marginBottom: 10 },
  barBg: { height: 8, borderRadius: 4, backgroundColor: "#e8efe0", marginTop: 6, overflow: "hidden" },
  barFg: { height: "100%", backgroundColor: GREEN, borderRadius: 4 },
});

// --- Estilos del rediseño (profesional) ---
const pro = StyleSheet.create({
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
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#ccfbf1", alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarTxt: { fontWeight: "900", color: "#0f766e", fontSize: 16 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  more: { fontSize: 22, color: "#9fb3a7", fontWeight: "800", marginLeft: 4 },
  big: { fontSize: 30, fontWeight: "900", color: "#b45309", letterSpacing: -0.6, marginTop: 4 },
});