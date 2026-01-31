import type { TransformedAPI, TransformedEndpoint } from '../transformers/types';

/**
 * Prompt templates for Gemini code generation
 */

/**
 * Generate prompt for creating MCP tool definitions from endpoints
 */
export function createToolDefinitionsPrompt(api: TransformedAPI): string {
  const endpoints = api.endpoints.map(ep => createEndpointDescription(ep)).join('\n\n');

  return `You are an expert TypeScript developer specializing in MCP (Model Context Protocol) servers.

Your task is to generate MCP tool definitions from the following API specification.

API Information:
- Title: ${api.info.title}
- Version: ${api.info.version}
- Base URL: ${api.baseUrl}
${api.info.description ? `- Description: ${api.info.description}` : ''}

Authentication Schemes:
${api.authSchemes.map(auth => `- ${auth.name}: ${auth.type}${auth.location ? ` (${auth.location})` : ''}${auth.apiKeyName ? ` [${auth.apiKeyName}]` : ''}`).join('\n')}

API Endpoints:
${endpoints}

Your task:
1. Convert each API endpoint into an MCP tool definition
2. Each tool should follow the MCP protocol specification
3. Use proper TypeScript types for parameters
4. Include clear descriptions for each tool
5. Handle authentication requirements
6. Map HTTP methods to appropriate tool names

Generate a JSON array of MCP tool definitions. Each tool should have:
- name: string (camelCase, based on operationId)
- description: string (from summary/description)
- inputSchema: object with properties matching the endpoint parameters and request body

Example format:
{
  "tools": [
    {
      "name": "getPetById",
      "description": "Find pet by ID. Returns a single pet.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "petId": {
            "type": "integer",
            "description": "ID of pet to return"
          }
        },
        "required": ["petId"]
      }
    }
  ]
}

Generate the complete tool definitions JSON for all ${api.endpoints.length} endpoints.`;
}

/**
 * Generate prompt for creating MCP tool implementations
 */
export function createToolImplementationPrompt(
  endpoint: TransformedEndpoint,
  api: TransformedAPI
): string {
  const authInfo = api.authSchemes.length > 0
    ? `\nAuthentication: ${api.authSchemes.map(a => a.name).join(', ')}`
    : '';

  return `You are an expert TypeScript developer specializing in MCP (Model Context Protocol) servers.

Generate a complete MCP tool implementation for the following API endpoint:

Endpoint: ${endpoint.method} ${endpoint.path}
Operation ID: ${endpoint.operationId}
${endpoint.summary ? `Summary: ${endpoint.summary}` : ''}
${endpoint.description ? `Description: ${endpoint.description}` : ''}
Base URL: ${api.baseUrl}${authInfo}

Parameters:
${endpoint.parameters.map(p => 
  `- ${p.name} (${p.in}): ${p.type}${p.required ? ' [required]' : ''}${p.description ? ` - ${p.description}` : ''}`
).join('\n')}

${endpoint.requestBody ? `
Request Body:
- Content Type: ${endpoint.requestBody.contentType}
- Required: ${endpoint.requestBody.required}
${endpoint.requestBody.schemaName ? `- Schema: ${endpoint.requestBody.schemaName}` : ''}
` : ''}

Responses:
${endpoint.responses.map(r => 
  `- ${r.statusCode}: ${r.description}${r.schemaName ? ` (${r.schemaName})` : ''}`
).join('\n')}

Requirements:
1. Generate complete TypeScript code for the MCP tool handler
2. Use fetch or axios to make HTTP requests
3. Handle authentication (${api.authSchemes.map(a => a.name).join(', ') || 'none'})
4. Proper error handling with try-catch
5. Return data in MCP-compatible format
6. Include proper TypeScript types
7. Handle all response status codes
8. Use the base URL: ${api.baseUrl}

Generate ONLY the tool handler function code, ready to be integrated into an MCP server.`;
}

/**
 * Generate prompt for creating TypeScript types from schemas
 */
export function createTypesGenerationPrompt(api: TransformedAPI): string {
  const schemas = Object.entries(api.schemas)
    .map(([name, schema]) => createSchemaDescription(name, schema))
    .join('\n\n');

  return `You are an expert TypeScript developer.

Generate TypeScript type definitions from the following JSON schemas:

${schemas}

Requirements:
1. Convert each schema to a TypeScript interface or type
2. Use proper TypeScript types (string, number, boolean, Date, etc.)
3. Handle arrays, nested objects, and optional properties
4. Include JSDoc comments with descriptions
5. Use enums for enum values
6. Handle date-time formats as Date or string
7. Make properties optional if not in required array

Generate complete TypeScript type definitions for all schemas.`;
}

/**
 * Generate prompt for creating main MCP server file
 */
export function createMainServerPrompt(api: TransformedAPI, toolNames: string[]): string {
  return `You are an expert TypeScript developer specializing in MCP (Model Context Protocol) servers.

Generate the main MCP server entry point file (index.ts) with the following requirements:

API Information:
- Title: ${api.info.title}
- Base URL: ${api.baseUrl}
- Authentication: ${api.authSchemes.map(a => `${a.name} (${a.type})`).join(', ') || 'None'}

MCP Tools: ${toolNames.length} tools
${toolNames.map(name => `- ${name}`).join('\n')}

Requirements:
1. Import all tool handlers
2. Set up MCP server using @modelcontextprotocol/sdk
3. Register all ${toolNames.length} tools
4. Configure authentication handling
5. Set up proper error handling
6. Export server instance
7. Include proper TypeScript types
8. Add configuration for base URL and API key

Generate complete, production-ready TypeScript code for the MCP server main file.`;
}

