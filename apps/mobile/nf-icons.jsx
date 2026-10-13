// ============================================================================
//  NutriFlow · Iconos animados (apps móviles)
//  Portado de las maquetas 8-animation-icons.html y 6-motion-system.html.
//  Sin dependencias: todo compuesto con Views + Animated (ni SVG ni Lottie).
//
//  Reglas del sistema de movimiento que se respetan:
//   · loops continuos de 1.2s – 2.8s (nunca más salvo celebraciones)
//   · como máximo UNA animación continua por pantalla: los iconos "vivos"
//     se piden con loop={true} y el resto animan solo al aparecer.
//  · `useReduceMotion()` apaga todo si el sistema lo pide.
// ============================================================================
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { EASE, D } from "./nfui";

// ---------------------------------------------------------------- helpers ---
/** Bucle continuo genérico (alterna ida y vuelta). */
function useLoop(duration = D.idle, to = 1, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: to, duration: d(duration), easing: EASE.out, delay: d(delay), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: d(duration), easing: EASE.out, useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [v, duration, to, delay]);
  return v;
}

/** Animación de una sola pasada (al montar el icono). */
function useOnce(duration = 450, delay = 0, easing) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, {
      toValue: 1,
      duration: d(duration),
      easing: easing || EASE.out,
      delay: d(delay),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [v, duration, delay]);
  return v;
}

function d(ms) {
  return REDUCE_LOCAL ? 0.001 : ms;
}
// Refleja el ajuste global de "reducir movimiento" que pone nfui.
let REDUCE_LOCAL = false;
try {
  // eslint-disable-next-line global-require
  const mod = require("./nfui");
  if (mod && typeof mod.isReduceMotion === "function") {
    mod.isReduceMotion((v) => { REDUCE_LOCAL = !!v; });
  }
} catch (e) {}

const scaleOf = (v, a, b) => v.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
const degOf = (v, a, b) => v.interpolate({ inputRange: [0, 1], outputRange: [`${a}deg`, `${b}deg`] });

// --------------------------------------------------------------- 1 · Llama --
/** 🔥 Racha y calorías. Llamea sin parar (fiel a `flameFlicker`). */
export function IconFlame({ size = 24, color = "#f97316", inner = "#fbbf24", loop = true, style }) {
  const v = useLoop(loop ? 1200 : 0, 1);
  const s = scaleOf(v, 1, 1.14);
  const rot = degOf(v, -4, 4);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style,
      { transform: [{ scale: s }, { rotate: rot }] }]}>
      <View
        style={{
          width: size * 0.56,
          height: size * 0.78,
          backgroundColor: color,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
          borderBottomLeftRadius: size * 0.26,
          borderBottomRightRadius: size * 0.26,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: size * 0.12,
          width: size * 0.26,
          height: size * 0.38,
          backgroundColor: inner,
          borderTopLeftRadius: size * 0.14,
          borderTopRightRadius: size * 0.14,
          borderBottomLeftRadius: size * 0.11,
          borderBottomRightRadius: size * 0.11,
        }}
      />
    </Animated.View>
  );
}

// -------------------------------------------------------------- 2 · Corazón --
/** ❤️ Salud y metas. Late como un corazón (fiel a `blinkDot`). */
export function IconHeart({ size = 24, color = "#e11d48", loop = true, style }) {
  const v = useLoop(loop ? 1200 : 0, 1);
  const s = scaleOf(v, 1, 1.18);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style, { transform: [{ scale: s }] }]}>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: size * 0.46, height: size * 0.46, borderRadius: size * 0.23, backgroundColor: color }} />
        <View style={{ width: size * 0.46, height: size * 0.46, borderRadius: size * 0.23, backgroundColor: color }} />
      </View>
      <View
        style={{
          position: "absolute",
          top: size * 0.28,
          width: size * 0.5,
          height: size * 0.5,
          backgroundColor: color,
          borderRadius: size * 0.08,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </Animated.View>
  );
}

// ----------------------------------------------------------------- 3 · Hoja --
/** 🥗 Comida saludable. Se mece con el viento (fiel a `leafSway`). */
export function IconLeaf({ size = 24, color = "#22c55e", loop = true, style }) {
  const v = useLoop(loop ? 1300 : 0, 1);
  const rot = degOf(v, -12, 12);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style, { transform: [{ rotate: rot }] }]}>
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          backgroundColor: color,
          borderTopLeftRadius: size * 0.32,
          borderBottomRightRadius: size * 0.32,
          borderTopRightRadius: size * 0.06,
          borderBottomLeftRadius: size * 0.06,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 0.5,
          height: size * 0.07,
          backgroundColor: "rgba(255,255,255,.55)",
          transform: [{ rotate: "-45deg" }],
        }}
      />
    </Animated.View>
  );
}

