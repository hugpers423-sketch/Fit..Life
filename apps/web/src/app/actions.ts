'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, hasSupabase } from '@/lib/supabase/server';
import { calcularMetas, hoyISO, type Actividad, type Objetivo, type Sexo } from '@/lib/nutrition';

const txt = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const num = (f: FormData, k: string) => Number(String(f.get(k) ?? '').replace(',', '.'));
const err = (ruta: string, msg: string): never => redirect(`${ruta}?error=${encodeURIComponent(msg)}`);

async function usuario() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/ingresar');
  return { supabase, user: data.user! };
}

export async function ingresar(f: FormData) {
  if (!hasSupabase()) err('/ingresar', 'Falta configurar Supabase (.env.local).');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: txt(f, 'email'), password: txt(f, 'password') });
  if (error) err('/ingresar', 'Correo o contraseña incorrectos.');
  redirect('/dashboard');
}

export async function registrar(f: FormData) {
  if (!hasSupabase()) err('/registro', 'Falta configurar Supabase (.env.local).');
  const password = txt(f, 'password');
  if (password.length < 8) err('/registro', 'La contraseña debe tener al menos 8 caracteres.');
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: txt(f, 'email'), password });
  if (error) err('/registro', error.message);
  if (!data?.session) err('/ingresar', 'Revisa tu correo para confirmar tu cuenta y luego ingresa.');
  redirect('/onboarding');
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function guardarPerfil(f: FormData) {
  const { supabase, user } = await usuario();
  const d = {
    sexo: txt(f, 'sexo') as Sexo,
    edad: num(f, 'edad'),
    alturaCm: num(f, 'altura'),
    pesoKg: num(f, 'peso'),
    actividad: txt(f, 'actividad') as Actividad,
    objetivo: txt(f, 'objetivo') as Objetivo,
  };
  const nombre = txt(f, 'nombre');
  if (!nombre || !['m', 'f'].includes(d.sexo) || !(d.edad >= 14 && d.edad <= 100) ||
      !(d.alturaCm >= 100 && d.alturaCm <= 230) || !(d.pesoKg >= 30 && d.pesoKg <= 300)) {
    err('/onboarding', 'Revisa tus datos: nombre, sexo, edad (14-100), altura (100-230 cm) y peso (30-300 kg).');
  }
  const m = calcularMetas(d);
  const objetivoKg = num(f, 'peso_objetivo');
  const { error } = await supabase.from('profiles').upsert({
    id: user.id, nombre, sexo: d.sexo, edad: d.edad, altura_cm: d.alturaCm, peso_kg: d.pesoKg,
    peso_objetivo_kg: objetivoKg > 0 ? objetivoKg : null, actividad: d.actividad, objetivo: d.objetivo,
    kcal_meta: m.kcal, prot_meta: m.proteinaG, carb_meta: m.carbsG, grasa_meta: m.grasaG,
  });
  if (error) err('/onboarding', 'No se pudo guardar tu perfil.');
  await supabase.from('weight_logs').upsert({ user_id: user.id, fecha: hoyISO(), peso_kg: d.pesoKg }, { onConflict: 'user_id,fecha' });
  redirect('/dashboard');
}

export async function agregarComida(f: FormData) {
  const { supabase, user } = await usuario();
  const nombre = txt(f, 'nombre');
  const kcal = Math.round(num(f, 'kcal'));
  if (!nombre || !(kcal >= 0 && kcal <= 5000)) err('/comidas', 'Indica el nombre y las calorías (0-5000).');
  const { error } = await supabase.from('meal_logs').insert({
    user_id: user.id, fecha: hoyISO(), tipo: txt(f, 'tipo'), nombre, kcal,
    proteina_g: num(f, 'proteina') || 0, carbs_g: num(f, 'carbs') || 0, grasa_g: num(f, 'grasa') || 0,
  });
  if (error) err('/comidas', 'No se pudo registrar la comida.');
  revalidatePath('/dashboard');
  redirect('/comidas');
}

export async function borrarComida(f: FormData) {
  const { supabase, user } = await usuario();
  await supabase.from('meal_logs').delete().eq('id', txt(f, 'id')).eq('user_id', user.id);
  revalidatePath('/comidas');
  revalidatePath('/dashboard');
}

export async function agregarEntreno(f: FormData) {
  const { supabase, user } = await usuario();
  const nombre = txt(f, 'nombre');
  const minutos = Math.round(num(f, 'minutos'));
  if (!nombre || !(minutos > 0 && minutos <= 600)) err('/entrenos', 'Indica el nombre y los minutos (1-600).');
  const { error } = await supabase.from('workout_logs').insert({
    user_id: user.id, fecha: txt(f, 'fecha') || hoyISO(), nombre, minutos,
    kcal_quemadas: Math.max(0, Math.round(num(f, 'kcal')) || 0),
  });
  if (error) err('/entrenos', 'No se pudo registrar el entrenamiento.');
  revalidatePath('/dashboard');
  redirect('/entrenos');
}

export async function registrarPeso(f: FormData) {
  const { supabase, user } = await usuario();
  const peso = num(f, 'peso');
  if (!(peso >= 30 && peso <= 300)) err('/dashboard', 'Peso inválido.');
  await supabase.from('weight_logs').upsert({ user_id: user.id, fecha: hoyISO(), peso_kg: peso }, { onConflict: 'user_id,fecha' });
  await supabase.from('profiles').update({ peso_kg: peso }).eq('id', user.id);
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
