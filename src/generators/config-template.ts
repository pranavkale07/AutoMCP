import type { TransformedAPI } from '../transformers/types';

/**
 * Configuration template for generated MCP servers
 */

export function generateConfigFile(api: TransformedAPI): string {
  const configLines: string[] = [];
  
  configLines.push(`import dotenv from 'dotenv';`);
  configLines.push(``);
  configLines.push(`dotenv.config();`);
  configLines.push(``);
  configLines.push(`export const API_BASE_URL = process.env.API_BASE_URL || '${api.baseUrl}';`);
  
  for (const auth of api.authSchemes) {
    if (auth.type === 'apiKey') {
      configLines.push(`export const API_KEY = process.env.API_KEY || '';`);
    } else if (auth.type === 'http' && auth.scheme === 'bearer') {
      configLines.push(`export const BEARER_TOKEN = process.env.BEARER_TOKEN || '';`);
    }
  }

  return configLines.join('\n');
}