// --------------------------------------------------------------- 4 · Trofeo --
/** 🏆 Logros. Flota hacia arriba y hacia abajo (fiel a `bob`/`trophyPop`). */
export function IconTrophy({ size = 24, color = "#f59e0b", loop = true, style }) {
  const v = useLoop(loop ? 1400 : 0, 1);
  const y = v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.14] });
  const s = scaleOf(v, 1, 1.06);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style, { transform: [{ translateY: y }, { scale: s }] }]}>
      <View style={{ width: size * 0.56, height: size * 0.42, backgroundColor: color, borderTopLeftRadius: size * 0.1, borderTopRightRadius: size * 0.1, borderBottomLeftRadius: size * 0.04, borderBottomRightRadius: size * 0.04 }} />
      <View style={{ width: size * 0.14, height: size * 0.16, backgroundColor: color, marginTop: -1 }} />
      <View style={{ width: size * 0.44, height: size * 0.12, backgroundColor: color, borderRadius: size * 0.04, marginTop: 1 }} />
      <View style={{ position: "absolute", top: size * 0.06, left: size * 0.14, width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06, backgroundColor: "rgba(255,255,255,.5)" }} />
    </Animated.View>
  );
}

// --------------------------------------------------------------- 5 · Campana --
/** 🔔 Avisos y comidas. Se balancea (fiel a `bellSwing`). */
export function IconBell({ size = 24, color = "#f59e0b", loop = true, style }) {
  const v = useLoop(loop ? 1400 : 0, 1);
  const rot = degOf(v, -14, 14);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style, { transform: [{ rotate: rot }] }]}>
      <View style={{ width: size * 0.56, height: size * 0.56, backgroundColor: color, borderTopLeftRadius: size * 0.28, borderTopRightRadius: size * 0.28, borderBottomLeftRadius: size * 0.1, borderBottomRightRadius: size * 0.1 }} />
      <View style={{ width: size * 0.68, height: size * 0.09, backgroundColor: color, borderRadius: size * 0.05 }} />
      <View style={{ position: "absolute", bottom: size * 0.08, width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, backgroundColor: color }} />
      <View style={{ position: "absolute", top: size * 0.06, width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06, backgroundColor: "rgba(255,255,255,.55)" }} />
    </Animated.View>
  );
}

// -------------------------------------------------------------- 6 · Micrófono --
/** 🎙️ Asistente por voz. Late con ondas (fiel a `micBob` + `waveOut`). */
export function IconMic({ size = 24, color = "#22c55e", loop = true, style }) {
  const v = useLoop(loop ? 1300 : 0, 1);
  const s = scaleOf(v, 1, 1.12);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style, { transform: [{ scale: s }] }]}>
      <View style={{ width: size * 0.3, height: size * 0.5, borderRadius: size * 0.15, backgroundColor: color }} />
      <View style={{ width: size * 0.52, height: size * 0.26, borderWidth: Math.max(1.5, size * 0.07), borderColor: color, borderBottomLeftRadius: size * 0.26, borderBottomRightRadius: size * 0.26, marginTop: -size * 0.06 }} />
      <View style={{ width: size * 0.07, height: size * 0.16, backgroundColor: color, marginTop: 1 }} />
      <View style={{ width: size * 0.28, height: size * 0.07, backgroundColor: color, borderRadius: size * 0.04 }} />
      {/* ondas */}
      {[0.72, 0.92].map((f, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size * f,
            height: size * f,
            borderRadius: size * 0.5,
            borderWidth: 1.5,
            borderColor: color,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) }],
          }}
        />
      ))}
    </Animated.View>
  );
}

// -------------------------------------------------------------- 7 · Gota agua --
/** 💧 Hidratación. Cae y rebota (fiel a `dropFall`). */
export function IconDrop({ size = 24, color = "#0ea5e9", loop = true, style }) {
  const v = useLoop(loop ? 1100 : 0, 1);
  const y = v.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.1, size * 0.08] });
  const s = scaleOf(v, 1, 0.94);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style, { transform: [{ translateY: y }, { scale: s }] }]}>
      <View
        style={{
          width: size * 0.52,
          height: size * 0.52,
          backgroundColor: color,
          borderTopLeftRadius: size * 0.26,
          borderTopRightRadius: size * 0.04,
          borderBottomLeftRadius: size * 0.26,
          borderBottomRightRadius: size * 0.26,
          transform: [{ rotate: "-45deg" }],
        }}
      />
      <View style={{ position: "absolute", top: size * 0.24, left: size * 0.28, width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: "rgba(255,255,255,.6)" }} />
    </Animated.View>
  );
}

