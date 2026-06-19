/**
 * Rate limiter en memoria — suficiente para un despliegue de instancia única.
 * Para producción multi-instancia se reemplaza por Redis.
 */

interface Bucket {
  count:   number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Limpiar entradas expiradas cada 10 minutos para no acumular memoria
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (now > bucket.resetAt) store.delete(key);
  }
}, 10 * 60 * 1000);

/**
 * Verifica si la clave (IP + acción) está dentro del límite permitido.
 * @returns true si se permite la solicitud, false si se debe rechazar
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now    = Date.now();
  const bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) return false;

  bucket.count++;
  return true;
}

/** Extrae la IP del cliente desde los headers de Next.js */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
