import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getTempDir, getUploadsDir, getGeneratedDir, validatePath, sanitizeFilename } from './path-utils';
import type { FileMetadata, GeneratedPackageMetadata } from '../types/storage';

/**
 * File storage utilities for managing uploaded files and generated packages
 */

// Ensure directories exist
async function ensureDirectories(): Promise<void> {
  const dirs = [getTempDir(), getUploadsDir(), getGeneratedDir()];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's okay
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

/**
 * Save uploaded file to temp storage
 */
export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<FileMetadata> {
  await ensureDirectories();
  
  const id = uuidv4();
  const sanitized = sanitizeFilename(originalFilename);
  const extension = path.extname(sanitized) || '.json';
  const filename = `${id}${extension}`;
  const filePath = path.join(getUploadsDir(), filename);
  
  // Validate path
  if (!validatePath(filePath, getUploadsDir())) {
    throw new Error('Invalid file path');
  }
  
  // Save file
  await fs.writeFile(filePath, fileBuffer);
  
  const stats = await fs.stat(filePath);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
  
  return {
    id,
    filename,
    originalName: originalFilename,
    path: filePath,
    size: stats.size,
    uploadedAt: new Date(),
    expiresAt,
  };
}

/**
 * Read uploaded file
 */
export async function readUploadedFile(id: string): Promise<Buffer> {
  const uploadsDir = getUploadsDir();
  const files = await fs.readdir(uploadsDir);
  
  // Find file with matching ID (filename starts with ID)
  const file = files.find(f => f.startsWith(id));
  if (!file) {
    throw new Error(`File not found: ${id}`);
  }
  
  const filePath = path.join(uploadsDir, file);
  
  // Validate path
  if (!validatePath(filePath, uploadsDir)) {
    throw new Error('Invalid file path');
  }
  
  return await fs.readFile(filePath);
}

/**
 * Get uploaded file metadata
 */
export async function getUploadedFileMetadata(id: string): Promise<FileMetadata | null> {
  try {
    const uploadsDir = getUploadsDir();
    const files = await fs.readdir(uploadsDir);
    const file = files.find(f => f.startsWith(id));
    
    if (!file) {
      return null;
    }
    
    const filePath = path.join(uploadsDir, file);
    const stats = await fs.stat(filePath);
    
    return {
      id,
      filename: file,
      originalName: file,
      path: filePath,
      size: stats.size,
      uploadedAt: stats.birthtime,
      expiresAt: new Date(stats.birthtime.getTime() + 60 * 60 * 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Delete uploaded file
 */
export async function deleteUploadedFile(id: string): Promise<void> {
  const uploadsDir = getUploadsDir();
  const files = await fs.readdir(uploadsDir);
  const file = files.find(f => f.startsWith(id));
  
  if (file) {
    const filePath = path.join(uploadsDir, file);
    if (validatePath(filePath, uploadsDir)) {
      await fs.unlink(filePath).catch(() => {
        // File might not exist, ignore error
      });
    }
  }
}

/**
 * Create directory for generated package
 */
export async function createGeneratedPackageDir(id: string): Promise<string> {
  await ensureDirectories();
  
  const packageDir = path.join(getGeneratedDir(), id);
  await fs.mkdir(packageDir, { recursive: true });
  
  return packageDir;
}

/**
 * Save generated package metadata
 */
export async function saveGeneratedPackageMetadata(
  id: string,
  uploadId: string,
  packagePath: string,
  zipPath: string
): Promise<GeneratedPackageMetadata> {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
  
  return {
    id,
    uploadId,
    packagePath,
    zipPath,
    createdAt: new Date(),
    expiresAt,
  };
}

/**
 * Get generated package directory path
 */
export function getGeneratedPackagePath(id: string): string {
  return path.join(getGeneratedDir(), id);
}

/**
 * Check if generated package exists
 */
export async function generatedPackageExists(id: string): Promise<boolean> {
  try {
    const packagePath = getGeneratedPackagePath(id);
    await fs.access(packagePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete generated package (directory and zip)
 */
export async function deleteGeneratedPackage(id: string): Promise<void> {
  const packagePath = getGeneratedPackagePath(id);
  const zipPath = `${packagePath}.zip`;
  
  try {
    // Delete directory
    await fs.rm(packagePath, { recursive: true, force: true });
    // Delete zip file if exists
    await fs.unlink(zipPath).catch(() => {
      // Zip might not exist, ignore error
    });
  } catch (error) {
    // Package might not exist, ignore error
    console.warn(`Failed to delete package ${id}:`, error);
  }
}

/**
 * Initialize storage (create directories)
 */
export async function initializeStorage(): Promise<void> {
  await ensureDirectories();
  console.log('✅ Storage initialized');
}
