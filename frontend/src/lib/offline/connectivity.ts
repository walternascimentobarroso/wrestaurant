import { getApiHealth } from "@/lib/api";

type Listener = () => void;

let online = true;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function readNavigatorOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine;
}

export function isOnline(): boolean {
  return readNavigatorOnline();
}

export function subscribeConnectivity(listener: Listener): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  online = readNavigatorOnline();
  listeners.add(listener);

  const handleOnline = (): void => {
    online = true;
    emit();
  };

  const handleOffline = (): void => {
    online = false;
    emit();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

export function getConnectivitySnapshot(): boolean {
  return online;
}

export function getConnectivityServerSnapshot(): boolean {
  return true;
}

export async function checkApiHealth(): Promise<boolean> {
  const health = await getApiHealth();
  return health?.status === "ok";
}
