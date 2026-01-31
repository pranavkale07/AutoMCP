                                                                                                                                                                                                          import path from 'path';
import { config } from '../config/env';

/**
 * Path validation and security utilities
 */

/**
 * Get base temp directory path
 */
export function getTempDir(): string {
  return path.join(process.cwd(), 'temp');
}

/**
 * Get uploads directory path
 */
export function getUploadsDir(): string {
  return path.join(getTempDir(), 'uploads');
}

/**
 * Get generated packages directory path
 */
export function getGeneratedDir(): string {
  return path.join(getTempDir(), 'generated');
}

/**
 * Validate file path to prevent directory traversal attacks
 */
export function validatePath(filePath: string, baseDir: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);
  
  // Ensure the resolved path is within the base directory
  return resolvedPath.startsWith(resolvedBase);
}

/**
 * Sanitize filename to prevent security issues
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * Check if file extension is allowed
 */
export function isAllowedExtension(ext: string): boolean {
  const allowed = ['.json', '.yaml', '.yml'];
  return allowed.includes(ext);
}