// -------------------------------------------------------------- 8 · Pesas -----
/** 🏋️ Entrenamiento. Suben y bajan (fiel a `dbSqueeze`/`dbLift`). */
export function IconDumbbell({ size = 24, color = "#14b8a6", loop = true, style }) {
  const v = useLoop(loop ? 900 : 0, 1);
  const y = v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.16] });
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style, { transform: [{ translateY: y }] }]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: size * 0.16, height: size * 0.44, backgroundColor: color, borderRadius: size * 0.05 }} />
        <View style={{ width: size * 0.4, height: size * 0.12, backgroundColor: color, borderRadius: size * 0.03 }} />
        <View style={{ width: size * 0.16, height: size * 0.44, backgroundColor: color, borderRadius: size * 0.05 }} />
      </View>
      <View style={{ position: "absolute", top: size * 0.16, left: size * 0.02, width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: "rgba(255,255,255,.45)" }} />
    </Animated.View>
  );
}

// ------------------------------------------------------------ 9 · Corredor -----
/** 🏃 Cardio. Rebota rápido (fiel a `rnBob`). */
export function IconRun({ size = 24, color = "#22c55e", loop = true, style }) {
  const v = useLoop(loop ? 340 : 0, 1);
  const y = v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.18] });
  const rot = degOf(v, -5, 5);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style, { transform: [{ translateY: y }, { rotate: rot }] }]}>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: size * 0.26, height: size * 0.26, borderRadius: size * 0.13, backgroundColor: color }} />
        <View style={{ width: size * 0.09, height: size * 0.34, backgroundColor: color, borderRadius: size * 0.04, marginTop: -1 }} />
        <View style={{ flexDirection: "row", marginTop: -2 }}>
          <View style={{ width: size * 0.08, height: size * 0.3, backgroundColor: color, borderRadius: size * 0.04, transform: [{ rotate: "18deg" }] }} />
          <View style={{ width: size * 0.08, height: size * 0.3, backgroundColor: color, borderRadius: size * 0.04, transform: [{ rotate: "-18deg" }] }} />
        </View>
      </View>
    </Animated.View>
  );
}

// --------------------------------------------------------------- 10 · Escaneo --
/** 📷 Escaneo por foto. La línea barre (fiel a `scanSweep`). */
export function IconScan({ size = 24, color = "#22c55e", loop = true, style }) {
  const v = useLoop(loop ? 1200 : 0, 1);
  const y = v.interpolate({ inputRange: [0, 1], outputRange: [size * 0.16, size * 0.78] });
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <View style={{ width: size * 0.76, height: size * 0.76, borderWidth: Math.max(1.5, size * 0.06), borderColor: color + "66", borderRadius: size * 0.16, overflow: "hidden" }}>
        <Animated.View style={{ position: "absolute", left: 0, right: 0, height: Math.max(1.5, size * 0.07), backgroundColor: color, transform: [{ translateY: y }] }} />
        <View style={{ position: "absolute", top: size * 0.24, left: size * 0.14, width: size * 0.34, height: size * 0.28, backgroundColor: color + "22", borderRadius: size * 0.08 }} />
      </View>
      <View style={{ position: "absolute", top: size * 0.08, left: size * 0.08, width: size * 0.16, height: size * 0.16, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderColor: color, borderTopLeftRadius: size * 0.06 }} />
      <View style={{ position: "absolute", top: size * 0.08, right: size * 0.08, width: size * 0.16, height: size * 0.16, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: color, borderTopRightRadius: size * 0.06 }} />
      <View style={{ position: "absolute", bottom: size * 0.08, left: size * 0.08, width: size * 0.16, height: size * 0.16, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderColor: color, borderBottomLeftRadius: size * 0.06 }} />
      <View style={{ position: "absolute", bottom: size * 0.08, right: size * 0.08, width: size * 0.16, height: size * 0.16, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderColor: color, borderBottomRightRadius: size * 0.06 }} />
    </View>
  );
}

// -------------------------------------------------------------- 11 · Destellos --
/** ✨ Premium y logros. Centellea (fiel a `twinkle`/`badgePop`). */
export function IconSparkle({ size = 24, color = "#f59e0b", loop = true, style }) {
  const v = useLoop(loop ? 900 : 0, 1);
  const s = scaleOf(v, 0.82, 1.14);
  const o = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const star = (w, h, rot, tint) => (
    <Animated.View
      key={rot}
      style={{
        position: "absolute",
        width: w,
        height: h,
        borderRadius: h,
        backgroundColor: tint || color,
        opacity: o,
        transform: [{ rotate: `${rot}deg` }, { scale: s }],
      }}
    />
  );
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {star(size * 0.16, size * 0.72, 0)}
      {star(size * 0.72, size * 0.16, 90)}
      {star(size * 0.1, size * 0.4, 45, color + "88")}
      {star(size * 0.4, size * 0.1, 135, color + "88")}
    </Animated.View>
  );
}

