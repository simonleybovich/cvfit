/**
 * Best-effort client IP extraction from proxy headers. `Request` in Next.js
 * route handlers has no built-in `.ip` field, so this reads the headers a
 * reverse proxy (Dokploy/Traefik, etc.) is expected to set. Falls back to a
 * shared bucket when nothing is present (e.g. local dev without a proxy) so
 * rate limiting degrades gracefully instead of throwing.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
