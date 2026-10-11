"use client";
import { useEffect, useState } from "react";
import { api, storeUserId, storedUserId, type ApiUser } from "@/lib/api";

// Selector de usuario demo (API local sin sesión).
// Por defecto elige el primer USUARIO y lo guarda en localStorage.
export default function UserSwitcher({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [users, setUsers] = useState<ApiUser[]>([]);

  useEffect(() => {
    let alive = true;
    api
      .users()
      .then((list) => {
        if (!alive) return;
        setUsers(list);
        if (!value && list.length > 0) {
          const pref = list.find((u) => u.role === "USUARIO") || list[0];
          storeUserId(pref.id);
          onChange(pref.id);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const saved = storedUserId();
    if (saved && saved !== value) onChange(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (users.length === 0) return null;

  return (
    <label className="muted" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      Usuario:
      <select
        value={value}
        onChange={(e) => {
          storeUserId(e.target.value);
          onChange(e.target.value);
        }}
        style={{ width: "auto" }}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role})
          </option>
        ))}
      </select>
    </label>
  );
}
