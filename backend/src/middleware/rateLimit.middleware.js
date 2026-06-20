// Lightweight in-memory fixed-window rate limiter (no external deps).
// Suitable for a single VPS instance. If you later run multiple backend
// instances, move this to a shared store (e.g. Redis) so limits are global.

export function rateLimit({ windowMs = 60_000, max = 15, key } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  // Periodically drop expired buckets so the map doesn't grow forever.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) {
      if (v.resetAt <= now) hits.delete(k);
    }
  }, windowMs);
  if (sweeper.unref) sweeper.unref();

  return function rateLimiter(req, res, next) {
    const id = (key ? key(req) : req.profile?.id) || req.ip || 'anon';
    const now = Date.now();
    const entry = hits.get(id);

    if (!entry || entry.resetAt <= now) {
      hits.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: `Too many requests. Please wait ${retryAfter}s before asking again.`
      });
    }

    entry.count += 1;
    return next();
  };
}
