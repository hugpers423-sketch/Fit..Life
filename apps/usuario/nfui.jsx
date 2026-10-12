// ============================================================================
//  NutriFlow · Sistema de diseño y movimiento para las apps móviles.
//  Portado de las maquetas (E:\backup\disenos-desktop):
//    0-design-system → tokens de color, radios y tipografía
//    6-motion-system → tabla de duraciones y curvas (+ reglas)
//    7-moments       → momentos: carga, vacío, logro, celebración
//    8-animation-icons → patrones de iconos animados
//
//  No agrega dependencias: solo React Native + Animated (sin SVG).
// ============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

// ---------------------------------------------------------------- Paleta ----
export const C = {
  bg: "#fbfaf7",
  surface: "#ffffff",
  surface2: "#f1f5e9",
  surface3: "#e8efe0",
  text: "#12211a",
  text2: "#45564c",
  muted: "#5f7167",
  border: "#dbe1d8",
  borderStrong: "#c2cdbe",
  brand: "#15803d",
  brandVivid: "#22c55e",
  brandInk: "#14532d",
  brandSoft: "#dcfce7",
  brandPale: "#f0fdf4",
  orange: "#c2410c",
  orangeVivid: "#f97316",
  orangeSoft: "#ffedd5",
  coral: "#e11d48",
  coralVivid: "#fb7185",
  coralSoft: "#ffe4e6",
  teal: "#0f766e",
  tealVivid: "#14b8a6",
  tealSoft: "#ccfbf1",
  amber: "#b45309",
  amberVivid: "#f59e0b",
  amberSoft: "#fef3c7",
  info: "#1d4ed8",
  infoVivid: "#3b82f6",
  infoSoft: "#dbeafe",
  cyan: "#0e7490",
  cyanVivid: "#06b6d4",
  ink: "#04150a",
};

// ------------------------------------------------------------------ Radios --
export const R = { s: 10, m: 14, l: 18, xl: 24, full: 999 };
export const S = { s: 4, m: 8, l: 14, xl: 22 };

// --------------------------------------------------------------- Movimiento -
// cubic-bezier(.16,1,.3,1)   → entradas y cambios de contexto
// cubic-bezier(.34,1.56,.64,1) → botones, modales, logros (rebote)
// cubic-bezier(.5,1.5,.4,1)  → progreso y anillos
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  bounce: Easing.bezier(0.34, 1.56, 0.64, 1),
  elastic: Easing.bezier(0.5, 1.5, 0.4, 1),
};

// Tabla oficial de 6-motion-system (sec. 4)
export const D = {
  micro: 180,      // respuesta al puntero
  btn: 280,        // botón principal / modal
  screen: 450,     // cambio de pantalla
  ring: 450,       // anillo de progreso
  celebrate: 900,  // logro
  idle: 2400,      // latido continuo
  count: 1400,     // contadores
  stagger: 55,     // desfase entre elementos de una lista
  dot: 22,         // desfase entre segmentos del dial
};

// Accesibilidad: si el sistema pide menos movimiento, quitamos las animaciones
// largas (equivalente al `prefers-reduced-motion` de las maquetas).
let REDUCE = false;
export function setReduceMotion(v) {
  REDUCE = !!v;
}
function d(ms) {
  return REDUCE ? 0.001 : ms;
}
function rd(ms) {
  return REDUCE ? 0.001 : Math.floor(Math.random() * ms);
}

/** Respeta el ajuste del sistema "reducir movimiento". Llamar una vez al iniciar. */
export function useReduceMotion() {
  useEffect(() => {
    let sub = null;
    try {
      // eslint-disable-next-line global-require
      const { AccessibilityInfo } = require("react-native");
      AccessibilityInfo.isReduceMotionEnabled().then((v) => setReduceMotion(!!v));
      sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => setReduceMotion(!!v));
    } catch (e) {}
    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, []);
}

// ------------------------------------------------------- Entrada escalonada -
/** Estilo de entrada (fade + subida). fiel a `crossIn` de 6-motion-system. */
export function useFadeUp(index = 0, delay) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, {
      toValue: 1,
      duration: d(D.screen),
      easing: EASE.out,
      delay: d(delay != null ? delay : index * D.stagger),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [v]);
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };
}

