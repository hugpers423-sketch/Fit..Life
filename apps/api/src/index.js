const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
// Base local Docker (gallant_kare). Se respeta DATABASE_URL del entorno si existe.
process.env.DATABASE_URL ||= "postgresql://nutriflow:password123@127.0.0.1:5432/nutriflow?connection_limit=2";
const { PrismaClient } = require("@prisma/client");
const {
  hashPassword,
  verifyPassword,
  newToken,
  isEmail,
  publicUser,
  ACCESS_TTL_MS,
  REFRESH_TTL_MS,
  RESET_TTL_MS,
} = require("./auth");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "100kb" }));

// ============================================================
// SINCRONIZACIÓN EN TIEMPO REAL (por versión)
// Un contador global que sube en cada escritura exitosa.
// Los clientes (admin web + 4 apps móviles) hacen polling a
// /api/version y solo recargan sus datos cuando el número
// cambia. Así todos ven lo mismo sin WebSocket ni dependencias.
// ============================================================
let DATA_VERSION = 1;

app.use((req, res, next) => {
  res.on("finish", () => {
    const esEscritura = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    const salioBien = res.statusCode < 400;
    if (esEscritura && salioBien) DATA_VERSION += 1;
  });
  next();
});

app.get("/api/version", (req, res) => res.json({ v: DATA_VERSION }));


// ============================================
// AUTH - Token opaco por usuario + gates por rol
// Públicas (sin token): health, /, login, registro USUARIO,
// catálogos de lectura (gyms, restaurants, dishes, recipes, products, posts).
// Todo lo demás exige: Authorization: Bearer <token>.
// Header opcional x-role debe coincidir con el rol del dueño del token.
// ============================================
const OPEN_GET = new Set([
  "/health",
  "/",
  "/api/gyms",
  "/api/restaurants",
  "/api/dishes",
  "/api/recipes",
  "/api/products",
  "/api/posts",
]);

function bearerToken(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function authMiddleware(req, res, next) {
  try {
    if (req.method === "GET" && OPEN_GET.has(req.path)) return next();
    const PUBLIC_POST = new Set([
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/refresh",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
    ]);
    if (req.method === "POST" && PUBLIC_POST.has(req.path)) return next();
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "Falta token de sesión" });
    const row = await prisma.token.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!row || !row.user) return res.status(401).json({ error: "Sesión inválida" });
    if (row.revokedAt) return res.status(401).json({ error: "Sesión cerrada" });
    if (!row.expiresAt || row.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ error: "Sesión expirada" });
    }
    const xr = req.headers["x-role"];
    if (xr && String(xr) !== String(row.user.role)) {
      return res.status(403).json({ error: "Rol no corresponde a la sesión" });
    }
    // Registro de último uso (best effort, no bloquea la petición)
    prisma.token
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
    req.authUser = row.user;
    req.authToken = row;
    return next();
  } catch (error) {
    return res.status(500).json({ error: "No se pudo validar la sesión" });
  }
}

function need(...roles) {
  return (req, res, next) => {
    if (req.authUser && roles.includes(req.authUser.role)) return next();
    return res.status(403).json({ error: "Sin permiso para esta acción" });
  };
}

// Verifica que alguno de los campos del body sea el id propio (o admin).
function ownBody(...fields) {
  return (req, res, next) => {
    if (req.authUser && req.authUser.role === "SUPER_ADMIN") return next();
    const body = req.body || {};
    const mine = req.authUser && fields.some((f) => body[f] && String(body[f]) === String(req.authUser.id));
    if (!mine) return res.status(403).json({ error: "Solo puedes registrar tus propios datos" });
    return next();
  };
}

app.use(authMiddleware);

// ============================================
// HEALTH CHECK
// ============================================
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "nutriflow-api", timestamp: new Date().toISOString() });
});

// ============================================
// AUTH & USER LOGIN
// ============================================
// Crea una sesión (access + refresh) con expiración y la guarda en la BD.
async function createSession(userId) {
  const now = Date.now();
  return prisma.token.create({
    data: {
      token: newToken("nf_"),
      refreshToken: newToken("nfr_"),
      userId,
      expiresAt: new Date(now + ACCESS_TTL_MS),
      refreshExpiresAt: new Date(now + REFRESH_TTL_MS),
      lastUsedAt: new Date(now),
    },
  });
}

