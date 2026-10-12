// ============================================================
// Autenticación real de NutriFlow (sin dependencias externas)
// - Hash de contraseñas con scrypt (KDF del core de Node)
// - Tokens opacos aleatorios (access + refresh) con expiración
// ============================================================
const crypto = require("crypto");

// Tiempos de vida de las sesiones
const ACCESS_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora para restablecer contraseña

// Parámetros de scrypt (equilibrio seguridad/CPU para hardware modesto)
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/**
 * Genera un hash de contraseña con sal aleatoria.
 * Formato: scrypt$N$r$p$<salBase64>$<hashBase64>
 */
function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(plain), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

/**
 * Verifica una contraseña contra un hash almacenado (comparación en tiempo constante).
 */
function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!N || !r || !p) return false;
  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  let derived;
  try {
    derived = crypto.scryptSync(String(plain), salt, expected.length, { N, r, p });
  } catch {
    return false;
  }
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

/** Token opaco aleatorio. Prefijo distinto para access, refresh y reset. */
function newToken(prefix = "nf_") {
  return prefix + crypto.randomBytes(32).toString("hex");
}

/** Valida formato de correo (simple, suficiente para registro). */
function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Proyecta el usuario para enviarlo al cliente (nunca expone passwordHash). */
function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    specialty: user.specialty ?? null,
    membership: user.membership ?? null,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  newToken,
  isEmail,
  publicUser,
  ACCESS_TTL_MS,
  REFRESH_TTL_MS,
  RESET_TTL_MS,
};
