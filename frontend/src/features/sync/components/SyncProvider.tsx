"use client";

import { useEffect, type ReactNode } from "react";

import { initSync } from "../services/syncService";

export function SyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    return initSync();
  }, []);

  return children;
}