/** Envoltorio lista-para-usar: mete los hijos en una entrada escalonada. */
export function FadeUp({ index = 0, delay, children, style }) {
  const anim = useFadeUp(index, delay);
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

// ---------------------------------------------------------- Press escalable -
/** Botón con "presión": se encoge al tocarlo (fiel a `:active` de las maquetas). */
export function Press({ onPress, children, style, styleDown, scale = 0.98, disabled, accessibilityLabel, hitSlop }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (val) =>
    Animated.timing(s, { toValue: val, duration: d(D.micro), easing: EASE.out, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale: s }] }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        hitSlop={hitSlop}
        onPressIn={() => to(scale)}
        onPressOut={() => to(1)}
        style={({ pressed }) => [style, pressed && styleDown]}
      >
        {typeof children === "function" ? children({ pressed }) : children}
      </Pressable>
    </Animated.View>
  );
}

// ------------------------------------------------------------ ProgressBar ---
/** Barra que crece de 0 a su valor (fiel a `growW` / `.cal-fill`). */
export function ProgressBar({ value = 0, max = 100, height = 9, color, delay = 0, track, style }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, {
      toValue: pct,
      duration: d(D.ring),
      easing: EASE.elastic,
      delay: d(delay),
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [pct, v]);
  const w = v.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track || C.surface3, overflow: "hidden" }, style]}>
      <Animated.View style={{ height, width: w, borderRadius: height, backgroundColor: color || C.brandVivid }}>
        <View style={{ height: 2, borderTopLeftRadius: height, borderTopRightRadius: height, backgroundColor: "rgba(255,255,255,.35)" }} />
      </Animated.View>
    </View>
  );
}

// ------------------------------------------------------------------- Dial ---
/** Aro de segmentos que se encienden uno a uno (sustituye el anillo SVG). */
export function Dial({ value = 0, max = 100, size = 116, segments = 26, thickness = 7, color, track, label, sub, caption }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const activeCount = Math.round(pct * segments);
  const anims = useMemo(() => Array.from({ length: segments }, () => new Animated.Value(0)), [segments]);
  useEffect(() => {
    const a = Animated.parallel(
      anims.map((v, i) =>
        Animated.timing(v, {
          toValue: i < activeCount ? 1 : 0.25,
          duration: d(D.micro),
          easing: EASE.bounce,
          delay: d(i * D.dot),
          useNativeDriver: true,
        })
      ),
      { stopTogether: false }
    );
    a.start();
    return () => a.stop();
  }, [activeCount, anims]);
  const col = color || C.brandVivid;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size,
            height: size,
            alignItems: "center",
            opacity: a,
            transform: [{ rotate: `${(360 / segments) * i}deg` }],
          }}
        >
          <Animated.View
            style={{
              width: thickness,
              height: thickness,
              borderRadius: thickness,
              backgroundColor: i < activeCount ? col : track || C.surface3,
              transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.25] }) }],
            }}
          />
        </Animated.View>
      ))}
      <View style={{ alignItems: "center" }}>
        {label}
        {sub}
        {caption}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- CountUp ---
/** Número que sube hasta su valor. easing 1-(1-p)^3, como en 7-moments. */
export function CountUp({ to = 0, duration = D.count, format = (n) => String(Math.round(n)), style, suffix = "" }) {
  const v = useRef(new Animated.Value(0)).current;
  const [txt, setTxt] = useState(() => format(0));
  // El formato se guarda en un ref: si no, el efecto se quedaría con la
  // versión obsoleta del cierre y no reflejaría los datos nuevos.
  const fmt = useRef(format);
  fmt.current = format;
  useEffect(() => {
    const id = v.addListener(({ value }) => setTxt(fmt.current(value)));
    const a = Animated.timing(v, {
      toValue: to,
      duration: d(duration),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => {
      v.removeListener(id);
      a.stop();
    };
  }, [to, v]);
  return <Text style={style}>{`${txt}${suffix}`}</Text>;
}

// ---------------------------------------------------------------- Shimmer ---
/** Franja de carga que barre (fiel a `shimmerMove`). */
export function Shimmer({ width = "100%", height = 14, radius = 8, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: d(D.idle), easing: Easing.linear, useNativeDriver: true })
    );
    a.start();
    return () => a.stop();
  }, [v]);
  const x = v.interpolate({ inputRange: [0, 1], outputRange: [-70, 260] });
  return (
    <View style={[{ width, height, borderRadius: radius, backgroundColor: C.surface3, overflow: "hidden" }, style]}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 60,
          backgroundColor: "rgba(255,255,255,.8)",
          transform: [{ translateX: x }],
        }}
      />
    </View>
  );
}

