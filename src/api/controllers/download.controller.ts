import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { getGeneratedPackagePath, generatedPackageExists, deleteGeneratedPackage, deleteUploadedFile } from '../../utils/file-storage';

/**
 * Download controller - handles MCP server package downloads
 */

export async function downloadPackage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Package ID is required',
      });
      return;
    }

    // Check if package exists
    const packageExists = await generatedPackageExists(id);
    if (!packageExists) {
      res.status(404).json({
        status: 'error',
        message: `Package not found: ${id}`,
      });
      return;
    }

    // Get the package directory
    const packageDir = getGeneratedPackagePath(id);
    
    // Find the ZIP file in the package directory
    const files = await fs.readdir(packageDir);
    const zipFile = files.find(f => f.endsWith('.zip'));
    
    if (!zipFile) {
      res.status(404).json({
        status: 'error',
        message: 'ZIP file not found',
      });
      return;
    }
    
    const zipPath = path.join(packageDir, zipFile);

    try {
      // Check if ZIP file exists
      await fs.access(zipPath);

      // Set headers for file download
      const packageName = `mcp-server-${id}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${packageName}"`);

      // Stream the file
      const fileStream = await fs.readFile(zipPath);
      res.send(fileStream);

      // Optional: Clean up files after download
      // Uncomment if you want to delete files immediately after download
      // setTimeout(async () => {
      //   await deleteGeneratedPackage(id);
      //   await deleteUploadedFile(id);
      // }, 1000);
    } catch (error) {
      res.status(404).json({
        status: 'error',
        message: 'ZIP file not found',
      });
    }
  } catch (error: any) {
    next(error);
  }
}

export async function getPackageStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Package ID is required',
      });
      return;
    }

    const packageExists = await generatedPackageExists(id);
    
    let zipExists = false;
    let zipPath = null;
    
    if (packageExists) {
      try {
        const packageDir = getGeneratedPackagePath(id);
        const files = await fs.readdir(packageDir);
        const zipFile = files.find(f => f.endsWith('.zip'));
        if (zipFile) {
          zipPath = path.join(packageDir, zipFile);
          await fs.access(zipPath);
          zipExists = true;
        }
      } catch {
        zipExists = false;
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        packageId: id,
        exists: packageExists,
        ready: zipExists,
        downloadUrl: zipExists ? `/api/download/${id}` : null,
      },
    });
  } catch (error: any) {
    next(error);
  }
}
