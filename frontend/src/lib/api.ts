const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const AUTH_TOKEN_KEY = "restaurant-api-auth-token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  }
  window.dispatchEvent(new Event("restaurant-api-auth-change"));
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string | { msg: string }[] };
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
        detail = body.detail[0].msg;
      }
    } catch {
      // keep default detail
    }
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getApiHealth(): Promise<{ status: string } | null> {
  try {
    return await apiFetch<{ status: string }>("/health");
  } catch {
    return null;
  }
}

export async function loginAdmin(password: string): Promise<boolean> {
  try {
    const result = await apiFetch<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    setAuthToken(result.access_token);
    return true;
  } catch {
    return false;
  }
}

export async function logoutAdminApi(): Promise<void> {
  setAuthToken(null);
}

export async function checkAdminAuth(): Promise<boolean> {
  if (!getAuthToken()) {
    return false;
  }
  try {
    await apiFetch<{ authenticated: boolean }>("/auth/me");
    return true;
  } catch {
    setAuthToken(null);
    return false;
  }
}
