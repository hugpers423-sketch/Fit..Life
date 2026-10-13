// App Vendedor — NutriFlow. Gestiona clientes y registra gimnasios/restaurantes.
// Todo se guarda en la API central: el Admin General lo ve al instante.
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
import { C, useReduceMotion, FadeUp, Press, Pill, KpiCard, SectionHead, EmptyState, Sparkbars, ProgressBar, Confetti } from "./nfui";
import { IconRun, IconLeaf, IconFlame, IconDumbbell, IconCheck, IconBell } from "./nf-icons";

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

const GREEN = "#22c55e";   // --brand-vivid
const ORANGE = "#f97316";  // --orange-vivid
const BRAND = "#15803d";   // --brand

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

// ============================================================================
//  App Vendedor (Negocio) — NutriFlow
//  DIVIDIDA POR TIPO DE NEGOCIO: GIMNASIO o RESTAURANTE.
//  Cada negocio ve y gestiona SOLO sus datos: nunca los de otro negocio.
//  Tabs: Resumen · Ventas · Clientes · Mi negocio · producto/menú · Contenido
// ============================================================================
const TABS_GYM = [
  ["resumen", "Resumen"],
  ["ventas", "Ventas"],
  ["clientes", "Clientes"],
  ["negocio", "Mi gimnasio"],
  ["productos", "Productos"],
  ["contenido", "Contenido"],
];
const TABS_REST = [
  ["resumen", "Resumen"],
  ["ventas", "Ventas"],
  ["clientes", "Clientes"],
  ["negocio", "Mi restaurante"],
  ["menu", "Mi menú"],
  ["contenido", "Contenido"],
];

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("vendedor@nutriflow.com");
  const [pass, setPass] = useState("123456");
  const [mode, setMode] = useState("login"); // login | forgot | reset
  const [newPass, setNewPass] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [tab, setTab] = useState("resumen");
  const [syncAt, setSyncAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [celebrar, setCelebrar] = useState(false);

  // Datos del negocio (siempre filtrados por dueño en la API).
  const [clients, setClients] = useState([]);
  const [myGym, setMyGym] = useState(null);
  const [myRest, setMyRest] = useState(null);
  const [products, setProducts] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [ventas, setVentas] = useState([]);   // comidas del restaurante
  const [visitas, setVisitas] = useState([]); // asistencias del gimnasio
  const [posts, setPosts] = useState([]);

  // Formularios del negocio.
  const [bName, setBName] = useState("");
  const [bAddress, setBAddress] = useState("");
  const [bService, setBService] = useState("");
  const [bVideo, setBVideo] = useState("");
  const [bOpen, setBOpen] = useState("");
  const [bClose, setBClose] = useState("");
  const [pName, setPName] = useState("");
  const [pBrand, setPBrand] = useState("");
  const [dName, setDName] = useState("");
  const [dCal, setDCal] = useState("");
  const [dProt, setDProt] = useState("");
  const [dPrice, setDPrice] = useState("");
  const [dDay, setDDay] = useState("");
  const [pTitulo, setPTitulo] = useState("");
  const [pKind, setPKind] = useState("TIP");
  const [pTexto, setPTexto] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  useReduceMotion();

  const biz = user?.businessType || null;
  const esGym = biz === "GIMNASIO";
  const esRest = biz === "RESTAURANTE";
  const TABS = esRest ? TABS_REST : TABS_GYM;
  const colorBiz = esRest ? C.coralVivid : C.tealVivid;
  const colorBizSoft = esRest ? C.coralSoft : C.tealSoft;
  const colorBizInk = esRest ? C.coral : C.teal;

  function celebrarLogro() {
    setCelebrar(true);
    setTimeout(() => setCelebrar(false), 1000);
  }

  // ------------------------------------------------------------------ auth ---
  async function login() {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      await persistSession(data);
      setUser(data.user);
      setTab("resumen");
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

  // El negocio se elige una sola vez y ya no se mezcla con el otro tipo.
  async function elegirNegocio(tipo) {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/users/business-type", {
        method: "PATCH",
        body: JSON.stringify({ businessType: tipo }),
      });
      setUser(data.user);
      await storeSet("nf_user", JSON.stringify(data.user || null));
      setOk(`Listo: tu panel es de ${tipo === "GIMNASIO" ? "gimnasio" : "restaurante"}. Solo verás tus datos.`);
      celebrarLogro();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------ datos --
  async function load() {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const base = [`/api/clients`, `/api/posts?authorId=${user.id}`];
      if (esRest) {
        const rest = await api(`/api/restaurants?ownerId=${user.id}`).catch(() => []);
        const mio = Array.isArray(rest) && rest.length ? rest[0] : null;
        setMyRest(mio);
        if (mio) {
          const [dis, ven] = await Promise.all([
            api(`/api/dishes?restaurantId=${mio.id}`).catch(() => []),
            api(`/api/meals?restaurantId=${mio.id}`).catch(() => []),
          ]);
          setDishes(Array.isArray(dis) ? dis : []);
          setVentas(Array.isArray(ven) ? ven : []);
        } else {
          setDishes([]);
          setVentas([]);
        }
      } else {
        const gym = await api(`/api/gyms?ownerId=${user.id}`).catch(() => []);
        const mio = Array.isArray(gym) && gym.length ? gym[0] : null;
        setMyGym(mio);
        if (mio) {
          const [prod, vis] = await Promise.all([
            api(`/api/products?gymId=${mio.id}`).catch(() => []),
            api(`/api/visits?gymId=${mio.id}`).catch(() => []),
          ]);
          setProducts(Array.isArray(prod) ? prod : []);
          setVisitas(Array.isArray(vis) ? vis : []);
        } else {
          setProducts([]);
          setVisitas([]);
        }
      }
      const [cl, po] = await Promise.all([
        api(base[0]).catch(() => []),
        api(base[1]).catch(() => []),
      ]);
      setClients(Array.isArray(cl) ? cl : []);
      setPosts(Array.isArray(po) ? po : []);
      setError("");
      setSyncAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }

  // Restaura la sesión guardada al abrir la app.
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
    if (user && biz) load();
  }, [user, biz]);

  // Sincronización silenciosa.
  useEffect(() => {
    if (!user || !biz) return;
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
  }, [user, biz]);

