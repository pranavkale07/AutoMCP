/**
 * Storage-related types
 */

export interface StoragePaths {
  uploads: string;
  generated: string;
  temp: string;
}

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  uploadedAt: Date;
  expiresAt: Date;
}

export interface GeneratedPackageMetadata {
  id: string;
  uploadId: string;
  packagePath: string;
  zipPath: string;
  createdAt: Date;
  expiresAt: Date;
}
