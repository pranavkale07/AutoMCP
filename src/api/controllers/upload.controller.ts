import { Request, Response, NextFunction } from 'express';
import { saveUploadedFile } from '../../utils/file-storage';
import { parseOpenAPI } from '../../parsers/openapi-parser';
import { transformAPI } from '../../transformers/api-transformer';

/**
 * Upload controller - handles OpenAPI file uploads
 */

export async function uploadFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        status: 'error',
        message: 'No file uploaded',
      });
      return;
    }

    // Save uploaded file
    const fileMetadata = await saveUploadedFile(
      req.file.buffer,
      req.file.originalname
    );

    // Parse and validate OpenAPI file
    let parsedAPI;
    try {
      const content = req.file.buffer.toString('utf-8');
      parsedAPI = await parseOpenAPI(content);
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: `Failed to parse OpenAPI file: ${error.message}`,
      });
      return;
    }

    // Transform API data
    const transformedAPI = transformAPI(parsedAPI);

    res.status(200).json({
      status: 'success',
      data: {
        fileId: fileMetadata.id,
        filename: fileMetadata.originalName,
        api: {
          title: transformedAPI.info.title,
          version: transformedAPI.info.version,
          baseUrl: transformedAPI.baseUrl,
          endpointsCount: transformedAPI.endpoints.length,
          authSchemes: transformedAPI.authSchemes.length,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
}
