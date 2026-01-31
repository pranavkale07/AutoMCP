/**
 * Types for data transformation (Gemini-ready format)
 */

export interface TransformedAPI {
  info: {
    title: string;
    description?: string;
    version: string;
  };
  baseUrl: string;
  endpoints: TransformedEndpoint[];
  authSchemes: TransformedAuthScheme[];
  schemas: Record<string, TransformedSchema>;
}

export interface TransformedEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters: TransformedParameter[];
  requestBody?: TransformedRequestBody;
  responses: TransformedResponse[];
  security?: string[]; // Simplified: just auth scheme names
}

export interface TransformedParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required: boolean;
  type: string;
  format?: string;
  enum?: any[];
  default?: any;
}

export interface TransformedRequestBody {
  description?: string;
  required: boolean;
  contentType: string;
  schemaName?: string; // Reference to schema name
  schema: any; // Simplified schema structure
}

export interface TransformedResponse {
  statusCode: string;
  description: string;
  contentType?: string;
  schemaName?: string; // Reference to schema name
  schema?: any; // Simplified schema structure
}

export interface TransformedAuthScheme {
  name: string;
  type: 'apiKey' | 'http' | 'oauth2';
  location?: 'query' | 'header' | 'cookie';
  scheme?: string; // 'bearer', 'basic', etc.
  apiKeyName?: string;
}

export interface TransformedSchema {
  name: string;
  type: string;
  properties?: Record<string, TransformedSchemaProperty>;
  required?: string[];
  description?: string;
}

export interface TransformedSchemaProperty {
  name: string;
  type: string;
  format?: string;
  description?: string;
  required: boolean;
  enum?: any[];
  default?: any;
  items?: TransformedSchemaProperty; // For arrays
  properties?: Record<string, TransformedSchemaProperty>; // For nested objects
}
