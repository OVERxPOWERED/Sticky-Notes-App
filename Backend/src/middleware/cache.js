const { createClient } = require('redis');
const { config } = require('../config/env');

class InMemoryCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTtl = options.defaultTtl || config.cache.ttlMs;
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
      hitRate: total > 0 ? this.hits / total : 0,
      backend: 'memory'
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

  async disconnect() {
    // No-op for in-memory cache
  }
}

class RedisCache {
  constructor(options = {}) {
    this.client = options.client;
    this.defaultTtl = options.defaultTtl || config.cache.ttlMs;
    this.keyPrefix = options.keyPrefix || config.cache.keyPrefix;
    this.hits = 0;
    this.misses = 0;
    this.connected = false;
  }

  _prefixedKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  async connect() {
    if (!this.client) {
      throw new Error('Redis client not provided');
    }
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async get(key) {
    if (!this.connected) {
      await this.connect();
    }

    const prefixedKey = this._prefixedKey(key);
    const value = await this.client.get(prefixedKey);

    if (value === null) {
      this.misses++;
      return undefined;
    }

    this.hits++;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async set(key, value, ttl = this.defaultTtl) {
    if (!this.connected) {
      await this.connect();
    }

    const prefixedKey = this._prefixedKey(key);
    const serialized = JSON.stringify(value);
    const ttlSeconds = Math.ceil(ttl / 1000);

    if (ttl > 0) {
      await this.client.setEx(prefixedKey, ttlSeconds, serialized);
    } else {
      await this.client.set(prefixedKey, serialized);
    }
  }

  async invalidate(pattern) {
    if (!this.connected) {
      await this.connect();
    }

    const prefixedPattern = this._prefixedKey(pattern.replace('*', ''));
    const keys = await this.client.keys(`${prefixedPattern}*`);

    if (keys.length > 0) {
      await this.client.del(keys);
    }

    return keys.length;
  }

  async clear() {
    if (!this.connected) {
      await this.connect();
    }

    const keys = await this.client.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }

    this.hits = 0;
    this.misses = 0;
    return keys.length;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: -1, // Redis doesn't provide easy size without scanning
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      backend: 'redis',
      connected: this.connected
    };
  }

  async disconnect() {
    if (this.connected && this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

function createCacheBackend() {
  if (config.cache.useRedis && config.redis.url) {
    const redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis max retries reached, falling back to in-memory cache');
            return new Error('Max retries reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis cache error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('Redis cache connected');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis cache reconnecting...');
    });

    return new RedisCache({
      client: redisClient,
      defaultTtl: config.cache.ttlMs,
      keyPrefix: config.cache.keyPrefix
    });
  }

  return new InMemoryCache({
    maxSize: config.cache.maxSize,
    defaultTtl: config.cache.ttlMs
  });
}

const cache = createCacheBackend();

async function warmCache(noteService) {
  if (!config.cache.warmOnStartup) {
    return;
  }

  try {
    console.log('Starting cache warming...');

    const recentNotes = await noteService.getRecentNotes(config.cache.warmRecentCount || 50);
    for (const note of recentNotes) {
      const key = `note:${note.id}`;
      await cache.set(key, note, config.cache.ttlMs);
    }

    const pinnedNotes = await noteService.getPinnedNotes();
    for (const note of pinnedNotes) {
      const key = `note:${note.id}`;
      await cache.set(key, note, config.cache.ttlMs * 2);
    }

    console.log(`Cache warmed with ${recentNotes.length} recent and ${pinnedNotes.length} pinned notes`);
  } catch (error) {
    console.error('Cache warming failed:', error.message);
  }
}

function cacheMiddleware(ttlMs = config.cache.ttlMs) {
  return (req, res, next) => {
    req.app.locals.cache = cache;

    const cacheKey = `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;

    if (req.method === 'GET') {
      cache.get(cacheKey).then((cached) => {
        if (cached !== undefined) {
          res.set('X-Cache', 'HIT');
          return res.json(cached);
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (req.method === 'GET') {
              cache.set(cacheKey, body, ttlMs).catch((err) => {
                console.error('Cache set error:', err.message);
              });
            } else if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
              cache.invalidate('/api/notes').catch((err) => {
                console.error('Cache invalidate error:', err.message);
              });
            }
          }
          return originalJson(body);
        };

        next();
      }).catch((err) => {
        console.error('Cache get error:', err.message);
        next();
      });
    } else {
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
            cache.invalidate('/api/notes').catch((err) => {
              console.error('Cache invalidate error:', err.message);
            });
          }
        }
        return originalJson(body);
      };
      next();
    }
  };
}

async function invalidateCache(pattern) {
  return cache.invalidate(pattern);
}

async function clearCache() {
  return cache.clear();
}

function getCacheStats() {
  return cache.getStats();
}

async function disconnectCache() {
  await cache.disconnect();
}

module.exports = {
  InMemoryCache,
  RedisCache,
  cache,
  cacheMiddleware,
  invalidateCache,
  clearCache,
  getCacheStats,
  disconnectCache,
  warmCache
};