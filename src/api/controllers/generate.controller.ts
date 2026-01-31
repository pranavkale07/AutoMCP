import { Request, Response, NextFunction } from 'express';
import { readUploadedFile, createGeneratedPackageDir, saveGeneratedPackageMetadata, getGeneratedPackagePath } from '../../utils/file-storage';
import { parseOpenAPI } from '../../parsers/openapi-parser';
import { transformAPI } from '../../transformers/api-transformer';
import { createGeminiClient } from '../../gemini/gemini-client';
import { CodeGenerator } from '../../gemini/code-generator';
import { generateMCPServerPackage } from '../../generators/mcp-generator';

/**
 * Generate controller - generates MCP server from uploaded OpenAPI file
 */

export async function generateMCPServer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      res.status(400).json({
        status: 'error',
        message: 'fileId is required',
      });
      return;
    }

    // Read uploaded file
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readUploadedFile(fileId);
    } catch (error: any) {
      res.status(404).json({
        status: 'error',
        message: `File not found: ${fileId}`,
      });
      return;
    }

    // Parse OpenAPI
    const parsedAPI = await parseOpenAPI(fileBuffer);
    const transformedAPI = transformAPI(parsedAPI);

    // Initialize Gemini client and code generator
    let geminiClient;
    try {
      geminiClient = createGeminiClient();
      
      // Validate model before generation
      console.log(`🔍 Validating Gemini model: ${geminiClient.getModelName()}...`);
      const validation = await geminiClient.validateModel();
      if (!validation.valid) {
        console.log(`⚠️  Model ${geminiClient.getModelName()} not available, attempting auto-detection...`);
        try {
          await geminiClient.autoDetectModel();
          console.log(`✅ Switched to model: ${geminiClient.getModelName()}`);
        } catch (autoDetectError: any) {
          console.error('Auto-detection failed:', autoDetectError);
          res.status(500).json({
            status: 'error',
            message: `Model ${geminiClient.getModelName()} not available and auto-detection failed`,
            suggestion: `Run: npx ts-node src/gemini/list-models.ts to see available models. Available: ${validation.availableModels?.join(', ') || 'none'}`,
          });
          return;
        }
      } else {
        console.log(`✅ Model ${geminiClient.getModelName()} is valid`);
      }
    } catch (error: any) {
      console.error('Gemini client initialization error:', error);
      res.status(500).json({
        status: 'error',
        message: `Failed to initialize Gemini client: ${error.message}`,
        suggestion: 'Run: npx ts-node src/gemini/list-models.ts to see available models',
      });
      return;
    }

    const codeGenerator = new CodeGenerator(geminiClient);

    console.log(`🚀 Starting MCP server generation for ${transformedAPI.info.title}...`);
    console.log(`   Using model: ${geminiClient.getModelName()}`);

    // Generate code using Gemini
    let generatedCode;
    try {
      // Use complete server generation for MVP (faster, single request)
      generatedCode = await codeGenerator.generateCompleteServer(transformedAPI);
    } catch (error: any) {
      console.error('Gemini generation error:', error);
      
      // Provide helpful error message
      let errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        errorMessage += '. Please check available models with: npx ts-node src/gemini/list-models.ts';
      }
      
      res.status(500).json({
        status: 'error',
        message: `Failed to generate code: ${errorMessage}`,
        suggestion: 'Check your GEMINI_API_KEY and GEMINI_MODEL environment variables',
      });
      return;
    }

    // Create package directory
    const packageDir = await createGeneratedPackageDir(fileId);

    // Generate MCP server package
    let packageInfo;
    try {
      packageInfo = await generateMCPServerPackage(
        transformedAPI,
        generatedCode,
        packageDir
      );
    } catch (error: any) {
      console.error('Package generation error:', error);
      res.status(500).json({
        status: 'error',
        message: `Failed to create package: ${error.message}`,
      });
      return;
    }

    // Save package metadata
    await saveGeneratedPackageMetadata(
      fileId,
      fileId,
      packageInfo.packagePath,
      packageInfo.zipPath
    );

    res.status(200).json({
      status: 'success',
      data: {
        packageId: fileId,
        packagePath: packageInfo.packagePath,
        zipPath: packageInfo.zipPath,
        downloadUrl: `/api/download/${fileId}`,
      },
    });
  } catch (error: any) {
    next(error);
  }
}
