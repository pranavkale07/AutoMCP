import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import routes from './api/routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { initializeStorage } from './utils/file-storage';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize storage
initializeStorage().catch(console.error);

// API Routes
app.use('/api', routes);

// Root route - serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
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