// --------------------------------------------------------------- 12 · Rueda --
/** 🚴 Movimiento. Gira sin parar (fiel a `spin`). */
export function IconSpin({ size = 24, color = "#14b8a6", loop = true, style, children }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: d(loop ? 1000 : 0), easing: Easing.linear, useNativeDriver: true })
    );
    a.start();
    return () => a.stop();
  }, [v, loop]);
  const rot = v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style, { transform: [{ rotate: rot }] }]}>
      {children || (
        <View style={{ width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35, borderWidth: Math.max(2, size * 0.09), borderColor: color }}>
          <View style={{ position: "absolute", top: size * 0.28, left: size * 0.28, width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: color }} />
        </View>
      )}
    </Animated.View>
  );
}

// --------------------------------------------------------------- 13 · Orbe ----
/** El asistente de la app: late con halos (fiel a `idleCore` + `idleRing`). */
export function IconOrb({ size = 56, color = "#8b5cf6", inner = "#22c55e", loop = true, style }) {
  const core = useLoop(loop ? D.idle : 0, 1);
  const ring = useLoop(loop ? D.idle : 0, 1, D.idle / 3);
  const s = scaleOf(core, 1, 1.08);
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {[0.5, 1].map((f, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size * f,
            height: size * f,
            borderRadius: size * 0.5,
            backgroundColor: color,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.1] }) }],
          }}
        />
      ))}
      <Animated.View
        style={{
          width: size * 0.52,
          height: size * 0.52,
          borderRadius: size * 0.26,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: s }],
        }}
      >
        <View style={{ width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: inner }} />
      </Animated.View>
    </View>
  );
}

// --------------------------------------------------------- 14 · Check animado --
/** ✅ Confirmación. Se dibuja y hace pop (fiel a `sucCheck`/`sucPop`). */
export function IconCheck({ size = 24, color = "#22c55e", active = true, style }) {
  const v = useOnce(D.celebrate, 0, EASE.bounce);
  const s = scaleOf(v, 0.4, 1);
  const o = v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] });
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.5,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
          opacity: active ? o : 0.25,
          transform: [{ scale: s }],
        },
        style,
      ]}
    >
      <View
        style={{
          width: size * 0.34,
          height: size * 0.18,
          borderLeftWidth: 2.5,
          borderBottomWidth: 2.5,
          borderColor: "#fff",
          transform: [{ rotate: "-45deg" }, { translateY: -size * 0.04 }],
        }}
      />
    </Animated.View>
  );
}

// ------------------------------------------------------- 15 · Barra de voz ---
/** Ecualizador de voz (fiel a `eq`/`bigWave`). */
export function IconWave({ size = 24, color = "#22c55e", bars = 5, loop = true, style }) {
  const anims = useRef(Array.from({ length: bars }, () => new Animated.Value(0))).current;
  useEffect(() => {
    const a = Animated.parallel(
      anims.map((v, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: d(320), easing: EASE.out, delay: d(i * 120), useNativeDriver: false }),
            Animated.timing(v, { toValue: 0.15, duration: d(320), easing: EASE.out, useNativeDriver: false }),
          ])
        )
      )
    );
    a.start();
    return () => a.stop();
  }, [anims]);
  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", gap: size * 0.09, height: size }, style]}>
      {anims.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: size * 0.14,
            height: v.interpolate({ inputRange: [0, 1], outputRange: [size * 0.18, size] }),
            borderRadius: size * 0.07,
            backgroundColor: color,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          }}
        />
      ))}
    </View>
  );
}

// ------------------------------------------------------ Mapa de iconos -------
/** Busca un icono por nombre para no importar uno por uno. */
export const ICONS = {
  flame: IconFlame,
  heart: IconHeart,
  leaf: IconLeaf,
  trophy: IconTrophy,
  bell: IconBell,
  mic: IconMic,
  drop: IconDrop,
  dumbbell: IconDumbbell,
  run: IconRun,
  scan: IconScan,
  sparkle: IconSparkle,
  spin: IconSpin,
  orb: IconOrb,
  check: IconCheck,
  wave: IconWave,
};

export function Icon({ name, ...props }) {
  const Cmp = ICONS[name] || IconLeaf;
  return <Cmp {...props} />;
}
