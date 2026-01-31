/**
 * Types for Gemini API interactions
 */

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
}

export interface GeminiGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: string[];
}