// Inicia sesión con correo + contraseña (hash). Devuelve access + refresh.
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email y password son obligatorios" });
  }
  const normalized = String(email).trim().toLowerCase();
  try {
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const session = await createSession(user.id);
    res.json({
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("[login] error:", error);
    res.status(500).json({ error: "No se pudo iniciar sesión" });
  }
});

// Registro abierto (solo crea rol USUARIO) con contraseña.
app.post("/api/auth/register", async (req, res) => {
  const { email, name, password } = req.body || {};
  const normalized = String(email || "").trim().toLowerCase();
  if (!isEmail(normalized) || !name || !password) {
    return res.status(400).json({ error: "email, name y password son obligatorios" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }
  try {
    const exists = await prisma.user.findUnique({ where: { email: normalized } });
    if (exists) return res.status(409).json({ error: "El correo ya está registrado" });
    const user = await prisma.user.create({
      data: {
        email: normalized,
        name: String(name).trim(),
        role: "USUARIO",
        passwordHash: hashPassword(password),
      },
    });
    const session = await createSession(user.id);
    res.status(201).json({
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      user: publicUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: "No se pudo crear la cuenta" });
  }
});

// Renueva el access token usando el refresh token (rota el access, no el refresh).
app.post("/api/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken es obligatorio" });
  }
  try {
    const row = await prisma.token.findUnique({
      where: { refreshToken: String(refreshToken) },
      include: { user: true },
    });
    if (!row || row.revokedAt || !row.refreshExpiresAt || row.refreshExpiresAt.getTime() < Date.now()) {
      return res.status(401).json({ error: "Sesión expirada, vuelve a ingresar" });
    }
    const updated = await prisma.token.update({
      where: { id: row.id },
      data: {
        token: newToken("nf_"),
        expiresAt: new Date(Date.now() + ACCESS_TTL_MS),
        lastUsedAt: new Date(),
      },
    });
    res.json({
      token: updated.token,
      refreshToken: row.refreshToken,
      expiresAt: updated.expiresAt,
      user: publicUser(row.user),
    });
  } catch (error) {
    res.status(500).json({ error: "No se pudo renovar la sesión" });
  }
});

// Cierra la sesión actual (revoca el access y su refresh).
app.post("/api/auth/logout", async (req, res) => {
  try {
    const token = bearerToken(req);
    if (token) {
      await prisma.token.updateMany({
        where: { token },
        data: { revokedAt: new Date() },
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo cerrar la sesión" });
  }
});

// Devuelve el usuario dueño del token (para que el web confirme la sesión).
app.get("/api/auth/me", (req, res) => {
  res.json({ user: publicUser(req.authUser) });
});

// Solicita restablecer contraseña. Nunca revela si el correo existe.
// Sin SMTP configurado, el token se entrega en la respuesta para que el
// cliente (móvil/web) complete el flujo en la misma pantalla. Con SMTP,
// enviarlo por correo y devolver solo { ok: true }.
app.post("/api/auth/forgot-password", async (req, res) => {
  const normalized = String((req.body && req.body.email) || "").trim().toLowerCase();
  try {
    const user = isEmail(normalized) ? await prisma.user.findUnique({ where: { email: normalized } }) : null;
    if (user) {
      const token = newToken("nfrst_");
      await prisma.passwordReset.create({
        data: { token, userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      });
      // En producción con correo: enviar enlace y omitir el token en la respuesta.
      console.log(`[reset] ${normalized} -> /restablecer?token=${token}`);
      return res.json({
        ok: true,
        resetToken: token,
        expiresInMinutes: Math.round(RESET_TTL_MS / 60000),
      });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo procesar la solicitud" });
  }
});

// Confirma el restablecimiento con el token y la nueva contraseña.
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: "token y password son obligatorios" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }
  try {
    const row = await prisma.passwordReset.findUnique({ where: { token: String(token) } });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "Enlace inválido o expirado" });
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash: hashPassword(password) } }),
      prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      prisma.token.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo restablecer la contraseña" });
  }
});

