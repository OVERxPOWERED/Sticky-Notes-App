const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/health/detailed', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }[dbState] || 'unknown';

  const memoryUsage = process.memoryUsage();
  const memory = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100,
    arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024 * 100) / 100
  };

  const uptime = process.uptime();
  const uptimeFormatted = {
    seconds: Math.floor(uptime),
    minutes: Math.floor(uptime / 60),
    hours: Math.floor(uptime / 3600),
    days: Math.floor(uptime / 86400)
  };

  const checks = {
    database: {
      status: dbStatus,
      readyState: dbState
    },
    memory: {
      status: memory.heapUsed < 500 ? 'healthy' : memory.heapUsed < 1000 ? 'warning' : 'critical',
      usage: memory
    },
    uptime: {
      status: 'healthy',
      ...uptimeFormatted
    }
  };

  const overallStatus = checks.database.status === 'connected' && checks.memory.status !== 'critical' ? 'healthy' : 'degraded';

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks
  });
});

module.exports = router;