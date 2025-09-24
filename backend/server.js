import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import casesRouter from './routes/cases.js';
import healthRouter from './routes/health.js';
import statsRouter from './routes/stats.js';
import mlRouter from './routes/ml.js';
import clusteringRouter from './routes/clustering.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/cases', casesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/ml', mlRouter);
app.use('/api/clustering', clusteringRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MedPix API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      cases: '/api/cases',
      stats: '/api/stats',
      ml: '/api/ml',
      clustering: '/api/clustering'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'Something went wrong!',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MedPix API Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏥 Cases API: http://localhost:${PORT}/api/cases`);
  console.log(`📊 Stats API: http://localhost:${PORT}/api/stats`);
});

export default app;
