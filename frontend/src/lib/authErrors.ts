export const SESSION_EXPIRED_MESSAGE =
  "Sessão expirada — faça login novamente.";

export function isAuthApiError(status: number): boolean {
  return status === 401;
}

export function formatAuthSyncError(message: string): string {
  if (/token inválido|não autenticado/i.test(message)) {
    return SESSION_EXPIRED_MESSAGE;
  }
  return message;
}

export function isSessionExpiredError(message?: string): boolean {
  if (!message) {
    return false;
  }
  return /token inválido|não autenticado|sessão expirada/i.test(message);
}