// ============================================
// USER CREATION - Solo SUPER_ADMIN (el registro público es /api/auth/register)
// ============================================
app.post("/api/users", need("SUPER_ADMIN"), async (req, res) => {
  const { email, name, role, specialty, password } = req.body || {};
  if (!email || !name || !role) {
    return res.status(400).json({ error: "email, name y role son obligatorios" });
  }

  const validRoles = ["SUPER_ADMIN", "VENDEDOR", "USUARIO", "ORIENTADOR", "QUIOSK"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Role inválido" });
  }
  if (password != null && String(password).length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: String(email).trim().toLowerCase(),
        name: String(name).trim(),
        role: role,
        specialty: specialty ? String(specialty).trim() : null,
        passwordHash: password ? hashPassword(password) : null,
      },
    });
    res.status(201).json(publicUser(user));
  } catch (error) {
    if (error && error.code === "P2002") {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }
    res.status(500).json({ error: "No se pudo crear el usuario" });
  }
});

// ============================================
// MEALS CRUD - CON FILTRO POR ROL
// ============================================

// GET meals - Cada rol ve sus propias comidas o todas (SUPER_ADMIN)
app.get("/api/meals", async (req, res) => {
  // El rol y el dueño salen del token verificado, nunca del query.
  const isAdmin = req.authUser.role === "SUPER_ADMIN";
  const target = isAdmin && req.query.userId ? String(req.query.userId) : req.authUser.id;
  const where = { userId: target };

  try {
    const meals = await prisma.meal.findMany({ where });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener las comidas" });
  }
});

// POST meal - Crear comida para propio usuario
app.post("/api/meals", ownBody("userId"), async (req, res) => {
  const { userId, type, name, dishId, restaurantId, source, scheduledAt, calories, proteinG, carbsG, fatG } = req.body || {};
  if (!userId || !type) {
    return res.status(400).json({ error: "userId y type son obligatorios" });
  }

  try {
    const meal = await prisma.meal.create({
      data: {
        userId,
        type,
        name: name ? String(name).trim() : null,
        dishId: dishId ? String(dishId) : null,
        restaurantId: restaurantId ? String(restaurantId) : null,
        source: source ? String(source) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        calories, proteinG, carbsG, fatG,
      },
    });
    res.status(201).json(meal);
  } catch (error) {
    res.status(500).json({ error: "No se pudo crear la comida" });
  }
});

// DELETE meal - Solo dueño o SUPER_ADMIN
app.delete("/api/meals/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const row = await prisma.meal.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "No existe" });
    if (req.authUser.role !== "SUPER_ADMIN" && row.userId !== req.authUser.id) {
      return res.status(403).json({ error: "Solo el dueño o admin" });
    }
    await prisma.meal.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar la comida" });
  }
});

// ============================================
// WORKOUTS CRUD - CON FILTRO POR ROL
// ============================================

app.get("/api/workouts", async (req, res) => {
  const isAdmin = req.authUser.role === "SUPER_ADMIN";
  const target = isAdmin && req.query.userId ? String(req.query.userId) : req.authUser.id;
  const where = { userId: target };

  try {
    const workouts = await prisma.workout.findMany({ where });
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener los entrenos" });
  }
});

app.post("/api/workouts", ownBody("userId"), async (req, res) => {
  const { userId, type, duration, durationMin, calories_burned, caloriesBurned, date } = req.body || {};
  if (!userId || !type) {
    return res.status(400).json({ error: "userId y type son obligatorios" });
  }

  try {
    const workout = await prisma.workout.create({
      data: {
        userId,
        type,
        date: date ? new Date(date) : new Date(),
        durationMin: durationMin ?? duration ?? null,
        caloriesBurned: caloriesBurned ?? calories_burned ?? null,
      },
    });
    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ error: "No se pudo crear el entrenamiento" });
  }
});

app.delete("/api/workouts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const row = await prisma.workout.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "No existe" });
    if (req.authUser.role !== "SUPER_ADMIN" && row.userId !== req.authUser.id) {
      return res.status(403).json({ error: "Solo el dueño o admin" });
    }
    await prisma.workout.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar el entrenamiento" });
  }
});

