import crypto from 'crypto';
import { env } from '../../config/env.js';

const cache = new Map();

export function makeCacheKey({ userId, request, provider, model, promptVersion = 'v1', brandVersion = 'none' }) {
  const normalized = JSON.stringify({ userId, request, provider, model, promptVersion, brandVersion });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function cacheGet(key) {
  if (!env.CACHE_MAX_ITEMS || !env.CACHE_TTL_MS) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

export function cacheSet(key, data) {
  if (!env.CACHE_MAX_ITEMS || !env.CACHE_TTL_MS) return;
  while (cache.size >= env.CACHE_MAX_ITEMS) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { data, expiresAt: Date.now() + env.CACHE_TTL_MS });
}

export function cacheStats() {
  return { size: cache.size, maxItems: env.CACHE_MAX_ITEMS, ttlMs: env.CACHE_TTL_MS };
}
