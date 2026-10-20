const cache = new Map();

function cacheMiddleware(ttlMs = 30000) {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.originalUrl}:${JSON.stringify(req.query)}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data: body,
          expiry: Date.now() + ttlMs
        });
      }
      return originalJson(body);
    };

    next();
  };
}

function invalidateCache(pattern) {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

function clearCache() {
  cache.clear();
}

function getCacheStats() {
  const now = Date.now();
  let valid = 0;
  let expired = 0;
  
  for (const [, value] of cache.entries()) {
    if (value.expiry > now) {
      valid++;
    } else {
      expired++;
    }
  }
  
  return { size: cache.size, valid, expired };
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearCache,
  getCacheStats
};