// ============================================
// PROFILE CRUD - CON FILTRO POR ROL
// ============================================

app.get("/api/user/profile", async (req, res) => {
  const isAdmin = req.authUser.role === "SUPER_ADMIN";
  const target = isAdmin && req.query.userId ? String(req.query.userId) : req.authUser.id;

  try {
    const profile = await prisma.profile.findUnique({ where: { userId: target } });
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: "No se pudo obtener el perfil" });
  }
});

app.patch("/api/user/profile", ownBody("userId"), async (req, res) => {
  const {
    userId, role, name, birthDate, gender, heightCm, weightKg, targetWeightKg,
    activityLevel, goal, bmi, bmr, tdee,
    targetCalories, targetProtein, targetCarbs, targetFat,
    wakeTime, workStart, workEnd,
  } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "userId es requerido" });
  }

  const where = role === "SUPER_ADMIN"
    ? { userId: String(userId) }
    : { userId: String(userId) };

  // Campos de perfil que solo se actualizan si vienen en el body.
  const fields = {
    birthDate: birthDate ? new Date(birthDate) : undefined,
    gender, heightCm, weightKg, targetWeightKg, activityLevel, goal,
    bmi, bmr, tdee, targetCalories, targetProtein, targetCarbs, targetFat,
    wakeTime, workStart, workEnd,
  };
  const defined = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));

  try {
    if (name) {
      await prisma.user.update({ where: { id: String(userId) }, data: { name: String(name).trim() } });
    }
    const profile = await prisma.profile.upsert({
      where,
      update: defined,
      create: { userId, ...defined },
    });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: "No se pudo actualizar el perfil" });
  }
});

// ============================================
// SUPER-ADMIN: VER TODOS LOS USUARIOS Y ESTADISTICAS
// ============================================

// GET all users - Solo SUPER_ADMIN
app.get("/api/admin/users", async (req, res) => {
  // Autorización desde el token verificado (no del query).
  if (req.authUser.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "No autorizado" });
  }
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, specialty: true, membership: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener los usuarios" });
  }
});

// GET all meals stats - Solo SUPER_ADMIN
app.get("/api/admin/stats/meals", need("SUPER_ADMIN", "ORIENTADOR"), async (req, res) => {
  try {
    const total = await prisma.meal.count();
    const byRole = await prisma.$queryRaw`
      SELECT u."role", COUNT(m.id) as total
      FROM "Meal" m
      JOIN "User" u ON m."userId" = u.id
      GROUP BY u."role"
    `;
    res.json({
      total,
      byRole: byRole.map((r) => ({ role: r.role, total: Number(r.total) })),
    });
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener estadísticas" });
  }
});

// GET all workouts stats - Solo SUPER_ADMIN
app.get("/api/admin/stats/workouts", need("SUPER_ADMIN", "ORIENTADOR"), async (req, res) => {
  try {
    const total = await prisma.workout.count();
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener estadísticas" });
  }
});

