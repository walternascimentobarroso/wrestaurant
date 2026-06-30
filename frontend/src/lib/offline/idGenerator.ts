const TEMP_ID_PREFIX = "tmp_";

export function generateMutationId(): string {
  return crypto.randomUUID();
}

export function generateTempId(): string {
  return `${TEMP_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isTempId(id: string | number): boolean {
  return String(id).startsWith(TEMP_ID_PREFIX);
}
