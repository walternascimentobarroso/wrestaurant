const SESSION_KEY = "restaurant-admin-session";
const SESSION_EVENT = "restaurant-admin-session-change";

const DEFAULT_ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "admin123";

export function getAdminPassword(): string {
  return DEFAULT_ADMIN_PASSWORD;
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
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function getAdminAuthSnapshot(): boolean {
  return isAdminAuthenticated();
}

export function loginAdmin(password: string): boolean {
  if (password !== getAdminPassword()) {
    return false;
  }

  sessionStorage.setItem(SESSION_KEY, "authenticated");
  window.dispatchEvent(new Event(SESSION_EVENT));
  return true;
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}
