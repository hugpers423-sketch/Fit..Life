// App Vendedor — NutriFlow. Gestiona clientes y registra gimnasios/restaurantes.
// Todo se guarda en la API central: el Admin General lo ve al instante.
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("vendedor@nutriflow.com");
  const [pass, setPass] = useState("123456");
  const [mode, setMode] = useState("login"); // login | forgot | reset
  const [newPass, setNewPass] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [tab, setTab] = useState("clientes");
  const [clients, setClients] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [gName, setGName] = useState("");
  const [gAddress, setGAddress] = useState("");
  const [gService, setGService] = useState("");
  const [gVideo, setGVideo] = useState("");
  const [gOpen, setGOpen] = useState("");
  const [gClose, setGClose] = useState("");
  const [rests, setRests] = useState([]);
  const [rName, setRName] = useState("");
  const [rAddress, setRAddress] = useState("");
  const [rService, setRService] = useState("");
  const [rVideo, setRVideo] = useState("");
  const [rOpen, setROpen] = useState("");
  const [rClose, setRClose] = useState("");
  const [dishes, setDishes] = useState([]);
  const [dRest, setDRest] = useState("");
  const [dName, setDName] = useState("");
  const [dPrice, setDPrice] = useState("");
  const [dKcal, setDKcal] = useState("");
  const [dProt, setDProt] = useState("");
  const [dDay, setDDay] = useState("");
  const [dSpecial, setDSpecial] = useState(false);
  const [posts, setPosts] = useState([]);
  const [lives, setLives] = useState([]);
  const [products, setProducts] = useState([]);
  const [pTitle, setPTitle] = useState("");
  const [pKind, setPKind] = useState("REEL");
  const [pMedia, setPMedia] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [lTopic, setLTopic] = useState("");
  const [prGym, setPrGym] = useState("");
  const [prName, setPrName] = useState("");
  const [prBrand, setPrBrand] = useState("");

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
      const [u, g, r, p, s, pr] = await Promise.all([
        api(`/api/clients`),
        api(`/api/gyms?ownerId=${id}`),
        api(`/api/restaurants?ownerId=${id}`),
        api(`/api/posts?authorId=${id}`),
        api(`/api/sessions?professionalId=${id}`),
        api(`/api/products`),
      ]);
      setClients(u.filter((x) => x.role === "USUARIO"));
      setGyms(g);
      setRests(r);
      try {
        const all = await Promise.all(r.map((x) => api(`/api/dishes?restaurantId=${x.id}`)));
        setDishes(all.flat());
      } catch {
        setDishes([]);
      }
      setPosts(p);
      setLives(s.filter((x) => x.type === "LIVE"));
      setProducts(pr.filter((x) => g.some((gym) => gym.id === x.gymId)));
      setError("");
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

  async function addGym() {
    if (!gName.trim() || !gAddress.trim() || !gService.trim()) {
      setError("Nombre, dirección y servicio son obligatorios.");
      return;
    }
    try {
      await api("/api/gyms", {
        method: "POST",
        body: JSON.stringify({
          ownerId: user.id,
          name: gName.trim(),
          address: gAddress.trim(),
          service: gService.trim(),
          videoUrl: gVideo.trim() || null,
          openHour: gOpen === "" ? null : Number(gOpen),
          closeHour: gClose === "" ? null : Number(gClose),
        }),
      });
      setOk(`Gimnasio registrado: ${gName.trim()}`);
      setGName("");
      setGAddress("");
      setGService("");
      setGVideo("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addRestaurant() {
    if (!rName.trim() || !rAddress.trim() || !rService.trim()) {
      setError("Nombre, dirección y servicio son obligatorios.");
      return;
    }
    try {
      await api("/api/restaurants", {
        method: "POST",
        body: JSON.stringify({
          ownerId: user.id,
          name: rName.trim(),
          address: rAddress.trim(),
          service: rService.trim(),
          videoUrl: rVideo.trim() || null,
          openHour: rOpen === "" ? null : Number(rOpen),
          closeHour: rClose === "" ? null : Number(rClose),
        }),
      });
      setOk(`Restaurante registrado: ${rName.trim()}`);
      setRName("");
      setRAddress("");
      setRService("");
      setRVideo("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function publish() {
    if (!pTitle.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    try {
      await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ authorId: user.id, kind: pKind, title: pTitle.trim(), mediaUrl: pMedia.trim() || null }),
      });
      setOk(`${pKind === "REEL" ? "Reel" : pKind === "SERVICIO" ? "Servicio" : "Publicación"} publicada.`);
      setPTitle("");
      setPMedia("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function goLive() {
    if (!lTopic.trim()) {
      setError("El tema del live es obligatorio.");
      return;
    }
    try {
      const s = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ professionalId: user.id, type: "LIVE", topic: lTopic.trim() }),
      });
      setOk(`Live creado. Enlace: ${s.meetUrl}`);
      setLTopic("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addProduct() {
    if (!prName.trim() || !prBrand.trim()) {
      setError("Producto y marca son obligatorios (marcas reconocidas).");
      return;
    }
    if (!prGym) {
      setError("Elige el gimnasio del producto.");
      return;
    }
    try {
      await api("/api/products", {
        method: "POST",
        body: JSON.stringify({ gymId: prGym, name: prName.trim(), brand: prBrand.trim() }),
      });
      setOk(`Producto registrado: ${prName.trim()} (${prBrand.trim()}). Pendiente de aval nutricional.`);
      setPrName("");
      setPrBrand("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addDish() {
    if (!dRest || !dName.trim()) {
      setError("Elige el restaurante y el nombre del plato.");
      return;
    }
    try {
      await api("/api/dishes", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: dRest,
          name: dName.trim(),
          price: dPrice === "" ? null : Number(dPrice),
          calories: dKcal === "" ? null : Number(dKcal),
          proteinG: dProt === "" ? null : Number(dProt),
          day: dDay === "" ? null : Number(dDay),
          special: dSpecial,
        }),
      });
      setOk(`Plato registrado: ${dName.trim()}`);
      setDName("");
      setDPrice("");
      setDKcal("");
      setDProt("");
      setDDay("");
      setDSpecial(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function delDish(id) {
    try {
      await api(`/api/dishes/${id}`, { method: "DELETE" });
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
          <Text style={[styles.appTag, { color: ORANGE }]}>APP SERVICIO</Text>

          {mode === "login" && (
            <>
              <Text style={styles.title}>Gestiona tus clientes</Text>
              <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Contraseña" value={pass} onChangeText={setPass} secureTextEntry />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              {ok !== "" && <Text style={styles.ok}>{ok}</Text>}
              <Pressable style={[styles.btn, { backgroundColor: ORANGE }]} onPress={login} disabled={loading}>
                <Text style={styles.btnTxt}>{loading ? "Ingresando…" : "Ingresar"}</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => { setError(""); setOk(""); setMode("forgot"); }}>
                <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
              <Text style={styles.hint}>Tus clientes y gimnasios se sincronizan con el Admin General.</Text>
            </>
          )}

          {mode === "forgot" && (
            <>
              <Text style={styles.title}>Recuperar contraseña</Text>
              <Text style={styles.muted}>Te generamos un código para restablecerla. Escríbelo y define tu nueva clave.</Text>
              <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              {error !== "" && <Text style={styles.err}>{error}</Text>}
              {ok !== "" && <Text style={styles.ok}>{ok}</Text>}
              <Pressable style={[styles.btn, { backgroundColor: ORANGE }]} onPress={forgot} disabled={loading}>
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
              <Pressable style={[styles.btn, { backgroundColor: ORANGE }]} onPress={resetPass} disabled={loading}>
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

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hola, {user.name.split(" ")[0]}</Text>
            <Text style={styles.sub}>{clients.length} clientes · {gyms.length} gimnasios · {rests.length} restaurantes · sincronizado</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutTxt}>Salir</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {[["clientes", "Clientes"], ["gimnasios", "Gimnasios"], ["restaurantes", "Restaurantes"], ["contenido", "Contenido"], ["productos", "Productos"]].map(([t, label]) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => setTab(t)}>
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
        {tab === "clientes" && (
          <View>
            {clients.length === 0 && <Text style={styles.muted}>Sin clientes todavía.</Text>}
            {clients.map((c) => (
              <View key={c.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{c.name}</Text>
                  <Text style={styles.rowS}>{c.email}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {tab === "gimnasios" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardT}>Registrar gimnasio / restaurante</Text>
              <Field label="Nombre" value={gName} onChangeText={setGName} placeholder="Gimnasio Central" />
              <Field label="Dirección" value={gAddress} onChangeText={setGAddress} placeholder="Av. Principal 123" />
              <Field label="Servicio que ofrece" value={gService} onChangeText={setGService} placeholder="Musculación, funcional, comida saludable" />
              <Field label="URL del video (opcional)" value={gVideo} onChangeText={setGVideo} autoCapitalize="none" placeholder="https://…" />
              <Field label="Abre (hora 0-23)" value={gOpen} onChangeText={setGOpen} keyboardType="numeric" placeholder="6" />
              <Field label="Cierra (hora 0-23)" value={gClose} onChangeText={setGClose} keyboardType="numeric" placeholder="22" />
              <Pressable style={[styles.btn, { backgroundColor: ORANGE }]} onPress={addGym}>
                <Text style={styles.btnTxt}>Registrar</Text>
              </Pressable>
            </View>
            {gyms.map((g) => (
              <View key={g.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{g.name}</Text>
                  <Text style={styles.rowS}>{g.address} · {g.service}</Text>
                  {g.videoUrl ? <Text style={styles.rowS}>Video registrado ✓</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}
        {tab === "restaurantes" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardT}>Registrar restaurante saludable</Text>
              <Field label="Nombre" value={rName} onChangeText={setRName} placeholder="Sabor Verde" />
              <Field label="Dirección" value={rAddress} onChangeText={setRAddress} placeholder="Calle Salud 456" />
              <Field label="Servicio que ofrece" value={rService} onChangeText={setRService} placeholder="Bowls, ensaladas, jugos" />
              <Field label="URL del video (opcional)" value={rVideo} onChangeText={setRVideo} autoCapitalize="none" placeholder="https://…" />
              <Field label="Abre (hora 0-23)" value={rOpen} onChangeText={setROpen} keyboardType="numeric" placeholder="8" />
              <Field label="Cierra (hora 0-23)" value={rClose} onChangeText={setRClose} keyboardType="numeric" placeholder="22" />
              <Pressable style={[styles.btn, { backgroundColor: ORANGE }]} onPress={addRestaurant}>
                <Text style={styles.btnTxt}>Registrar</Text>
              </Pressable>
            </View>
            {rests.map((r) => (
              <View key={r.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{r.name}</Text>
                  <Text style={styles.rowS}>{r.address} · {r.service}</Text>
                  {r.videoUrl ? <Text style={styles.rowS}>Video registrado ✓</Text> : null}
                  <Text style={styles.rowS}>{dishes.filter((d) => d.restaurantId === r.id).length} platos en carta</Text>
                </View>
              </View>
            ))}
            <View style={styles.card}>
              <Text style={styles.cardT}>Platos de la carta (con valores nutricionales)</Text>
              <Text style={styles.label}>Restaurante</Text>
              <View style={styles.chips}>
                {rests.map((r) => (
                  <Pressable key={r.id} style={[styles.chip, dRest === r.id && styles.chipOn]} onPress={() => setDRest(r.id)}>
                    <Text style={[styles.chipTxt, dRest === r.id && styles.chipTxtOn]}>{r.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Plato" value={dName} onChangeText={setDName} placeholder="Bowl proteico" />
              <Field label="Precio S/" value={dPrice} onChangeText={setDPrice} keyboardType="numeric" placeholder="18" />
              <Field label="Calorías" value={dKcal} onChangeText={setDKcal} keyboardType="numeric" placeholder="450" />
              <Field label="Proteína (g)" value={dProt} onChangeText={setDProt} keyboardType="numeric" placeholder="25" />
              <Field label="Día menú semanal 1-7 (vacío = siempre)" value={dDay} onChangeText={setDDay} keyboardType="numeric" placeholder="" />
              <Pressable style={[styles.chip, dSpecial && styles.chipOn, { alignSelf: "flex-start", marginBottom: 12 }]} onPress={() => setDSpecial(!dSpecial)}>
                <Text style={[styles.chipTxt, dSpecial && styles.chipTxtOn]}>★ Plato especial</Text>
              </Pressable>
              <Pressable style={[styles.btn, { backgroundColor: ORANGE }]} onPress={addDish}>
                <Text style={styles.btnTxt}>Agregar plato</Text>
              </Pressable>
            </View>
            {dishes.map((d) => (
              <View key={d.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{d.special ? "★ " : ""}{d.name}</Text>
                  <Text style={styles.rowS}>{d.calories ?? 0} kcal · {d.proteinG ?? 0}g prot · {d.price != null ? `S/ ${d.price}` : "s/p"}{d.day ? ` · día ${d.day}` : ""}</Text>
                </View>
                <Pressable onPress={() => delDish(d.id)}>
                  <Text style={styles.del}>Borrar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {tab === "contenido" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardT}>Publicar reel / video / foto / servicio</Text>
              <View style={styles.chips}>
                {["REEL", "VIDEO", "FOTO", "SERVICIO"].map((k) => (
                  <Pressable key={k} style={[styles.chip, pKind === k && styles.chipOn]} onPress={() => setPKind(k)}>
                    <Text style={[styles.chipTxt, pKind === k && styles.chipTxtOn]}>{k === "SERVICIO" ? "Servicio*" : k}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Título" value={pTitle} onChangeText={setPTitle} placeholder="Tour por el gimnasio" />
              <Field label="URL foto/video (opcional)" value={pMedia} onChangeText={setPMedia} autoCapitalize="none" placeholder="https://…" />
              <Pressable style={[styles.btn, { backgroundColor: ORANGE }]} onPress={publish}>
                <Text style={styles.btnTxt}>Publicar</Text>
              </Pressable>
              <Text style={styles.rowS}>*Servicio = video detallado de lo que ofreces.</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardT}>Hacer live de mi negocio</Text>
              <Field label="Tema del live" value={lTopic} onChangeText={setLTopic} placeholder="Clase abierta en vivo" />
              <Pressable style={[styles.btn, { backgroundColor: BRAND }]} onPress={goLive}>
                <Text style={styles.btnTxt}>🔴 Crear live</Text>
              </Pressable>
            </View>
            {lives.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>🔴 {s.topic}</Text>
                  <Text style={styles.rowS}>{s.status}</Text>
                </View>
              </View>
            ))}
            {posts.map((p) => (
              <View key={p.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{p.kind} · {p.title}</Text>
                  <Text style={styles.rowS}>{p.mediaUrl ? "Con multimedia ✓" : "Sin multimedia"}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {tab === "productos" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardT}>Ofrecer producto (marcas reconocidas)</Text>
              <Text style={styles.rowS}>Requiere aval de un nutricionista para publicarse.</Text>
              <Text style={styles.label}>Gimnasio</Text>
              <View style={styles.chips}>
                {gyms.map((g) => (
                  <Pressable key={g.id} style={[styles.chip, prGym === g.id && styles.chipOn]} onPress={() => setPrGym(g.id)}>
                    <Text style={[styles.chipTxt, prGym === g.id && styles.chipTxtOn]}>{g.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Producto" value={prName} onChangeText={setPrName} placeholder="Proteína Whey" />
              <Field label="Marca reconocida" value={prBrand} onChangeText={setPrBrand} placeholder="Optimum, Dymatize…" />
              <Pressable style={[styles.btn, { backgroundColor: ORANGE }]} onPress={addProduct}>
                <Text style={styles.btnTxt}>Registrar (pendiente de aval)</Text>
              </Pressable>
            </View>
            {products.map((p) => (
              <View key={p.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowT}>{p.name}</Text>
                  <Text style={styles.rowS}>{p.brand} · {p.approved ? "✓ Avalado por nutricionista" : "⏳ Pendiente de aval"}</Text>
                </View>
              </View>
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
  hint: { color: "#5f7167", fontSize: 12, marginTop: 14, textAlign: "center" },
  muted: { color: "#5f7167", fontSize: 13 },
  linkBtn: { marginTop: 10 },
  link: { color: "#15803d", fontWeight: "800", textAlign: "center" },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  logoutBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#dbe1d8", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 10 },
  logoutTxt: { color: "#45564c", fontWeight: "800", fontSize: 12 },
  header: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#dbe1d8" },
  hello: { fontSize: 22, fontWeight: "900", color: "#12211a" },
  sub: { fontSize: 12, color: "#5f7167", marginTop: 2 },
  tabs: { flexDirection: "row", gap: 8, marginTop: 12 },  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f1f5e9" },
  tabOn: { backgroundColor: "#12211a" },
  tabTxt: { fontWeight: "700", color: "#45564c" },
  tabTxtOn: { color: "#fff" },
  body: { flex: 1, padding: 16 },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe1d8", borderRadius: 20, padding: 18, marginBottom: 14 },
  cardT: { fontSize: 16, fontWeight: "800", color: "#12211a", marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "#dbe1d8" },
  chipOn: { backgroundColor: "#dcfce7", borderColor: GREEN },
  chipTxt: { color: "#5f7167", fontSize: 12, fontWeight: "700" },
  chipTxtOn: { color: "#15803d" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe1d8", borderRadius: 14, padding: 12, marginBottom: 8 },
  rowT: { fontSize: 14, fontWeight: "800", color: "#12211a" },
  rowS: { fontSize: 12, color: "#5f7167", marginTop: 2 },
  del: { color: "#e11d48", fontWeight: "700" },
});
