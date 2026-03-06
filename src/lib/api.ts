// src/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function apiFetch<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Typed API calls ──────────────────────────────────────────────────────────

export const api = {
  agents: {
    list:        (params?: Record<string, any>) =>
                   apiFetch(`/agents?${new URLSearchParams(params).toString()}`),
    get:         (id: string) => apiFetch(`/agents/${id}`),
    leaderboard: ()           => apiFetch("/agents/leaderboard"),
    categories:  ()           => apiFetch("/agents/categories"),
    my:          (token: string) => apiFetch("/agents/my", {}, token),
    prepare:     (body: any, token: string) =>
                   apiFetch("/agents/prepare", { method: "POST", body: JSON.stringify(body) }, token),
    feedbacks:   (id: string, params?: Record<string, any>) =>
                   apiFetch(`/agents/${id}/feedbacks?${new URLSearchParams(params).toString()}`),
    validations: (id: string) => apiFetch(`/agents/${id}/validations`),
  },

  analytics: {
    overview:       () => apiFetch("/analytics/overview"),
    daily:          (days?: number) => apiFetch(`/analytics/daily?days=${days ?? 30}`),
    recentPayments: (first?: number) => apiFetch(`/analytics/payments/recent?first=${first ?? 20}`),
    network:        () => apiFetch("/analytics/network"),
  },

  users: {
    nonce:  (address: string) => apiFetch(`/users/nonce?address=${address}`),
    verify: (message: string, signature: string) =>
              apiFetch("/users/verify", { method: "POST", body: JSON.stringify({ message, signature }) }),
    me:     (token: string) => apiFetch("/users/me", {}, token),
  },
};