/** Bloque de esqueleto para listas en carga. */
export function Skeleton({ rows = 4, gap = 10 }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={sk.row}>
          <Shimmer width={44} height={44} radius={22} />
          <View style={{ flex: 1, gap: 8 }}>
            <Shimmer width="70%" height={12} />
            <Shimmer width="45%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ------------------------------------------------------------ Confeti -------
/** Confeti de logro (fiel al `confetti` de 6-motion-system). */
export function Confetti({ count = 12, duration = D.celebrate, active = true, colors }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        o: new Animated.Value(0),
        r: new Animated.Value(0),
        dx: (Math.random() * 2 - 1) * 110,
        dy: 70 + Math.random() * 130,
        rot: (Math.random() * 2 - 1) * 260,
        del: rd(160),
        col: (colors || [C.brandVivid, C.amberVivid, C.coralVivid, C.tealVivid, C.infoVivid])[
          Math.floor(Math.random() * (colors || [C.brandVivid, C.amberVivid, C.coralVivid, C.tealVivid, C.infoVivid]).length)
        ],
      })),
    [count]
  );
  useEffect(() => {
    if (!active) return;
    const anims = parts.map((p) =>
      Animated.parallel([
        Animated.timing(p.x, { toValue: p.dx, duration: d(duration), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(p.y, { toValue: p.dy, duration: d(duration), easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(p.r, { toValue: p.rot, duration: d(duration), easing: EASE.out, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.o, { toValue: 1, duration: d(120), useNativeDriver: true }),
          Animated.delay(rd(320)),
          Animated.timing(p.o, { toValue: 0, duration: d(360), useNativeDriver: true }),
        ]),
      ])
    );
    const par = Animated.parallel(anims, { stopTogether: false });
    par.start();
    return () => par.stop();
  }, [active, parts, duration]);
  if (!active) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" }}>
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: 8,
            height: 12,
            borderRadius: 2,
            backgroundColor: p.col,
            opacity: p.o,
            transform: [{ translateX: p.x }, { translateY: p.y }, { rotate: p.r.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "1deg"] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ------------------------------------------------------------- Latido -------
/** Anillo que late (fiel a `haloPulse`/`blinkDot`). Ideal para "en vivo". */
export function Pulse({ size = 10, color }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: d(D.idle), easing: Easing.out(Easing.cubic), useNativeDriver: true })
    );
    a.start();
    return () => a.stop();
  }, [v]);
  const col = color || C.brandVivid;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: col,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: col }} />
    </View>
  );
}

// ------------------------------------------------------------- Elementos ----
/** Píldora corta en mayúsculas (fiel a `.pill`/`.tag`). */
export function Pill({ children, color, soft, style, textStyle }) {
  const col = color || C.brand;
  return (
    <View style={[pil.pill, { backgroundColor: soft || C.brandSoft, borderColor: col + "33" }, style]}>
      <Text style={[pil.txt, { color: col }, textStyle]}>{children}</Text>
    </View>
  );
}

/** Tarjeta de métrica con contador animado y barra superior. */
export function KpiCard({ icon, value = 0, max, unit = "", delta, label, index = 0, color, format, style }) {
  const col = color || C.brandVivid;
  return (
    <FadeUp index={index} style={[kpi.card, style]}>
      <View style={[kpi.top, { backgroundColor: col }]} />
      <View style={kpi.row}>
        <View style={[kpi.icon, { backgroundColor: col + "1a" }]}>
          <Text style={{ fontSize: 15 }}>{icon}</Text>
        </View>
        {delta != null && (
          <Pill color={Number(delta) >= 0 ? C.brand : C.coral} soft={Number(delta) >= 0 ? C.brandSoft : C.coralSoft}>
            {Number(delta) >= 0 ? "▲" : "▼"} {Math.abs(Number(delta))}%
          </Pill>
        )}
      </View>
      <View style={{ marginTop: 10 }}>
        <CountUp to={value} format={format || ((n) => String(Math.round(n)))} style={[kpi.val, { color: col }]} suffix={unit} />
        <Text style={kpi.label}>{label}</Text>
        {max != null && <ProgressBar value={value} max={max} height={6} color={col} delay={index * D.stagger} style={{ marginTop: 8 }} />}
      </View>
    </FadeUp>
  );
}

