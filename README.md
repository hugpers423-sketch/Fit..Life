# NutriFlow - Plataforma Esencial de Nutrición

## 🎯 Versión Simplificada v3.0

![Design System v3.0](https://img.shields.io/badge/v3.0-Sistema%20Esencial-15803d?style=for-the-badge)

---

## 🚀 MISIÓN PRINCIPAL

**Ayudar a las personas a comer saludablemente** con toggle de animaciones y diseño system visual.

---

## 📦 ARCHITECTURE SIMPLIFICADA

```
fitlife/
├── apps/api/        # Express + Prisma (ESPECÍFICO: meals focus)
├── apps/web/        # Next.js 15 (ESPECÍFICO: landing + toggle)
├── prisma/          # Schema y migraciones
└── package.json     # Root workspace config
```

---

## 🗄️ BASE DE DATOS

### PostgreSQL (Docker)

```
Container: gallant_kare
Puerto: 5432
Base de datos: nutriflow
Usuario: nutriflow / Password: password123
```

---

## 🔧 API REST (Puerto 3001)

### Autenticación real (Sprint 1)

```
POST /api/auth/login           → Iniciar sesión (email + password hasheada)
POST /api/auth/register        → Registro abierto (solo rol USUARIO) con contraseña (mín. 8)
POST /api/auth/refresh         → Renovar access token con el refresh token
POST /api/auth/logout          → Cerrar sesión (revoca access + refresh)
GET  /api/auth/me              → Usuario dueño del token
POST /api/auth/forgot-password → Solicitar reset (nunca revela si el correo existe)
POST /api/auth/reset-password  → Confirmar reset con token (revoca sesiones)
POST /api/users                → Crear usuario (SOLO SUPER_ADMIN, con password opcional)
```

- **Hash de contraseñas**: `crypto.scryptSync` nativo (cero dependencias), formato `scrypt$N$r$p$salt$hash`.
- **Sesiones**: access token 2h, refresh token 30d, reset 1h. Todo con expiración y revocación en `Token`/`PasswordReset`.
- **Autorización**: el rol y el dueño salen del token verificado (`x-role` validado contra el token). Los endpoints de lectura fuerzan los datos del usuario autenticado (SUPER_ADMIN puede leer a cualquiera; los demás solo sus propios datos).

### Credenciales demo

```
super_admin@nutriflow.com / password123   (SUPER_ADMIN)
vendedor@nutriflow.com    / 123456        (VENDEDOR)
usuario@nutriflow.com     / password123   (USUARIO)
orientador@nutriflow.com  / orientador1   (ORIENTADOR)
quiosk@nutriflow.com      / kiosk123      (QUIOSK)
```

### Datos

```
GET    /api/meals?userId=…     → Listar comidas (solo las del token; admin puede ver cualquiera)
POST   /api/meals              → Crear comida (Body: { userId, type, scheduledAt?, calories?, proteinG, carbsG, fatG })
DELETE /api/meals/:id          → Eliminar comida (dueño o admin)
GET    /api/user/profile       → Perfil del usuario del token (o ?userId=… para admin)
PATCH  /api/user/profile       → Actualizar perfil (acepta name y metas: targetCalories, targetProtein…)
```

---

## 🎨 DESIGN SYSTEM v3.0

### Color Tokens, Tipografía, Radios y Curvas

```css
:root {
  --bg:#fbfaf7;     --surface:#ffffff;    --surface-2:#f1f5e9;  --surface-3:#e8efe0;
  --text:#12211a;    --text-2:#45564c;       --muted:#5f7167;
  --brand:#15803d;   --brand-vivid:#22c55e;  --brand-ink:#14532d;
}
```

### Keyframes Animaciones Sutiles

```
fade-in, bar-grow, card-hover, slide-in, pulse-sutle
```

### Toggle .mtoggle (FUNCTIONALIDAD PRINCIPAL)

```
📍 Posición: Fijo en topo-derecha
📍 Función: Activar/desactivar todas las animaciones
📍 Accesibilidad: respeta prefers-reduce-motion
📍 Estados: on / off (aria-pressed true/false)
```

---

## 🧪 TESTS

### Vitest (Unit Tests)

```
✅ 4 tests passing
- calcula IMC
- calcula metas  
- respeta mínimo calórico
- calcula racha

Comando: npx vitest run
```

---

## 🚀 DESARROLLO LOCAL

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar PostgreSQL (Docker gallant_kare ya corriendo)

# 3. Iniciar API
cd apps/api && node src/index.js   # Puerto 3001

# 4. Iniciar Web
cd apps/web && pnpm dev           # Puerto 3000
```

### URLs

```
🌐 Web:      http://localhost:3000
🌐 API:      http://localhost:3001/health
```

---

## 📱 1 ÁREA ESSENCIAL

### Landing Page Principal

```
✅ Toggle .mtoggle - arriba a la derecha (funcional)
✅ Design System v3.0 - tokens CSS aplicados
✅ Keyframes sutiles - animaciones ligeras
✅ prefers-reduce-motion - accesibilidad respetada
✅ Registro de comidas - conexión API
✅ Bienvenida al usuario - datos del perfil
```

---

## 🛠️ TECNOLOGY STACK ESSENTIAL

- **Frontend**: Next.js 15, React 19, CSS Custom Properties
- **Backend**: Express, Prisma ORM, PostgreSQL
- **Database**: PostgreSQL 16 (Docker singolo)
- **Testing**: Vitest (4 tests passing)
- **Design System**: Tokens CSS, Keyframes, toggle .mtoggle
- **Accessibility**: prefers-reduce-motion

---

## 💡 VALOR PRINCIPAL

**Ayudar a las personas a comer saludablemente** mediante:
1. Registro simple de comidas
2. Consciencia mediante el toggle de animaciones
3. Design system visual que guía el uso
4. Accesibilidad para sensibilidad a movimiento

---

## 📞 SOPORTE

- **API**: `http://localhost:3001/health`
- **Web**: `http://localhost:3000`
- **Seed data**: 15 alimentos básicos en la base de datos

---

**Desarrollado con ❤️ para ayudar a las personas a comer saludablemente**
**NutriFlow v3.0 - Essential Version**