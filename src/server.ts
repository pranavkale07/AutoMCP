import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env';
import routes from './api/routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { initializeStorage } from './utils/file-storage';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize storage
initializeStorage().catch(console.error);

// Routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'AutoMCP API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      upload: 'POST /api/upload',
      generate: 'POST /api/generate',
      download: 'GET /api/download/:id',
      status: 'GET /api/status/:id',
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
});

export default app;