// ============================================
// POSTS - Reels, videos, fotos, servicios y avisos de live
// ============================================
app.get("/api/posts", async (req, res) => {
  const { authorId, kind } = req.query;
  try {
    const posts = await prisma.post.findMany({
      where: {
        ...(authorId ? { authorId: String(authorId) } : {}),
        ...(kind ? { kind: String(kind) } : {}),
      },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener las publicaciones" });
  }
});

app.post("/api/posts", ownBody("authorId"), async (req, res) => {
  const { authorId, kind, title, mediaUrl, description, specialty } = req.body || {};
  if (!authorId || !title) {
    return res.status(400).json({ error: "authorId y title son obligatorios" });
  }
  try {
    const post = await prisma.post.create({
      data: {
        authorId: String(authorId),
        kind: kind || "REEL",
        title: String(title).trim(),
        mediaUrl: mediaUrl ? String(mediaUrl).trim() : null,
        description: description ? String(description).trim() : null,
        specialty: specialty ? String(specialty).trim() : null,
      },
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: "No se pudo publicar" });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  try {
    const row = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: "No existe" });
    if (req.authUser.role !== "SUPER_ADMIN" && row.authorId !== req.authUser.id) {
      return res.status(403).json({ error: "Solo el autor o admin" });
    }
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar" });
  }
});

// ============================================
// SESSIONS - Videollamadas y lives (meetUrl Jitsi)
// ============================================
app.get("/api/sessions", async (req, res) => {
  const { professionalId, clientId } = req.query;
  try {
    const sessions = await prisma.session.findMany({
      where: {
        ...(professionalId ? { professionalId: String(professionalId) } : {}),
        ...(clientId ? { clientId: String(clientId) } : {}),
      },
      include: {
        professional: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener las sesiones" });
  }
});

app.post("/api/sessions", ownBody("professionalId"), async (req, res) => {
  const { professionalId, clientId, type, topic, scheduledAt, meetUrl } = req.body || {};
  if (!professionalId || !topic) {
    return res.status(400).json({ error: "professionalId y topic son obligatorios" });
  }
  try {
    const session = await prisma.session.create({
      data: {
        professionalId: String(professionalId),
        clientId: clientId ? String(clientId) : null,
        type: type || "VIDEOCALL",
        topic: String(topic).trim(),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        meetUrl: meetUrl
          ? String(meetUrl).trim()
          : `https://meet.jit.si/nf-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
      },
    });
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: "No se pudo crear la sesión" });
  }
});

// ============================================
// PAYMENTS - Cobros e ingresos mensuales del profesional
// ============================================
app.get("/api/payments", async (req, res) => {
  const { professionalId, month } = req.query;
  try {
    const payments = await prisma.payment.findMany({
      where: {
        ...(professionalId ? { professionalId: String(professionalId) } : {}),
        ...(month ? { month: String(month) } : {}),
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const total = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
    res.json({ total, count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener los pagos" });
  }
});

app.post("/api/payments", ownBody("userId"), async (req, res) => {
  const { userId, professionalId, amount, concept, month } = req.body || {};
  if (!userId || amount == null || !concept) {
    return res.status(400).json({ error: "userId, amount y concept son obligatorios" });
  }
  try {
    const payment = await prisma.payment.create({
      data: {
        userId: String(userId),
        professionalId: professionalId ? String(professionalId) : null,
        amount: Number(amount),
        concept: String(concept).trim(),
        month: month ? String(month) : new Date().toISOString().slice(0, 7),
      },
    });
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: "No se pudo registrar el pago" });
  }
});

// ============================================
// DISHES - Catálogo, menú y especiales del restaurante
// ============================================
app.get("/api/dishes", async (req, res) => {
  const { restaurantId, day } = req.query;
  try {
    const dishes = await prisma.dish.findMany({
      where: {
        ...(restaurantId ? { restaurantId: String(restaurantId) } : {}),
        ...(day != null && day !== "" ? { day: Number(day) } : {}),
      },
      orderBy: [{ day: "asc" }, { createdAt: "desc" }],
    });
    res.json(dishes);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener los platos" });
  }
});

app.post("/api/dishes", need("VENDEDOR", "SUPER_ADMIN"), async (req, res) => {
  const { restaurantId, name, description, price, photoUrl, day, special, calories, proteinG } = req.body || {};
  if (!restaurantId || !name) {
    return res.status(400).json({ error: "restaurantId y name son obligatorios" });
  }
  try {
    const dish = await prisma.dish.create({
      data: {
        restaurantId: String(restaurantId),
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        price: price != null && price !== "" ? Number(price) : null,
        photoUrl: photoUrl ? String(photoUrl).trim() : null,
        day: day != null && day !== "" ? Number(day) : null,
        special: special === true || special === "true",
        calories: calories != null && calories !== "" ? Number(calories) : null,
        proteinG: proteinG != null && proteinG !== "" ? Number(proteinG) : null,
      },
    });
    res.status(201).json(dish);
  } catch (error) {
    res.status(500).json({ error: "No se pudo registrar el plato" });
  }
});

app.delete("/api/dishes/:id", async (req, res) => {
  try {
    const row = await prisma.dish.findUnique({
      where: { id: req.params.id },
      include: { restaurant: { select: { ownerId: true } } },
    });
    if (!row) return res.status(404).json({ error: "No existe" });
    const ownerId = row.restaurant ? row.restaurant.ownerId : null;
    if (req.authUser.role !== "SUPER_ADMIN" && ownerId !== req.authUser.id) {
      return res.status(403).json({ error: "Solo el dueño o admin" });
    }
    await prisma.dish.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar el plato" });
  }
});

// ============================================
// PRODUCTS - Productos del gimnasio con aval nutricional
// ============================================
app.get("/api/products", async (req, res) => {
  const { gymId, approved } = req.query;
  try {
    const products = await prisma.product.findMany({
      where: {
        ...(gymId ? { gymId: String(gymId) } : {}),
        ...(approved === "true" ? { approved: true } : approved === "false" ? { approved: false } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener los productos" });
  }
});

app.post("/api/products", need("VENDEDOR", "SUPER_ADMIN"), async (req, res) => {
  const { gymId, name, brand } = req.body || {};
  if (!name || !brand) {
    return res.status(400).json({ error: "name y brand son obligatorios" });
  }
  try {
    const product = await prisma.product.create({
      data: {
        gymId: gymId ? String(gymId) : null,
        name: String(name).trim(),
        brand: String(brand).trim(),
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "No se pudo registrar el producto" });
  }
});

// Aval del nutricionista: aprueba o rechaza el producto
app.patch("/api/products/:id/approve", need("ORIENTADOR", "SUPER_ADMIN"), async (req, res) => {
  const { approved, approvedById } = req.body || {};
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        approved: approved === true || approved === "true",
        approvedById: approvedById ? String(approvedById) : null,
      },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "No se pudo actualizar el aval" });
  }
});
app.get("/api/gyms", async (req, res) => {
  const { ownerId } = req.query;
  try {
    const gyms = await prisma.gym.findMany({
      where: ownerId ? { ownerId: String(ownerId) } : {},
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(gyms);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener los gimnasios" });
  }
});

app.post("/api/gyms", need("VENDEDOR", "SUPER_ADMIN"), async (req, res) => {
  const { ownerId, name, address, service, videoUrl, openHour, closeHour, lat, lng } = req.body || {};
  if (!name || !address || !service) {
    return res.status(400).json({ error: "name, address y service son obligatorios" });
  }
  try {
    const gym = await prisma.gym.create({
      data: {
        ownerId: ownerId || null,
        name: String(name).trim(),
        address: String(address).trim(),
        service: String(service).trim(),
        videoUrl: videoUrl ? String(videoUrl).trim() : null,
        openHour: openHour != null && openHour !== "" ? Number(openHour) : null,
        closeHour: closeHour != null && closeHour !== "" ? Number(closeHour) : null,
        lat: lat != null && lat !== "" ? Number(lat) : null,
        lng: lng != null && lng !== "" ? Number(lng) : null,
      },
    });
    res.status(201).json(gym);
  } catch (error) {
    res.status(500).json({ error: "No se pudo registrar el gimnasio" });
  }
});

app.delete("/api/gyms/:id", need("SUPER_ADMIN"), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.gym.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    if (error && error.code === "P2025") return res.status(404).json({ error: "No existe" });
    res.status(500).json({ error: "No se pudo eliminar el gimnasio" });
  }
});

// ============================================
// RESTAURANTS - Restaurantes de comida saludable
// El vendedor (dueño) los registra desde su app, con video.
// ============================================
app.get("/api/restaurants", async (req, res) => {
  const { ownerId } = req.query;
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: ownerId ? { ownerId: String(ownerId) } : {},
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener los restaurantes" });
  }
});

app.post("/api/restaurants", need("VENDEDOR", "SUPER_ADMIN"), async (req, res) => {
  const { ownerId, name, address, service, videoUrl, openHour, closeHour, lat, lng } = req.body || {};
  if (!name || !address || !service) {
    return res.status(400).json({ error: "name, address y service son obligatorios" });
  }
  try {
    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: ownerId || null,
        name: String(name).trim(),
        address: String(address).trim(),
        service: String(service).trim(),
        videoUrl: videoUrl ? String(videoUrl).trim() : null,
        openHour: openHour != null && openHour !== "" ? Number(openHour) : null,
        closeHour: closeHour != null && closeHour !== "" ? Number(closeHour) : null,
        lat: lat != null && lat !== "" ? Number(lat) : null,
        lng: lng != null && lng !== "" ? Number(lng) : null,
      },
    });
    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ error: "No se pudo registrar el restaurante" });
  }
});

app.delete("/api/restaurants/:id", need("SUPER_ADMIN"), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.restaurant.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    if (error && error.code === "P2025") return res.status(404).json({ error: "No existe" });
    res.status(500).json({ error: "No se pudo eliminar el restaurante" });
  }
});

// ============================================
// RECIPES - Menú semanal: video + ingredientes + lista de compras + precio
// ============================================
app.get("/api/recipes", async (req, res) => {
  const { day } = req.query;
  try {
    const recipes = await prisma.recipe.findMany({
      where: day != null && day !== "" ? { day: Number(day) } : {},
      orderBy: [{ day: "asc" }, { mealType: "asc" }],
    });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener las recetas" });
  }
});

app.post("/api/recipes", async (req, res) => {
  const { name, day, mealType, videoUrl, ingredients, totalPrice, calories, proteinG } = req.body || {};
  if (!name || day == null || day === "") {
    return res.status(400).json({ error: "name y day son obligatorios" });
  }
  try {
    const recipe = await prisma.recipe.upsert({
      where: { day_mealType: { day: Number(day), mealType: mealType || "Comida" } },
      update: {
        name: String(name).trim(),
        videoUrl: videoUrl ? String(videoUrl).trim() : null,
        ingredients: ingredients || null,
        totalPrice: totalPrice != null && totalPrice !== "" ? Number(totalPrice) : null,
        calories: calories != null && calories !== "" ? Number(calories) : null,
        proteinG: proteinG != null && proteinG !== "" ? Number(proteinG) : null,
      },
      create: {
        name: String(name).trim(),
        day: Number(day),
        mealType: mealType || "Comida",
        videoUrl: videoUrl ? String(videoUrl).trim() : null,
        ingredients: ingredients || null,
        totalPrice: totalPrice != null && totalPrice !== "" ? Number(totalPrice) : null,
        calories: calories != null && calories !== "" ? Number(calories) : null,
        proteinG: proteinG != null && proteinG !== "" ? Number(proteinG) : null,
      },
    });
    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ error: "No se pudo guardar la receta" });
  }
});

// Membresía: BASICA o PREMIUM (seguimiento profesional incluido en PREMIUM)
app.patch("/api/users/membership", ownBody("userId"), async (req, res) => {
  const { userId, membership } = req.body || {};
  if (!userId || !membership) {
    return res.status(400).json({ error: "userId y membership son obligatorios" });
  }
  if (!["BASICA", "PREMIUM"].includes(membership)) {
    return res.status(400).json({ error: "membership inválido" });
  }
  try {
    const user = await prisma.user.update({
      where: { id: String(userId) },
      data: { membership },
      select: { id: true, email: true, name: true, role: true, membership: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "No se pudo actualizar la membresía" });
  }
});

// ============================================
// VISITS - Visitas de clientes a gimnasios (con hora)
// ============================================
app.get("/api/visits", async (req, res) => {
  const { gymId, userId } = req.query;
  try {
    const visits = await prisma.visit.findMany({
      where: {
        ...(gymId ? { gymId: String(gymId) } : {}),
        ...(userId ? { userId: String(userId) } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
        gym: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron obtener las visitas" });
  }
});

app.post("/api/visits", ownBody("userId"), async (req, res) => {
  const { userId, gymId } = req.body || {};
  if (!userId || !gymId) {
    return res.status(400).json({ error: "userId y gymId son obligatorios" });
  }
  try {
    const now = new Date();
    const visit = await prisma.visit.create({
      data: { userId: String(userId), gymId: String(gymId), date: now, hour: now.getHours() },
    });
    res.status(201).json(visit);
  } catch (error) {
    res.status(500).json({ error: "No se pudo registrar la visita" });
  }
});

if (require.main === module) app.listen(PORT, () => console.log(`API on ${PORT}`));
module.exports = app;