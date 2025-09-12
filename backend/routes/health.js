import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    status: 'OK',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
    }
  };

  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.message = 'API is unhealthy';
    healthCheck.status = 'ERROR';
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
});

// Detailed health check
router.get('/detailed', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: 'healthy',
        uptime: process.uptime()
      },
      database: {
        status: 'healthy', // This would check actual DB connection
        connection: 'file-based'
      },
      memory: {
        status: process.memoryUsage().heapUsed < 100 * 1024 * 1024 ? 'healthy' : 'warning',
        usage: process.memoryUsage()
      }
    }
  });
});

export default router;
