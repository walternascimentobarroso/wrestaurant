"use client";

import { useEffect, type ReactNode } from "react";

import { initSync } from "../services/syncService";
import { SyncStatusBadge } from "./SyncStatusBadge";

export function SyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    return initSync();
  }, []);

  return (
    <>
      {children}
      <SyncStatusBadge />
    </>
  );
}
