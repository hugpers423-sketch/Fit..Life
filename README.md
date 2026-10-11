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

### Enfoque: Registro de Comidas

```
GET    /health                    → Estado del servidor
POST   /api/users                 → Crear usuario
GET    /api/meals?userId=1        → Listar comidas del usuario
POST   /api/meals                 → Crear comida
       Body: { userId, type, scheduledAt?, calories?, proteinG, carbsG, fatG }
DELETE /api/meals/:id             → Eliminar comida

Example:
POST /api/meals
{
  "userId": "1",
  "type": "Desayuno",
  "calories": 450,
  "proteinG": 20,
  "carbsG": 50,
  "fatG": 15
}
```

### Login Simple

```
POST /api/auth/login
Body: { email, password }
Credenciales: admin@nutriflow.com / password123
Response: { token, user }
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