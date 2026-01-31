import { Router } from 'express';
import { upload } from '../middleware/upload';
import { uploadFile } from './controllers/upload.controller';
import { generateMCPServer } from './controllers/generate.controller';
import { downloadPackage, getPackageStatus } from './controllers/download.controller';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Upload OpenAPI file
 * POST /upload
 */
router.post('/upload', upload.single('file'), uploadFile);

/**
 * Generate MCP server from uploaded file
 * POST /generate
 */
router.post('/generate', generateMCPServer);

/**
 * Download generated MCP server package
 * GET /download/:id
 */
router.get('/download/:id', downloadPackage);

/**
 * Get package generation status
 * GET /status/:id
 */
router.get('/status/:id', getPackageStatus);

export default router;
