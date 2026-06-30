import {
  checkAdminAuth,
  loginAdmin as loginAdminApi,
  logoutAdminApi,
} from "@/lib/api";

const SESSION_KEY = "restaurant-admin-session";
const SESSION_EVENT = "restaurant-admin-session-change";

export function getAdminPassword(): string {
  return process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "admin123";
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return sessionStorage.getItem(SESSION_KEY) === "authenticated";
}

export function getAdminAuthServerSnapshot(): boolean {
  return false;
}

export function subscribeAdminAuth(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener(SESSION_EVENT, handler);
  window.addEventListener("restaurant-api-auth-change", handler);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
    window.removeEventListener("restaurant-api-auth-change", handler);
  };
}

export function getAdminAuthSnapshot(): boolean {
  return isAdminAuthenticated();
}

export async function loginAdmin(password: string): Promise<boolean> {
  const ok = await loginAdminApi(password);
  if (!ok) {
    return false;
  }
  sessionStorage.setItem(SESSION_KEY, "authenticated");
  window.dispatchEvent(new Event(SESSION_EVENT));
  return true;
}

export function logoutAdmin(): void {
  void logoutAdminApi();
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export async function verifyAdminSession(): Promise<boolean> {
  const authenticated = await checkAdminAuth();
  if (!authenticated && isAdminAuthenticated()) {
    sessionStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
  }
  return authenticated;
}
