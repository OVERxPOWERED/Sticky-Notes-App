class Cache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTtl = options.defaultTtl || 30000;
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
    this.accessOrder = new Map();
    this.accessCounter = 0;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.expiry && entry.expiry < Date.now()) {
      this.store.delete(key);
      this.accessOrder.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    this.accessCounter++;
    this.accessOrder.set(key, this.accessCounter);
    return entry.value;
  }

  set(key, value, ttl = this.defaultTtl) {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    const expiry = ttl > 0 ? Date.now() + ttl : null;
    this.store.set(key, { value, expiry });
    this.accessCounter++;
    this.accessOrder.set(key, this.accessCounter);
  }

  invalidate(pattern) {
    const regex = new RegExp(pattern);
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        this.accessOrder.delete(key);
        count++;
      }
    }
    return count;
  }

  clear() {
    this.store.clear();
    this.accessOrder.clear();
    this.hits = 0;
    this.misses = 0;
    this.accessCounter = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  evictLRU() {
    let oldestKey = null;
    let oldestAccess = Infinity;

    for (const [key, access] of this.accessOrder.entries()) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.store.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }
}

const globalCache = new Cache();

function cacheMiddleware(ttlMs = 30000) {
  return (req, res, next) => {
    if (!req.app.locals.cache) {
      req.app.locals.cache = globalCache;
    }

    const cacheKey = `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;

    if (req.method === 'GET') {
      const cached = globalCache.get(cacheKey);
      if (cached !== undefined) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (req.method === 'GET') {
          globalCache.set(cacheKey, body, ttlMs);
        } else if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
          globalCache.invalidate('/api/notes');
        }
      }
      return originalJson(body);
    };

    next();
  };
}

function invalidateCache(pattern) {
  return globalCache.invalidate(pattern);
}

function clearCache() {
  globalCache.clear();
}

function getCacheStats() {
  return globalCache.getStats();
}

module.exports = {
  Cache,
  cacheMiddleware,
  invalidateCache,
  clearCache,
  getCacheStats
};