/**
 * Generate prompt for creating package.json
 */
export function createPackageJsonPrompt(api: TransformedAPI): string {
  return `Generate a package.json file for an MCP server that connects to this API:

API: ${api.info.title}
Base URL: ${api.baseUrl}

Requirements:
1. Name: mcp-${api.info.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}
2. Version: 1.0.0
3. Type: module
4. Include dependencies:
   - @modelcontextprotocol/sdk
   - axios or node-fetch for HTTP requests
   - dotenv for environment variables
5. Include devDependencies:
   - typescript
   - @types/node
   - ts-node
6. Add scripts for build and start
7. Set main entry point

Generate the complete package.json JSON.`;
}

/**
 * Generate prompt for creating README
 */
export function createReadmePrompt(api: TransformedAPI, toolNames: string[]): string {
  return `Generate a comprehensive README.md file for an MCP server with the following information:

API: ${api.info.title}
Version: ${api.info.version}
Base URL: ${api.baseUrl}
${api.info.description ? `Description: ${api.info.description}` : ''}

MCP Tools: ${toolNames.length} tools available
Authentication: ${api.authSchemes.map(a => `${a.name} (${a.type})`).join(', ') || 'None required'}

Requirements:
1. Project title and description
2. Installation instructions
3. Configuration (environment variables)
4. Usage examples
5. List of available tools
6. Authentication setup
7. Troubleshooting section

Generate a complete, professional README.md file.`;
}

/**
 * Helper: Create endpoint description for prompts
 */
function createEndpointDescription(endpoint: TransformedEndpoint): string {
  const parts: string[] = [];
  
  parts.push(`${endpoint.method} ${endpoint.path}`);
  parts.push(`Operation ID: ${endpoint.operationId}`);
  if (endpoint.summary) parts.push(`Summary: ${endpoint.summary}`);
  if (endpoint.description) parts.push(`Description: ${endpoint.description}`);
  
  if (endpoint.parameters.length > 0) {
    parts.push(`Parameters:`);
    endpoint.parameters.forEach(p => {
      parts.push(`  - ${p.name} (${p.in}): ${p.type}${p.required ? ' [required]' : ''}${p.description ? ` - ${p.description}` : ''}`);
    });
  }
  
  if (endpoint.requestBody) {
    parts.push(`Request Body: ${endpoint.requestBody.contentType}${endpoint.requestBody.required ? ' [required]' : ''}`);
  }
  
  if (endpoint.responses.length > 0) {
    parts.push(`Responses:`);
    endpoint.responses.forEach(r => {
      parts.push(`  - ${r.statusCode}: ${r.description}`);
    });
  }
  
  return parts.join('\n');
}

/**
 * Helper: Create schema description for prompts
 */
function createSchemaDescription(name: string, schema: any): string {
  const parts: string[] = [];
  
  parts.push(`Schema: ${name}`);
  parts.push(`Type: ${schema.type || 'object'}`);
  if (schema.description) parts.push(`Description: ${schema.description}`);
  
  if (schema.properties) {
    parts.push(`Properties:`);
    Object.entries(schema.properties).forEach(([propName, prop]: [string, any]) => {
      const required = schema.required?.includes(propName) ? ' [required]' : '';
      parts.push(`  - ${propName}: ${prop.type || 'any'}${required}${prop.description ? ` - ${prop.description}` : ''}`);
    });
  }
  
  if (schema.required) {
    parts.push(`Required: ${schema.required.join(', ')}`);
  }
  
  return parts.join('\n');
}

/**
 * Generate complete MCP server code in one prompt (for smaller APIs)
 */
export function createCompleteServerPrompt(api: TransformedAPI): string {
  const endpoints = api.endpoints.map(ep => createEndpointDescription(ep)).join('\n\n');
  const schemas = Object.entries(api.schemas)
    .map(([name, schema]) => createSchemaDescription(name, schema))
    .join('\n\n');

  return `You are an expert TypeScript developer specializing in MCP (Model Context Protocol) servers.

Generate a complete, production-ready MCP server for the following API:

API Information:
- Title: ${api.info.title}
- Version: ${api.info.version}
- Base URL: ${api.baseUrl}
${api.info.description ? `- Description: ${api.info.description}` : ''}

Authentication Schemes:
${api.authSchemes.map(auth => `- ${auth.name}: ${auth.type}${auth.location ? ` (${auth.location})` : ''}${auth.apiKeyName ? ` [${auth.apiKeyName}]` : ''}`).join('\n')}

Endpoints (${api.endpoints.length}):
${endpoints}

Schemas:
${schemas}

Requirements:
1. Generate complete TypeScript code for an MCP server
2. Use @modelcontextprotocol/sdk
3. Create tool definitions for all ${api.endpoints.length} endpoints
4. Implement tool handlers that make HTTP requests to ${api.baseUrl}
5. Handle authentication: ${api.authSchemes.map(a => a.name).join(', ') || 'none'}
6. Generate TypeScript types from schemas
7. Include proper error handling
8. Add configuration for base URL and API keys
9. Create package.json with all dependencies
10. Include a README.md with setup instructions

Generate the complete MCP server codebase as a single response, organized into logical sections:
- Type definitions
- Tool definitions
- Tool implementations
- Main server file
- package.json
- README.md

Make sure the code is production-ready, well-documented, and follows MCP protocol standards.`;
}
