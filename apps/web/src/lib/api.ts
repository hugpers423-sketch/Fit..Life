// Cliente HTTP para la API Express local (apps/api, puerto 3001).
// Una sola fuente de verdad: toda la plataforma habla con la API.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

export type ApiProfile = {
  id: string;
  userId: string;
  birthDate: string | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: string | null;
  goal: string | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
};

export type ApiMeal = {
  id: string;
  userId: string;
  type: string;
  name: string | null;
  dishId: string | null;
  source: string | null;
  scheduledAt: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  createdAt: string;
};

export type ApiWorkout = {
  id: string;
  userId: string;
  type: string;
  date: string;
  durationMin: number | null;
  caloriesBurned: number | null;
  createdAt: string;
};

type AuthPayload = { token: string; refreshToken: string; user: ApiUser };

async function call<T>(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...((init?.headers || {}) as Record<string, string>),
  };
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const isAuthPath = path.startsWith("/api/auth/");
  let res = await call(path, init);
  // Sesión expirada: renovar con el refresh token y reintentar una vez.
  if (res.status === 401 && !isAuthPath && (await refreshApiToken())) {
    res = await call(path, init);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { error?: string }).error || `API ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function loginApi(email: string, password: string): Promise<ApiUser> {
  const data = await req<AuthPayload>(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  persistSession(data);
  return data.user;
}

export async function registerApi(email: string, name: string, password: string): Promise<ApiUser> {
  const data = await req<AuthPayload>(`/api/auth/register`, {
    method: "POST",
    body: JSON.stringify({ email, name, password }),
  });
  persistSession(data);
  return data.user;
}

export async function logoutApi(): Promise<void> {
  const token = storedToken();
  try {
    if (token) {
      await call(`/api/auth/logout`, { method: "POST" });
    }
  } catch {
    /* best effort: la sesión se limpia igual */
  }
  clearSession();
}

/** Renueva el access token con el refresh guardado. Devuelve true si pudo. */
export async function refreshApiToken(): Promise<boolean> {
  const refresh = storedRefresh();
  if (!refresh) return false;
  try {
    const data = await req<AuthPayload>(`/api/auth/refresh`, {
      method: "POST",
      body: JSON.stringify({ refreshToken: refresh }),
    });
    persistSession(data);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const t = storedToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  const u = storedUser();
  if (u) h["x-role"] = u.role;
  return h;
}

export const api = {
  users: () => req<ApiUser[]>(`/api/admin/users?role=SUPER_ADMIN`),
  profile: (userId: string) =>
    req<ApiProfile>(`/api/user/profile?userId=${encodeURIComponent(userId)}`),
  saveProfile: (data: Record<string, unknown>) =>
    req<ApiProfile>(`/api/user/profile`, { method: "PATCH", body: JSON.stringify(data) }),
  meals: (userId: string) =>
    req<ApiMeal[]>(`/api/meals?userId=${encodeURIComponent(userId)}`),
  addMeal: (data: Record<string, unknown>) =>
    req<ApiMeal>(`/api/meals`, { method: "POST", body: JSON.stringify(data) }),
  delMeal: (id: string) =>
    req<{ success: boolean }>(`/api/meals/${encodeURIComponent(id)}`, { method: "DELETE" }),
  workouts: (userId: string) =>
    req<ApiWorkout[]>(`/api/workouts?userId=${encodeURIComponent(userId)}`),
  addWorkout: (data: Record<string, unknown>) =>
    req<ApiWorkout>(`/api/workouts`, { method: "POST", body: JSON.stringify(data) }),
  delWorkout: (id: string) =>
    req<{ success: boolean }>(`/api/workouts/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

const KEY = "nf_userId";
const TKEY = "nf_token";
const RKEY = "nf_refresh";
const UKEY = "nf_user";

export function storedToken(): string | null {
  try {
    return localStorage.getItem(TKEY);
  } catch {
    return null;
  }
}

export function storedRefresh(): string | null {
  try {
    return localStorage.getItem(RKEY);
  } catch {
    return null;
  }
}

export function storedUser(): ApiUser | null {
  try {
    const raw = localStorage.getItem(UKEY);
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function storedUserId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function persistSession(data: AuthPayload) {
  try {
    localStorage.setItem(TKEY, data.token);
    localStorage.setItem(RKEY, data.refreshToken);
    localStorage.setItem(UKEY, JSON.stringify(data.user));
    localStorage.setItem(KEY, data.user.id);
  } catch {
    /* sin almacenamiento */
  }
}

export function storeToken(t: string) {
  try {
    localStorage.setItem(TKEY, t);
  } catch {
    /* sin almacenamiento */
  }
}

export function storeUser(u: ApiUser) {
  try {
    localStorage.setItem(UKEY, JSON.stringify(u));
    localStorage.setItem(KEY, u.id);
  } catch {
    /* sin almacenamiento */
  }
}

export function storeUserId(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* sin almacenamiento: se usa el valor en memoria */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TKEY);
    localStorage.removeItem(RKEY);
    localStorage.removeItem(UKEY);
    localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
}