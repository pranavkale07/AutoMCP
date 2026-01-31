import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { GeminiConfig, GeminiResponse, GeminiGenerationOptions, RetryConfig } from './types';

/**
 * Gemini API Client wrapper
 * Implements latest Gemini API best practices
 */

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private modelName: string;
  private defaultConfig: GeminiGenerationOptions;
  private retryConfig: RetryConfig;

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(config.apiKey);
    // Default to gemini-pro (most widely available)
    // Users can override with GEMINI_MODEL env var
    this.modelName = config.model || 'gemini-pro';
    this.defaultConfig = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 32768,
    };
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      retryableErrors: ['429', '500', '503', '504'], // Rate limit and server errors
    };
  }

  /**
   * Generate text from a prompt with retry logic
   */
  async generateText(
    prompt: string,
    options?: GeminiGenerationOptions
  ): Promise<GeminiResponse> {
    // Validate and auto-detect model if needed (only on first call)
    if (!(this as any)._modelValidated) {
      const validation = await this.validateModel();
      if (!validation.valid) {
        console.log(`   🔍 Model ${this.modelName} not available, attempting auto-detection...`);
        await this.autoDetectModel();
      }
      (this as any)._modelValidated = true;
    }

    return this.executeWithRetry(async () => {
      return await this._generateText(prompt, options);
    });
  }

  /**
   * Internal generate text implementation
   */
  private async _generateText(
    prompt: string,
    options?: GeminiGenerationOptions
  ): Promise<GeminiResponse> {
    const startTime = Date.now();
    const temperature = options?.temperature ?? this.defaultConfig.temperature;
    const maxTokens = options?.maxTokens ?? this.defaultConfig.maxTokens;
    
    console.log(`\n🤖 [Gemini] Starting generation...`);
    console.log(`   Model: ${this.modelName}`);
    console.log(`   Temperature: ${temperature}`);
    console.log(`   Max Tokens: ${maxTokens}`);
    console.log(`   Prompt Length: ${prompt.length} characters`);
    
    try {
      // Default safety settings - allow all content for code generation
      const defaultSafetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ];

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: options?.topP,
          topK: options?.topK,
        },
        safetySettings: defaultSafetySettings,
      });

      console.log(`   📤 Sending request to Gemini API...`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const duration = Date.now() - startTime;

      // Extract usage information if available
      const usage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            candidatesTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined;

      // Check for blocked content
      const blocked = response.candidates?.[0]?.finishReason === 'SAFETY';
      if (blocked) {
        console.warn(`   ⚠️  Content was blocked by safety filters`);
      }

      console.log(`   ✅ [Gemini] Generation completed in ${duration}ms`);
      if (usage) {
        console.log(`   📊 Token Usage:`);
        console.log(`      Prompt: ${usage.promptTokens}`);
        console.log(`      Response: ${usage.candidatesTokens}`);
        console.log(`      Total: ${usage.totalTokens}`);
      }
      console.log(`   📝 Response Length: ${text.length} characters`);

      return {
        text,
        usage,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`   ❌ [Gemini] Error after ${duration}ms:`);
      console.error(`      ${error.message || 'Unknown error'}`);
      
      // Enhanced error information
      if (error.statusCode) {
        console.error(`      Status Code: ${error.statusCode}`);
      }
      if (error.statusMessage) {
        console.error(`      Status: ${error.statusMessage}`);
      }
      
      if (error.stack && process.env.NODE_ENV === 'development') {
        console.error(`      Stack: ${error.stack}`);
      }
      
      throw error;
    }
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const errorCode = error.statusCode?.toString() || error.code?.toString() || '';
      const isRetryable = this.retryConfig.retryableErrors?.some(
        code => errorCode.includes(code) || error.message?.includes(code)
      );

      if (isRetryable && attempt < (this.retryConfig.maxRetries || 3)) {
        const delay = (this.retryConfig.retryDelay || 1000) * attempt;
        console.log(`   🔄 Retrying (attempt ${attempt + 1}/${this.retryConfig.maxRetries}) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Generate text with streaming (for future use)
   */
  async *generateTextStream(
    prompt: string,
    options?: GeminiGenerationOptions
  ): AsyncGenerator<string, void, unknown> {
    const startTime = Date.now();
    const temperature = options?.temperature ?? this.defaultConfig.temperature;
    const maxTokens = options?.maxTokens ?? this.defaultConfig.maxTokens;
    
    console.log(`\n🤖 [Gemini] Starting streaming generation...`);
    console.log(`   Model: ${this.modelName}`);
    console.log(`   Temperature: ${temperature}`);
    console.log(`   Max Tokens: ${maxTokens}`);
    
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: options?.topP,
          topK: options?.topK,
        },
      });

      console.log(`   📤 Starting stream...`);
      const result = await model.generateContentStream(prompt);
      let chunkCount = 0;
      let totalLength = 0;
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        chunkCount++;
        totalLength += chunkText.length;
        yield chunkText;
      }
      
      const duration = Date.now() - startTime;
      console.log(`   ✅ [Gemini] Streaming completed in ${duration}ms`);
      console.log(`   📊 Chunks: ${chunkCount}, Total Length: ${totalLength} characters`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`   ❌ [Gemini] Streaming error after ${duration}ms:`);
      console.error(`      ${error.message || 'Unknown error'}`);
      throw new Error(`Gemini API streaming error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get model information
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection(): Promise<boolean> {
    console.log(`\n🔌 [Gemini] Testing connection to ${this.modelName}...`);
    try {
      await this.generateText('Say "Hello"', { maxTokens: 10 });
      console.log(`   ✅ Connection test successful!`);
      return true;
    } catch (error: any) {
      console.error(`   ❌ Connection test failed: ${error.message}`);
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.error(`   💡 Model ${this.modelName} may not be available.`);
        console.error(`   💡 Try running: npx ts-node src/gemini/list-models.ts`);
      }
      return false;
    }
  }

  /**
   * Validate model name by attempting to list models
   */
  async validateModel(): Promise<{ valid: boolean; availableModels?: string[] }> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return { valid: false };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ Failed to list models: ${response.status} ${errorText}`);
        return { valid: false };
      }
      
      const data = await response.json() as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
      const availableModels = data.models
        ?.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        ?.map(m => m.name.replace('models/', '')) || [];
      
      const isValid = availableModels.includes(this.modelName);
      
      if (!isValid) {
        console.warn(`   ⚠️  Model ${this.modelName} not found in available models`);
        console.log(`   💡 Available models: ${availableModels.join(', ')}`);
      }
      
      return { valid: isValid, availableModels };
    } catch (error: any) {
      console.error(`   ❌ Error validating model: ${error.message}`);
      return { valid: false };
    }
  }

  /**
   * Auto-detect and use best available model
   */
  async autoDetectModel(): Promise<string> {
    const validation = await this.validateModel();
    
    if (validation.valid) {
      return this.modelName;
    }
    
    if (validation.availableModels && validation.availableModels.length > 0) {
      // Prefer gemini-pro, then gemini-1.5-pro, then any available
      const preferred = validation.availableModels.find(m => m === 'gemini-pro') ||
                       validation.availableModels.find(m => m.includes('gemini-1.5-pro')) ||
                       validation.availableModels[0];
      
      console.log(`   🔄 Auto-switching to model: ${preferred}`);
      this.modelName = preferred;
      return preferred;
    }
    
    throw new Error('No available models found. Please check your API key.');
  }
}

/**
 * Create Gemini client instance from environment
 */
export function createGeminiClient(): GeminiClient {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  return new GeminiClient({
    apiKey,
    model: process.env.GEMINI_MODEL || 'gemini-pro',
    temperature: process.env.GEMINI_TEMPERATURE
      ? parseFloat(process.env.GEMINI_TEMPERATURE)
      : 0.7,
    maxTokens: process.env.GEMINI_MAX_TOKENS
      ? parseInt(process.env.GEMINI_MAX_TOKENS, 10)
      : 32768,
  });
}