/** Título de sección con contador. */
export function SectionHead({ title, count, action, index = 0, right }) {
  return (
    <FadeUp index={index} delay={0} style={sec.row}>
      <Text style={sec.title}>{title}</Text>
      {count != null && <Pill style={sec.pill}>{count}</Pill>}
      <View style={{ flex: 1 }} />
      {right}
      {action}
    </FadeUp>
  );
}

/** Estado vacío accionable (mucho mejor que "Sin datos"). */
export function EmptyState({ icon = "🌱", title, text, cta, onPress, tint }) {
  const col = tint || C.brand;
  return (
    <FadeUp index={0} style={[emp.box, { borderColor: col + "55" }]}>
      <View style={[emp.badge, { backgroundColor: col + "14" }]}>
        <Text style={{ fontSize: 26 }}>{icon}</Text>
      </View>
      <Text style={emp.title}>{title}</Text>
      <Text style={emp.text}>{text}</Text>
      {cta && (
        <Press style={[emp.btn, { backgroundColor: col }]} onPress={onPress}>
          <Text style={emp.btnTxt}>{cta}</Text>
        </Press>
      )}
    </FadeUp>
  );
}

/** Fila de dato con barra (ideal para macros). */
export function StatRow({ label, value, max, unit = "", color, index = 0 }) {
  const col = color || C.brandVivid;
  return (
    <FadeUp index={index} style={st.row}>
      <View style={{ flex: 1 }}>
        <View style={st.head}>
          <Text style={st.label}>{label}</Text>
          <Text style={[st.value, { color: col }]}>
            {value}
            {unit} <Text style={{ color: C.muted, fontWeight: "600" }}>/ {max}{unit}</Text>
          </Text>
        </View>
        <ProgressBar value={value} max={max} height={7} color={col} delay={200 + index * 70} />
      </View>
    </FadeUp>
  );
}

/** Mini gráfico de barras (fiel a las sparklines de las maquetas). */
export function Sparkbars({ data = [], height = 34, color, highlight = -1 }) {
  const col = color || C.brandVivid;
  const max = Math.max(1, ...data.map((v) => Number(v) || 0));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height }}>
      {data.map((v, i) => (
        <View key={i} style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View
            style={{
              height: `${Math.max(6, ((Number(v) || 0) / max) * 100)}%`,
              borderRadius: 3,
              backgroundColor: i === highlight ? col : col + "44",
            }}
          />
        </View>
      ))}
    </View>
  );
}

// -------------------------------------------------------------- Estilos -----
const pil = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.full, borderWidth: 1, alignSelf: "flex-start" },
  txt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
});
const kpi = StyleSheet.create({
  card: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.l, padding: 14, overflow: "hidden" },
  top: { position: "absolute", top: 0, left: 0, right: 0, height: 2, opacity: 0.55 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  icon: { width: 32, height: 32, borderRadius: R.s, alignItems: "center", justifyContent: "center" },
  val: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  label: { fontSize: 11, color: C.muted, fontWeight: "700", marginTop: 1 },
});
const sec = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 6 },
  title: { fontSize: 16, fontWeight: "900", color: C.text, letterSpacing: -0.3 },
  pill: {},
});
const emp = StyleSheet.create({
  box: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: R.l, padding: 20, alignItems: "center", backgroundColor: C.surface },
  badge: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  title: { fontSize: 15, fontWeight: "900", color: C.text, textAlign: "center" },
  text: { fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 5, lineHeight: 19 },
  btn: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 11, borderRadius: R.full },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
const st = StyleSheet.create({
  row: { paddingVertical: 9 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
  label: { fontSize: 12, color: C.text2, fontWeight: "700" },
  value: { fontSize: 13, fontWeight: "900" },
});
const sk = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
