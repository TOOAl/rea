/**
 * 환경변수 치환: "${ENV:MY_KEY}" → process.env.MY_KEY
 * "${ENV:MY_KEY:-default}" → env 없으면 default
 */
export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{ENV:([^}:]+)(?::-(.*?))?\}/g, (_m, key: string, fallback: string | undefined) => {
    return process.env[key] ?? fallback ?? "";
  });
}

export function resolveEnvInObject<T>(obj: T): T {
  if (typeof obj === "string") return resolveEnvVars(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(resolveEnvInObject) as unknown as T;
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = resolveEnvInObject(v);
    }
    return out as T;
  }
  return obj;
}
