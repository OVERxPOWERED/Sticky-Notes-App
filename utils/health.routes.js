import express from 'express';
import mongoose from 'mongoose';
import { getCacheStats, isCacheHealthy } from '../middleware/cache.middleware.js';

const router = express.Router();

const DB_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized'
};

const formatMemoryUsage = (usage) => ({
  rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
  heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
  heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
  external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
  arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100
});

const formatUptime = (uptime) => ({
  seconds: Math.floor(uptime),
  minutes: Math.floor(uptime / 60),
  hours: Math.floor(uptime / 3600),
  days: Math.floor(uptime / 86400)
});

const getMemoryStatus = (heapUsedMB) => {
  if (heapUsedMB < 500) return 'healthy';
  if (heapUsedMB < 1000) return 'warning';
  return 'critical';
};

const getCacheStatus = (stats) => {
  if (!stats) return 'unavailable';
  const hitRate = stats.hits / (stats.hits + stats.misses) || 0;
  if (hitRate > 0.8) return 'healthy';
  if (hitRate > 0.5) return 'warning';
  return 'degraded';
};

router.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/health/ready', async (req, res) => {
  const timestamp = new Date().toISOString();
  const checks = {};
  let overallReady = true;

  try {
    const dbPingPromise = mongoose.connection.db.admin().command({ ping: 1 });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DB ping timeout')), 5000)
    );
    
    await Promise.race([dbPingPromise, timeoutPromise]);
    checks.database = {
      status: 'connected',
      readyState: mongoose.connection.readyState,
      latency: null
    };
  } catch (error) {
    checks.database = {
      status: 'disconnected',
      readyState: mongoose.connection.readyState,
      error: error.message
    };
    overallReady = false;
  }

  try {
    const cacheHealthy = await isCacheHealthy();
    const cacheStats = getCacheStats();
    checks.cache = {
      status: cacheHealthy ? 'operational' : 'degraded',
      stats: cacheStats
    };
    if (!cacheHealthy) overallReady = false;
  } catch (error) {
    checks.cache = {
      status: 'error',
      error: error.message
    };
    overallReady = false;
  }

  const statusCode = overallReady ? 200 : 503;
  res.status(statusCode).json({
    status: overallReady ? 'ready' : 'not ready',
    timestamp,
    checks
  });
});

router.get('/health/details', async (req, res) => {
  const timestamp = new Date().toISOString();
  const memoryUsage = process.memoryUsage();
  const memory = formatMemoryUsage(memoryUsage);
  const uptime = formatUptime(process.uptime());
  const version = process.env.npm_package_version || process.env.APP_VERSION || 'unknown';
  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;

  let dbStatus = DB_STATES[mongoose.connection.readyState] || 'unknown';
  let dbLatency = null;
  let dbError = null;

  try {
    const start = Date.now();
    await mongoose.connection.db.admin().command({ ping: 1 });
    dbLatency = Date.now() - start;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
    dbError = error.message;
  }

  let cacheStats = null;
  let cacheStatus = 'unavailable';
  try {
    cacheStats = getCacheStats();
    cacheStatus = getCacheStatus(cacheStats);
  } catch (error) {
    cacheStatus = 'error';
  }

  const checks = {
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState,
      latency: dbLatency,
      error: dbError,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    },
    cache: {
      status: cacheStatus,
      stats: cacheStats
    },
    memory: {
      status: getMemoryStatus(memory.heapUsed),
      usage: memory
    },
    uptime: {
      status: 'healthy',
      ...uptime
    },
    runtime: {
      nodeVersion,
      platform,
      arch,
      pid: process.pid
    }
  };

  const criticalChecks = ['database', 'memory'];
  const degradedChecks = ['cache'];
  
  let overallStatus = 'healthy';
  if (checks.database.status !== 'connected') {
    overallStatus = 'unhealthy';
  } else if (checks.memory.status === 'critical') {
    overallStatus = 'critical';
  } else if (checks.cache.status === 'degraded' || checks.cache.status === 'error') {
    overallStatus = 'degraded';
  } else if (checks.memory.status === 'warning') {
    overallStatus = 'warning';
  }

  res.json({
    status: overallStatus,
    timestamp,
    version,
    checks
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || process.env.APP_VERSION || 'unknown'
  });
});

export default router;