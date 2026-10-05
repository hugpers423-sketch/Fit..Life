# NutriFlow

Plataforma de nutrición y fitness (MVP de usuario): registro/ingreso, cálculo de IMC y metas, dashboard, comidas, entrenos, peso y racha.
Stack: Next.js 15 (App Router) + Supabase.

## Puesta en marcha
1. Crea un proyecto en https://supabase.com y ejecuta `supabase/migrations/0001_init.sql` en el SQL Editor.
2. `copy .env.example .env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. `npm install`
4. `npm test` (pruebas de cálculos) y `npm run dev` → http://localhost:3000

## Pendiente (siguientes fases)
Asistente de voz, escaneo de comida por foto, retos, panel de orientador, super admin, portal de negocios, gimnasios.
