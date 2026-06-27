"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getAdminAuthServerSnapshot,
  getAdminAuthSnapshot,
  loginAdmin,
  logoutAdmin,
  subscribeAdminAuth,
} from "../services/adminAuth";

export function useAdminAuth() {
  const isAuthenticated = useSyncExternalStore(
    subscribeAdminAuth,
    getAdminAuthSnapshot,
    getAdminAuthServerSnapshot,
  );

  const login = useCallback((password: string) => loginAdmin(password), []);

  const logout = useCallback(() => logoutAdmin(), []);

  return { isAuthenticated, login, logout };
}
