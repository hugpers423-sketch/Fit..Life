# NutriFlow — Web (Admin + usuario)

App **Next.js 15** (App Router) de la plataforma NutriFlow. Habla con la API central
(`apps/api`, Express + Prisma): ya **no** usa Supabase.

## Puesta en marcha

1. Desde la raíz del repo: `pnpm install`.
2. (Opcional) Crea `apps/web/.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:3001`
   (por defecto apunta a `http://localhost:3001`).
3. `cd apps/web && pnpm dev` → http://localhost:3000

> Requiere la API levantada (`apps/api`, puerto 3001). Ver el README raíz.

## Scripts

- `pnpm dev` — servidor de desarrollo (3000)
- `pnpm build` / `pnpm start` — build y producción
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — pruebas (vitest)

## Auth

La sesión se gestiona con la API: `POST /api/auth/login` devuelve access + refresh
token; el cliente (`src/lib/api.ts`) guarda la sesión en `localStorage` y renueva el
access token automáticamente ante un `401` con `POST /api/auth/refresh`.
