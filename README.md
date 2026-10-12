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
POST /api/auth/forgot-password → Solicitar reset. Sin SMTP devuelve { ok, resetToken, expiresInMinutes } para que la app complete el flujo; con SMTP enviar por correo y devolver solo { ok: true }
POST /api/auth/reset-password  → Confirmar reset con token (revoca sesiones)
POST /api/users                → Crear usuario (SOLO SUPER_ADMIN, con password opcional)
GET  /api/clients              → Listar clientes (solo rol USUARIO, campos limitados). Acceso: SUPER_ADMIN, ORIENTADOR, VENDEDOR
GET  /api/admin/users          → Listar TODOS los usuarios (SOLO SUPER_ADMIN)
```

- **Hash de contraseñas**: `crypto.scryptSync` nativo (cero dependencias), formato `scrypt$N$r$p$salt$hash`.
- **Sesiones**: access token 2h, refresh token 30d, reset 1h. Todo con expiración y revocación en `Token`/`PasswordReset`.
- **Autorización**: el rol y el dueño salen del token verificado (`x-role` validado contra el token). Los endpoints de lectura fuerzan los datos del usuario autenticado (SUPER_ADMIN puede leer a cualquiera; los demás solo sus propios datos).

### Auth en apps móviles (Sprint 2)

- **apps/usuario** (`apps/usuario/App.js`): registro con contraseña (rol USUARIO), recuperación (código + nueva contraseña) y botón **Salir** que revoca la sesión vía `/api/auth/logout`.
- **apps/professional**, **apps/servicio**, **apps/mobile** (personal: ORIENTADOR, VENDEDOR, SUPER_ADMIN): recuperación de contraseña + **Salir**. El alta de estos roles la hace el Admin General vía `/api/users` (el registro público solo crea USUARIO).
- El flujo de recuperación no necesita correo: `forgot-password` entrega el `resetToken` en la respuesta y la app pide definir la nueva contraseña. En producción, con SMTP, devolver solo `{ ok: true }` y enviar el enlace por email.

### Sesión persistente en apps móviles (Sprint 3)

- Las 4 apps (`usuario`, `professional`, `servicio`, `mobile`) guardan la sesión (access + refresh + usuario) en el dispositivo y la restauran al abrir: usan `@react-native-async-storage/async-storage` en nativo y caen a `localStorage` en web.
- La persistencia es tolerante a fallos: el `require` de AsyncStorage va en `try/catch`, así que si el módulo no está instalado la app sigue funcionando (en memoria/web) y **no** se rompe al arrancar.
- **Refresh automático**: si una llamada autenticada responde `401`, el cliente llama a `/api/auth/refresh` con el refresh token, renueva el access token, lo vuelve a persistir y reintenta la petición **una vez**. Si el refresh también falla, se limpia la sesión y se vuelve al login.
- Al iniciar sesión/registrarse se persiste la sesión (`persistSession`) y el botón **Salir** la limpia (`clearSession`) además de revocar en el servidor.
- Las apps restauradoras validan el token guardado contra `/api/auth/me` antes de mostrar el contenido (en `mobile` el arranque espera a la restauración).
- **Solo un `401` real cierra la sesión**: el error de cada llamada lleva su `status` HTTP y el cliente cierra sesión únicamente ante `401`. Un `500` (p. ej. `"No se pudo validar la sesión"` por la BD) o un fallo de red **no** desloguean: se muestra el error y se conserva la sesión.
- Si se agrega una app nueva: declarar `@react-native-async-storage/async-storage` y ejecutar `pnpm install` para habilitar la persistencia en nativo.

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