// CONTINUA-SERVICIO-PARTE-2

  // ------------------------------------------------------- acciones negocio --
  async function guardarNegocio() {
    if (!bName.trim() || !bAddress.trim() || !bService.trim()) {
      setError("Nombre, dirección y servicio son obligatorios.");
      return;
    }
    setLoading(true);
    setError("");
    setOk("");
    try {
      const body = {
        ownerId: user.id,
        name: bName.trim(),
        address: bAddress.trim(),
        service: bService.trim(),
        videoUrl: bVideo.trim() || null,
        openHour: bOpen === "" ? null : Number(bOpen),
        closeHour: bClose === "" ? null : Number(bClose),
      };
      if (esRest) {
        if (myRest) {
          await api(`/api/restaurants/${myRest.id}`, { method: "PATCH", body: JSON.stringify(body) });
        } else {
          await api("/api/restaurants", { method: "POST", body: JSON.stringify(body) });
        }
        setOk("Restaurante guardado. Tus clientes lo verán en su app.");
      } else {
        if (myGym) {
          await api(`/api/gyms/${myGym.id}`, { method: "PATCH", body: JSON.stringify(body) });
        } else {
          await api("/api/gyms", { method: "POST", body: JSON.stringify(body) });
        }
        setOk("Gimnasio guardado. Tus clientes lo verán en su app.");
      }
      celebrarLogro();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function addProducto() {
    if (!pName.trim() || !pBrand.trim()) { setError("Producto y marca son obligatorios."); return; }
    if (!myGym) { setError("Primero registra tu gimnasio."); return; }
    try {
      await api("/api/products", {
        method: "POST",
        body: JSON.stringify({ gymId: myGym.id, name: pName.trim(), brand: pBrand.trim() }),
      });
      setOk("Producto enviado: un nutricionista dará el aval.");
      setPName(""); setPBrand("");
      await load();
    } catch (e) { setError(e.message); }
  }

  async function addPlato() {
    if (!dName.trim()) { setError("El nombre del plato es obligatorio."); return; }
    if (!myRest) { setError("Primero registra tu restaurante."); return; }
    try {
      await api("/api/dishes", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: myRest.id,
          name: dName.trim(),
          calories: dCal === "" ? null : Number(dCal),
          proteinG: dProt === "" ? null : Number(dProt),
          price: dPrice === "" ? null : Number(dPrice),
          day: dDay === "" ? null : Number(dDay),
        }),
      });
      setOk("Plato añadido a tu menú.");
      setDName(""); setDCal(""); setDProt(""); setDPrice(""); setDDay("");
      celebrarLogro();
      await load();
    } catch (e) { setError(e.message); }
  }

  async function delPlato(id) {
    try {
      await api(`/api/dishes/${id}`, { method: "DELETE" });
      setOk("Plato eliminado.");
      await load();
    } catch (e) { setError(e.message); }
  }

  async function publicar() {
    if (!pTitulo.trim()) { setError("El título es obligatorio."); return; }
    try {
      await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ authorId: user.id, kind: pKind, title: pTitulo.trim(), description: pTexto.trim() || null }),
      });
      setOk("Publicado. Tus clientes y el admin lo ven.");
      setPTitulo(""); setPTexto("");
      celebrarLogro();
      await load();
    } catch (e) { setError(e.message); }
  }

  // ------------------------------------------------------------ render auth --
  if (!user) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.loginCard} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Nutri<Text style={{ color: BRAND }}>Flow</Text></Text>
          <Text style={[styles.appTag, { color: C.orangeVivid }]}>APP NEGOCIO</Text>
          <Text style={styles.lead}>Gimnasios y restaurantes saludables</Text>

          {mode === "login" && (
            <>
              <Text style={styles.title}>Entra a tu negocio</Text>
              <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Contraseña" value={pass} onChangeText={setPass} secureTextEntry />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              {ok !== "" && <Text style={styles.okMsg}>{ok}</Text>}
              <Pressable style={[styles.btn, { backgroundColor: C.orangeVivid }]} onPress={login} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Ingresando…" : "Ingresar"}</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setMode("forgot"); }}>
                <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
              <Text style={styles.hint}>
                Cada negocio entra con su usuario y ve únicamente su información.
              </Text>
            </>
          )}

          {mode === "forgot" && (
            <>
              <Text style={styles.title}>Recuperar contraseña</Text>
              <Text style={styles.muted}>Te generamos un código para restablecerla.</Text>
              <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              {ok !== "" && <Text style={styles.okMsg}>{ok}</Text>}
              <Pressable style={[styles.btn, { backgroundColor: C.orangeVivid }]} onPress={forgot} disabled={loading}>
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
              <Field label="Código de recuperación" value={resetToken} onChangeText={setResetToken} autoCapitalize="none" />
              <Field label="Nueva contraseña (mín. 8)" value={newPass} onChangeText={setNewPass} secureTextEntry />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              <Pressable style={[styles.btn, { backgroundColor: C.orangeVivid }]} onPress={resetPass} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Guardando…" : "Guardar"}</Text>
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

  // -------------------------------------------- selector de tipo de negocio --
  // Se elige una sola vez. A partir de ahí el panel muestra SOLO ese negocio.
  if (!biz) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.chooseCard}>
          <Text style={styles.brand}>Nutri<Text style={{ color: BRAND }}>Flow</Text></Text>
          <Text style={styles.title}>¿Qué tipo de negocio tienes?</Text>
          <Text style={styles.muted}>
            Hola {String(user.name || "").split(" ")[0]}. Elige tu rubro: tu panel se configurará solo para él
            y no verás nada de otros negocios.
          </Text>

          {error !== "" && <Text style={styles.err}>{error}</Text>}
          {ok !== "" && <Text style={styles.okMsg}>{ok}</Text>}
          {celebrar && <Confetti count={20} />}

          <Press
            style={[styles.choice, { borderColor: C.tealVivid, backgroundColor: C.tealSoft }]}
            onPress={() => elegirNegocio("GIMNASIO")}
          >
            <Text style={styles.choiceIcon}>🏋️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceT}>Gimnasio</Text>
              <Text style={styles.choiceS}>Ventas por asistencias, productos avalados y clientes que entrenan contigo.</Text>
            </View>
          </Press>

          <Press
            style={[styles.choice, { borderColor: C.coralVivid, backgroundColor: C.coralSoft }]}
            onPress={() => elegirNegocio("RESTAURANTE")}
          >
            <Text style={styles.choiceIcon}>🍽️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceT}>Restaurante</Text>
              <Text style={styles.choiceS}>Tu menú, platos, pedidos de tus clientes y estrategias de venta.</Text>
            </View>
          </Press>

          <Pressable style={[styles.btn, { backgroundColor: C.muted, marginTop: 18 }]} onPress={logout}>
            <Text style={styles.btnTxt}>Salir</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ------------------------------------------------------------- métricas ---
  const mesKey = (d) => String(d || "").slice(0, 7);
  const mesActual = new Date().toISOString().slice(0, 7);

  // Ventas por mes: asistencias (gimnasio) o pedidos (restaurante).
  const movimientos = esRest ? ventas : visitas;
  const meses = [...new Set(movimientos.map((m) => mesKey(m.createdAt || m.date || m.scheduledAt)))].sort();
  const porMes = {};
  movimientos.forEach((m) => {
    const k = mesKey(m.createdAt || m.date || m.scheduledAt);
    porMes[k] = (porMes[k] || 0) + 1;
  });
  const serieVentas = (meses.length ? meses : [mesActual]).slice(-7).map((k) => porMes[k] || 0);
  const delMes = movimientos.filter((m) => mesKey(m.createdAt || m.date || m.scheduledAt) === mesActual).length;

  // Plato más pedido (restaurante).
  const topPlato = (() => {
    const c = {};
    ventas.forEach((v) => { const n = String(v.name || "").split(" (")[0].trim(); if (n) c[n] = (c[n] || 0) + 1; });
    const arr = Object.entries(c).sort((a, b) => b[1] - a[1]);
    return arr.length ? arr[0] : null;
  })();

  const avalados = products.filter((p) => p.approved).length;
  const kcalVendidas = ventas.reduce((a, v) => a + (Number(v.calories) || 0), 0);

  // Logros del negocio (hitos simples y visibles).
  const logros = esGym
    ? [
        { t: "Primer cliente", ok: clients.length >= 1, icon: <IconRun size={20} color={colorBizInk} /> },
        { t: "10 clientes", ok: clients.length >= 10, icon: <IconRun size={20} color={colorBizInk} /> },
        { t: "50 asistencias", ok: visitas.length >= 50, icon: <IconFlame size={20} color={C.coralVivid} /> },
        { t: "Producto avalado", ok: avalados >= 1, icon: <IconCheck size={20} color={C.coralVivid} /> },
      ]
    : [
        { t: "Primer cliente", ok: clients.length >= 1, icon: <IconRun size={20} color={colorBizInk} /> },
        { t: "5 platos en el menú", ok: dishes.length >= 5, icon: <IconLeaf size={20} color={C.amberVivid} /> },
        { t: "25 pedidos", ok: ventas.length >= 25, icon: <IconLeaf size={20} color={C.amberVivid} /> },
        { t: "Primera publicación", ok: posts.length >= 1, icon: <IconBell size={20} color={C.amberVivid} /> },
      ];
  const logrosOk = logros.filter((l) => l.ok).length;

  // --------------------------------------------------------- render header ---
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: colorBiz }]}>
            <Text style={styles.avatarTxt}>{String(user.name || "N").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello} numberOfLines={1}>{esRest ? (myRest?.name || "Mi restaurante") : (myGym?.name || "Mi gimnasio")}</Text>
            <View style={styles.subRow}>
              <Pill color={colorBizInk} soft={colorBizSoft}>{esRest ? "RESTAURANTE" : "GIMNASIO"}</Pill>
              <Pill color={C.brand} soft={C.brandSoft}>{logrosOk}/{logros.length} logros</Pill>
              <Text style={styles.sub}>{syncAt ? timeAgo(syncAt, now) : "sincronizando…"}</Text>
            </View>
          </View>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutTxt}>Salir</Text>
          </Pressable>
        </View>

        <View style={styles.kpiRow}>
          <KpiCard index={0} icon={<IconRun size={17} color={colorBiz} />} value={clients.length} label="Mis clientes" color={colorBiz} />
          <KpiCard
            index={1}
            icon={esRest ? <IconLeaf size={17} color={C.brandVivid} /> : <IconFlame size={17} color={C.brandVivid} />}
            value={delMes}
            label={esRest ? "Pedidos del mes" : "Asistencias del mes"}
            color={C.brandVivid}
          />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard
            index={2}
            icon={esRest ? <IconLeaf size={17} color={C.amberVivid} /> : <IconDumbbell size={17} color={C.amberVivid} />}
            value={esRest ? dishes.length : products.length}
            label={esRest ? "Platos en menú" : "Mis productos"}
            color={C.amberVivid}
          />
          <KpiCard
            index={3}
            icon={esRest ? <IconFlame size={17} color={C.coralVivid} /> : <IconCheck size={17} color={C.coralVivid} />}
            value={esRest ? kcalVendidas : avalados}
            label={esRest ? "Kcal vendidas" : "Productos avalados"}
            color={C.coralVivid}
            format={(n) => (esRest ? `${Math.round(n / 1000)}k` : String(Math.round(n)))}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {TABS.map(([t, label]) => (
            <Press
              key={t}
              style={[styles.tab, tab === t && { backgroundColor: colorBiz }]}
              scale={0.94}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>{label}</Text>
            </Press>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colorBiz} />}
      >
        {error !== "" && <Text style={styles.err}>{error}</Text>}
        {ok !== "" && <Text style={styles.okMsg}>{ok}</Text>}
        {celebrar && <Confetti count={18} />}

        {/* --------------------------------------------------------- Resumen */}
        {tab === "resumen" && (
          <View>
            <FadeUp index={0} style={[styles.card, { borderColor: colorBiz + "55" }]}>
              <Text style={styles.cardT}>Tus logros</Text>
              <Text style={styles.rowS}>{logrosOk} de {logros.length} desbloqueados. Sigue así.</Text>
              <View style={styles.logroGrid}>
                {logros.map((l) => (
                  <View key={l.t} style={[styles.logro, l.ok ? { backgroundColor: colorBizSoft, borderColor: colorBiz } : null]}>
                    <Text style={{ fontSize: 20 }}>{l.icon}</Text>
                    <Text style={[styles.logroT, l.ok && { color: colorBizInk }]} numberOfLines={2}>{l.t}</Text>
                    <Text style={styles.logroS}>{l.ok ? "Logrado" : "Bloqueado"}</Text>
                  </View>
                ))}
              </View>
            </FadeUp>

            <SectionHead title="Accesos rápidos" />
            <View style={styles.quickRow}>
              <Press style={[styles.quick, { borderColor: colorBiz }]} onPress={() => setTab("negocio")}>
                {esRest ? <IconLeaf size={22} color={colorBizInk} /> : <IconDumbbell size={22} color={colorBizInk} />}
                <Text style={styles.quickT}>{esRest ? "Mi restaurante" : "Mi gimnasio"}</Text>
              </Press>
              <Press style={[styles.quick, { borderColor: colorBiz }]} onPress={() => setTab(esRest ? "menu" : "productos")}>
                {esRest ? <IconLeaf size={22} color={colorBizInk} /> : <IconDumbbell size={22} color={colorBizInk} />}
                <Text style={styles.quickT}>{esRest ? "Mi menú" : "Productos"}</Text>
              </Press>
              <Press style={[styles.quick, { borderColor: colorBiz }]} onPress={() => setTab("ventas")}>
                <IconFlame size={22} color={colorBizInk} />
                <Text style={styles.quickT}>Ventas</Text>
              </Press>
              <Press style={[styles.quick, { borderColor: colorBiz }]} onPress={() => setTab("contenido")}>
                <IconBell size={22} color={colorBizInk} />
                <Text style={styles.quickT}>Contenido</Text>
              </Press>
            </View>

            {esGym && !myGym && (
              <EmptyState
                icon={<IconDumbbell size={30} color={colorBizInk} />}
                title="Registra tu gimnasio"
                text="Carga nombre, dirección, horario y servicio. Tus clientes te verán en su app."
                cta="Registrar gimnasio"
                onPress={() => setTab("negocio")}
                tint={colorBizInk}
              />
            )}
            {esRest && !myRest && (
              <EmptyState
                icon={<IconLeaf size={30} color={colorBizInk} />}
                title="Registra tu restaurante"
                text="Carga tu carta y horarios. Tus clientes pedirán desde su app."
                cta="Registrar restaurante"
                onPress={() => setTab("negocio")}
                tint={colorBizInk}
              />
            )}
          </View>
        )}

        {/* ---------------------------------------------------------- Ventas */}
        {tab === "ventas" && (
          <View>
            <SectionHead title={esRest ? "Pedidos" : "Asistencias"} right={<Pill color={C.muted} soft={C.surface2}>últimos 7 meses</Pill>} />
            <FadeUp index={0} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardT}>{esRest ? "Pedidos por mes" : "Asistencias por mes"}</Text>
                <Pill color={C.brand} soft={C.brandSoft}>{delMes} este mes</Pill>
              </View>
              <Sparkbars data={serieVentas} height={44} color={colorBiz} highlight={serieVentas.length - 1} />
              <View style={styles.weekLabels}>
                {(meses.length ? meses : [mesActual]).slice(-7).map((k) => (
                  <Text key={k} style={styles.weekL}>{k.slice(5)}</Text>
                ))}
              </View>
              {esRest && topPlato ? (
                <View style={styles.topBox}>
                  <Text style={styles.topT}>Plato más pedido</Text>
                  <Text style={styles.topV}>{topPlato[0]} · {topPlato[1]} pedidos</Text>
                </View>
              ) : null}
            </FadeUp>

            <SectionHead title={esRest ? "Últimos pedidos" : "Últimas asistencias"} count={movimientos.length} />
            {movimientos.length === 0 && (
              <EmptyState
                icon={esRest ? <IconLeaf size={30} color={C.brand} /> : <IconFlame size={30} color={C.brand} />}
                title={esRest ? "Sin pedidos todavía" : "Sin asistencias todavía"}
                text={esRest ? "Cuando tus clientes registren un plato tuyo, aparecerá aquí." : "Cuando tus clientes hagan check-in en tu gimnasio, aparecerá aquí."}
              />
            )}
            {movimientos.slice(0, 20).map((m, i) => (
              <FadeUp key={m.id} index={i} delay={i * 35}>
                <View style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: colorBizSoft }]}>
                    {esRest ? <IconLeaf size={14} color={colorBizInk} /> : <IconFlame size={14} color={colorBizInk} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowT} numberOfLines={1}>{esRest ? (m.name || m.type) : (m.user?.name || "Cliente")}</Text>
                    <Text style={styles.rowS}>
                      {esRest ? `${m.calories ?? 0} kcal · ${m.source === "RESTAURANTE" ? "pedido" : "registro"}` : `check-in ${m.hour ?? "?"}:00`}
                    </Text>
                  </View>
                  <Text style={styles.rowDate}>{String(m.createdAt || m.date || "").slice(0, 10)}</Text>
                </View>
              </FadeUp>
            ))}
          </View>
        )}

        {/* -------------------------------------------------------- Clientes */}
        {tab === "clientes" && (
          <View>
            <SectionHead title="Mis clientes" count={clients.length} />
            {clients.length === 0 && (
              <EmptyState
                icon={<IconRun size={30} color={colorBizInk} />}
                title="Sin clientes todavía"
                text={esRest
                  ? "Cuando un usuario pida un plato de tu restaurante, se volverá tu cliente."
                  : "Cuando un usuario haga check-in en tu gimnasio, se volverá tu cliente."}
                tint={colorBizInk}
              />
            )}
            {clients.map((c, i) => (
              <FadeUp key={c.id} index={i}>
                <View style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: colorBizSoft }]}>
                    <Text style={[styles.rowIconTxt, { color: colorBizInk }]}>{String(c.name || "?").slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowT} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.rowS}>{c.email}</Text>
                  </View>
                  {c.membership === "PREMIUM" ? <Pill color={C.amber} soft={C.amberSoft}>PREMIUM</Pill> : null}
                </View>
              </FadeUp>
            ))}
          </View>
        )}

        {/* --------------------------------------------------------- Negocio */}
        {tab === "negocio" && (
          <View>
            <SectionHead title={esRest ? "Mi restaurante" : "Mi gimnasio"} />
            <FadeUp index={0} style={styles.card}>
              <Text style={styles.cardT}>{esRest ? "Datos de tu restaurante" : "Datos de tu gimnasio"}</Text>
              <Text style={styles.rowS}>Esto es lo que verán tus clientes en su app.</Text>
              <Field label="Nombre" value={bName} onChangeText={setBName} placeholder={esRest ? "Sabor Verde" : "Gimnasio Olimpo"} />
              <Field label="Dirección" value={bAddress} onChangeText={setBAddress} placeholder="Av. Principal 123, Miraflores" />
              <Field label="Servicio que ofreces" value={bService} onChangeText={setBService} placeholder={esRest ? "Bowls y ensaladas" : "Musculación y funcional"} />
              <Field label="URL del video (opcional)" value={bVideo} onChangeText={setBVideo} autoCapitalize="none" placeholder="https://…" />
              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}>
                  <Field label="Abre (0-23)" value={bOpen} onChangeText={setBOpen} keyboardType="numeric" placeholder="6" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Cierra (0-23)" value={bClose} onChangeText={setBClose} keyboardType="numeric" placeholder="22" />
                </View>
              </View>
              <Press style={[styles.btn, { backgroundColor: colorBiz }]} onPress={guardarNegocio}>
                <Text style={styles.btnTxt}>{esRest ? (myRest ? "Guardar cambios" : "Registrar restaurante") : (myGym ? "Guardar cambios" : "Registrar gimnasio")}</Text>
              </Press>
            </FadeUp>

            {esGym && myGym ? (
              <FadeUp index={1} style={styles.card}>
                <Text style={styles.cardT}>Resumen de tu gimnasio</Text>
                <Text style={styles.rowS}>{myGym.address}</Text>
                <Text style={styles.rowS}>{myGym.service}</Text>
                <Text style={styles.rowS}>Horario {myGym.openHour ?? "?"}:00 – {myGym.closeHour ?? "?"}:00</Text>
                <Press style={[styles.btnGhost, { borderColor: colorBiz }]} onPress={() => { setBName(myGym.name || ""); setBAddress(myGym.address || ""); setBService(myGym.service || ""); setBVideo(myGym.videoUrl || ""); setBOpen(myGym.openHour == null ? "" : String(myGym.openHour)); setBClose(myGym.closeHour == null ? "" : String(myGym.closeHour)); }}>
                  <Text style={[styles.btnGhostTxt, { color: colorBizInk }]}>Editar datos</Text>
                </Press>
              </FadeUp>
            ) : null}

            {esRest && myRest ? (
              <FadeUp index={1} style={styles.card}>
                <Text style={styles.cardT}>Resumen de tu restaurante</Text>
                <Text style={styles.rowS}>{myRest.address}</Text>
                <Text style={styles.rowS}>{myRest.service}</Text>
                <Text style={styles.rowS}>Horario {myRest.openHour ?? "?"}:00 – {myRest.closeHour ?? "?"}:00</Text>
                <Press style={[styles.btnGhost, { borderColor: colorBiz }]} onPress={() => { setBName(myRest.name || ""); setBAddress(myRest.address || ""); setBService(myRest.service || ""); setBVideo(myRest.videoUrl || ""); setBOpen(myRest.openHour == null ? "" : String(myRest.openHour)); setBClose(myRest.closeHour == null ? "" : String(myRest.closeHour)); }}>
                  <Text style={[styles.btnGhostTxt, { color: colorBizInk }]}>Editar datos</Text>
                </Press>
              </FadeUp>
            ) : null}
          </View>
        )}

        {/* -------------------------------------- Productos (gimnasio) / Menú */}
        {tab === "productos" && (
          <View>
            <SectionHead title="Mis productos" count={products.length} />
            {!myGym && (
              <EmptyState
                icon={<IconDumbbell size={30} color={colorBizInk} />}
                title="Primero registra tu gimnasio"
                text="Los productos se cuelgan de tu gimnasio y necesitan el aval de un nutricionista."
                cta="Registrar gimnasio"
                onPress={() => setTab("negocio")}
                tint={colorBizInk}
              />
            )}
            {myGym ? (
              <>
                <FadeUp index={0} style={styles.card}>
                  <Text style={styles.cardT}>Nuevo producto</Text>
                  <Field label="Producto" value={pName} onChangeText={setPName} placeholder="Proteína Whey" />
                  <Field label="Marca" value={pBrand} onChangeText={setPBrand} placeholder="Optimum" />
                  <Press style={[styles.btn, { backgroundColor: colorBiz }]} onPress={addProducto}>
                    <Text style={styles.btnTxt}>Enviar para aval</Text>
                  </Press>
                </FadeUp>
                {products.length === 0 && <Text style={styles.muted}>Aún no cargaste productos.</Text>}
                {products.map((p, i) => (
                  <FadeUp key={p.id} index={i + 1}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowT}>{p.name}</Text>
                        <Text style={styles.rowS}>{p.brand}</Text>
                      </View>
                      <Pill color={p.approved ? C.brand : C.amber} soft={p.approved ? C.brandSoft : C.amberSoft}>
                        {p.approved ? "Avalado" : "Pendiente"}
                      </Pill>
                    </View>
                  </FadeUp>
                ))}
              </>
            ) : null}
          </View>
        )}

        {tab === "menu" && (
          <View>
            <SectionHead title="Mi menú" count={dishes.length} />
            {!myRest && (
              <EmptyState
                icon={<IconLeaf size={30} color={colorBizInk} />}
                title="Primero registra tu restaurante"
                text="Los platos se cuelgan de tu restaurante y es lo que verán tus clientes."
                cta="Registrar restaurante"
                onPress={() => setTab("negocio")}
                tint={colorBizInk}
              />
            )}
            {myRest ? (
              <>
                <FadeUp index={0} style={styles.card}>
                  <Text style={styles.cardT}>Nuevo plato</Text>
                  <Field label="Nombre del plato" value={dName} onChangeText={setDName} placeholder="Bowl proteico" />
                  <View style={styles.twoCols}>
                    <View style={{ flex: 1 }}><Field label="Kcal" value={dCal} onChangeText={setDCal} keyboardType="numeric" placeholder="480" /></View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}><Field label="Proteína (g)" value={dProt} onChangeText={setDProt} keyboardType="numeric" placeholder="30" /></View>
                  </View>
                  <View style={styles.twoCols}>
                    <View style={{ flex: 1 }}><Field label="Precio S/" value={dPrice} onChangeText={setDPrice} keyboardType="numeric" placeholder="18" /></View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}><Field label="Día (1-7)" value={dDay} onChangeText={setDDay} keyboardType="numeric" placeholder="1" /></View>
                  </View>
                  <Press style={[styles.btn, { backgroundColor: colorBiz }]} onPress={addPlato}>
                    <Text style={styles.btnTxt}>Añadir al menú</Text>
                  </Press>
                </FadeUp>
                {dishes.length === 0 && <Text style={styles.muted}>Tu menú está vacío.</Text>}
                {dishes.map((d, i) => (
                  <FadeUp key={d.id} index={i + 1}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowT}>{d.name}</Text>
                        <Text style={styles.rowS}>{d.calories ?? 0} kcal · {d.proteinG ?? 0}g prot · S/ {Number(d.price || 0).toFixed(2)}</Text>
                      </View>
                      <Pressable style={styles.del} onPress={() => delPlato(d.id)}>
                        <Text style={styles.delTxt}>Quitar</Text>
                      </Pressable>
                    </View>
                  </FadeUp>
                ))}
              </>
            ) : null}
          </View>
        )}

        {/* ------------------------------------------------------- Contenido */}
        {tab === "contenido" && (
          <View>
            <SectionHead title="Mi contenido" count={posts.length} />
            <Text style={styles.rowS}>Publica tus estrategias de venta, tips y promos. Lo ven tus clientes y el admin.</Text>
            <FadeUp index={0} style={styles.card}>
              <Text style={styles.cardT}>Nueva publicación</Text>
              <View style={styles.chips}>
                {["TIP", "REEL", "VIDEO", "FOTO", "PROMO"].map((k) => (
                  <Pressable key={k} style={[styles.chip, pKind === k && { backgroundColor: colorBiz, borderColor: colorBiz }]} onPress={() => setPKind(k)}>
                    <Text style={[styles.chipTxt, pKind === k && styles.chipTxtOn]}>{k}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Título" value={pTitulo} onChangeText={setPTitulo} placeholder="2x1 en bowls los martes" />
              <Field label="Detalle (opcional)" value={pTexto} onChangeText={setPTexto} placeholder="Describe tu promoción o estrategia…" />
              <Press style={[styles.btn, { backgroundColor: colorBiz }]} onPress={publicar}>
                <Text style={styles.btnTxt}>Publicar</Text>
              </Press>
            </FadeUp>
            {posts.length === 0 && <Text style={styles.muted}>Sin publicaciones todavía.</Text>}
            {posts.map((p, i) => (
              <FadeUp key={p.id} index={i + 1}>
                <View style={styles.card}>
                  <View style={styles.cardHead}>
                    <Pill color={colorBizInk} soft={colorBizSoft}>{p.kind}</Pill>
                    <Text style={styles.rowDate}>{String(p.createdAt || "").slice(0, 10)}</Text>
                  </View>
                  <Text style={styles.cardT}>{p.title}</Text>
                  {p.description ? <Text style={styles.rowS}>{p.description}</Text> : null}
                </View>
              </FadeUp>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fbfaf7" },
  brand: { fontSize: 30, fontWeight: "900", color: "#12211a" },
  appTag: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginTop: 4 },
  lead: { fontSize: 13, color: "#5f7167", marginTop: 2 },
  loginCard: { flexGrow: 1, justifyContent: "center", padding: 24 },
  chooseCard: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "800", color: "#12211a", marginTop: 10, marginBottom: 14 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "700", color: "#45564c", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#dbe1d8", borderRadius: 12, padding: 12, fontSize: 15, color: "#12211a" },
  btn: { borderRadius: 999, padding: 15, alignItems: "center", marginTop: 6 },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  btnGhost: { borderWidth: 1.5, borderRadius: 999, padding: 12, alignItems: "center", marginTop: 10 },
  btnGhostTxt: { fontWeight: "800", fontSize: 13 },
  err: { color: "#e11d48", fontWeight: "700", marginBottom: 8 },
  okMsg: { color: "#15803d", fontWeight: "700", marginBottom: 8 },
  muted: { color: "#5f7167", fontSize: 13 },
  hint: { color: "#5f7167", fontSize: 12, marginTop: 14, textAlign: "center" },
  linkBtn: { marginTop: 10 },
  link: { color: "#15803d", fontWeight: "800", textAlign: "center" },

  // Selector de negocio
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 2,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  choiceIcon: { fontSize: 34 },
  choiceT: { fontSize: 19, fontWeight: "900", color: "#12211a" },
  choiceS: { fontSize: 12.5, color: "#45564c", marginTop: 4, lineHeight: 19 },

  // Cabecera
  header: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#dbe1d8" },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarTxt: { color: "#04150a", fontWeight: "900", fontSize: 18 },
  hello: { fontSize: 18, fontWeight: "900", color: "#12211a" },
  sub: { fontSize: 12, color: "#5f7167", marginTop: 2 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" },
  logoutBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#dbe1d8", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 10 },
  logoutTxt: { color: "#45564c", fontWeight: "800", fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  tabs: { marginTop: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f1f5e9", marginRight: 8 },
  tabTxt: { fontWeight: "700", color: "#45564c" },
  tabTxtOn: { color: "#fff" },

  // Cuerpo
  body: { flex: 1, padding: 16 },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe1d8", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardT: { fontSize: 15, fontWeight: "900", color: "#12211a" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe1d8", borderRadius: 14, padding: 12, marginBottom: 8 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginRight: 10 },
  rowIconTxt: { fontWeight: "900", fontSize: 14 },
  rowT: { fontSize: 14, fontWeight: "800", color: "#12211a" },
  rowS: { fontSize: 12, color: "#5f7167", marginTop: 2 },
  rowDate: { fontSize: 11, color: "#5f7167", fontWeight: "700" },

  // Logros y accesos
  logroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  logro: { width: "47%", flexGrow: 1, borderWidth: 1, borderColor: "#dbe1d8", borderRadius: 14, padding: 12, alignItems: "center", backgroundColor: "#fbfaf7" },
  logroT: { fontSize: 12, fontWeight: "800", color: "#12211a", textAlign: "center", marginTop: 6 },
  logroS: { fontSize: 10, color: "#5f7167", fontWeight: "700", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.6 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quick: { width: "47%", flexGrow: 1, borderWidth: 1.5, borderRadius: 18, padding: 14, alignItems: "center", backgroundColor: "#fff", marginBottom: 4 },
  quickT: { fontSize: 12, fontWeight: "800", color: "#12211a", marginTop: 6 },

  // Ventas
  weekLabels: { flexDirection: "row", gap: 4, marginTop: 6 },
  weekL: { flex: 1, textAlign: "center", fontSize: 10, color: "#5f7167", fontWeight: "700" },
  topBox: { marginTop: 12, backgroundColor: "#f1f5e9", borderRadius: 14, padding: 12 },
  topT: { fontSize: 10, fontWeight: "800", color: "#5f7167", textTransform: "uppercase", letterSpacing: 0.6 },
  topV: { fontSize: 15, fontWeight: "900", color: "#12211a", marginTop: 3 },

  // Formularios
  twoCols: { flexDirection: "row", alignItems: "flex-start" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: "#f1f5e9", borderWidth: 1.5, borderColor: "#dbe1d8" },
  chipTxt: { fontSize: 12, fontWeight: "800", color: "#45564c" },
  chipTxtOn: { color: "#fff" },
  del: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: "#ffe4e6" },
  delTxt: { color: "#9f1239", fontWeight: "800", fontSize: 12 },
});
