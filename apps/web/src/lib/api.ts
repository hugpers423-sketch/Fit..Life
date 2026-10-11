// Cliente HTTP para la API Express local (apps/api, puerto 3001).
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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...((init?.headers || {}) as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function loginApi(email: string, password: string): Promise<ApiUser> {
  const data = await req<{ token: string; user: ApiUser }>(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  storeToken(data.token);
  storeUser(data.user);
  return data.user;
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
const UKEY = "nf_user";

export function storedToken(): string | null {
  try {
    return localStorage.getItem(TKEY);
  } catch {
    return null;
  }
}

export function storeToken(t: string) {
  try {
    localStorage.setItem(TKEY, t);
  } catch {
    /* sin almacenamiento */
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

export function storeUser(u: ApiUser) {
  try {
    localStorage.setItem(UKEY, JSON.stringify(u));
    localStorage.setItem(KEY, u.id);
  } catch {
    /* sin almacenamiento */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TKEY);
    localStorage.removeItem(UKEY);
    localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
}

export function storedUserId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function storeUserId(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* sin almacenamiento: se usa el valor en memoria */
  }
}
