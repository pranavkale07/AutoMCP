import yaml from 'js-yaml';
import type {
  OpenAPISpec,
  ParsedAPI,
  ParsedEndpoint,
  ParsedParameter,
  ParsedRequestBody,
  ParsedResponse,
  ParsedAuthScheme,
  Operation,
  Parameter,
  RequestBody,
  Response,
} from './types';
import { resolveSchema, getSchemaType } from './schema-resolver';

/**
 * OpenAPI 3.x Parser
 */

/**
 * Parse OpenAPI file (JSON or YAML)
 */
export async function parseOpenAPI(content: string | Buffer): Promise<ParsedAPI> {
  const contentStr = typeof content === 'string' ? content : content.toString('utf-8');
  
  // Try to parse as JSON first, then YAML
  let spec: OpenAPISpec;
  try {
    spec = JSON.parse(contentStr);
  } catch {
    try {
      spec = yaml.load(contentStr) as OpenAPISpec;
    } catch (error) {
      throw new Error(`Failed to parse OpenAPI file: ${error}`);
    }
  }

  // Validate OpenAPI version
  if (!spec.openapi || !spec.openapi.startsWith('3.')) {
    throw new Error(`Unsupported OpenAPI version: ${spec.openapi}. Only OpenAPI 3.x is supported.`);
  }

  // Extract base URL
  const baseUrl = extractBaseUrl(spec);

  // Extract endpoints
  const endpoints = extractEndpoints(spec);

  // Extract authentication schemes
  const authSchemes = extractAuthSchemes(spec);

  // Extract and resolve all schemas
  const schemas = extractSchemas(spec);

  return {
    info: {
      title: spec.info.title || 'API',
      description: spec.info.description,
      version: spec.info.version || '1.0.0',
    },
    baseUrl,
    endpoints,
    authSchemes,
    schemas,
  };
}

/**
 * Extract base URL from servers array
 */
function extractBaseUrl(spec: OpenAPISpec): string {
  if (spec.servers && spec.servers.length > 0) {
    return spec.servers[0].url;
  }
  return 'https://api.example.com';
}

/**
 * Extract all endpoints from paths
 */
function extractEndpoints(spec: OpenAPISpec): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of httpMethods) {
      const operation = pathItem[method as keyof typeof pathItem] as Operation | undefined;
      if (operation) {
        const endpoint = parseEndpoint(path, method.toUpperCase(), operation, spec);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }
    }
  }

  return endpoints;
}

/**
 * Parse a single endpoint
 */
function parseEndpoint(
  path: string,
  method: string,
  operation: Operation,
  spec: OpenAPISpec
): ParsedEndpoint | null {
  // Generate operationId if missing
  const operationId = operation.operationId || generateOperationId(method, path);

  // Parse parameters
  const parameters = parseParameters(operation.parameters || [], spec);

  // Parse request body
  const requestBody = operation.requestBody
    ? parseRequestBody(operation.requestBody, spec)
    : undefined;

  // Parse responses
  const responses = parseResponses(operation.responses, spec);

  return {
    path,
    method,
    operationId,
    summary: operation.summary,
    description: operation.description,
    tags: operation.tags,
    parameters,
    requestBody,
    responses,
    security: operation.security,
  };
}

/**
 * Parse parameters
 */
function parseParameters(parameters: Parameter[], spec: OpenAPISpec): ParsedParameter[] {
  return parameters.map((param) => {
    const schema = param.schema ? resolveSchema(param.schema, spec) : { type: 'string' };
    
    return {
      name: param.name,
      in: param.in,
      description: param.description,
      required: param.required ?? false,
      type: getSchemaType(schema),
      format: schema.format,
      enum: schema.enum,
      default: schema.default,
      schema,
    };
  });
}

/**
 * Parse request body
 */
function parseRequestBody(requestBody: RequestBody | { $ref: string }, spec: OpenAPISpec): ParsedRequestBody | undefined {
  let body: RequestBody;

  // Resolve $ref if present
  if ('$ref' in requestBody) {
    const resolved = resolveRef(requestBody.$ref, spec);
    body = resolved as RequestBody;
  } else {
    body = requestBody;
  }

  // Get first content type (prefer JSON)
  const contentTypes = Object.keys(body.content);
  const preferredContentType = contentTypes.find(ct => ct.includes('json')) || contentTypes[0];
  
  if (!preferredContentType) {
    return undefined;
  }

  const mediaType = body.content[preferredContentType];
  const schema = mediaType.schema ? resolveSchema(mediaType.schema, spec) : undefined;

  return {
    description: body.description,
    required: body.required ?? false,
    contentType: preferredContentType,
    schema,
  };
}

/**
 * Parse responses
 */
function parseResponses(responses: Record<string, Response>, spec: OpenAPISpec): ParsedResponse[] {
  return Object.entries(responses).map(([statusCode, response]) => {
    let contentType: string | undefined;
    let schema: any;

    if (response.content) {
      const contentTypes = Object.keys(response.content);
      contentType = contentTypes.find(ct => ct.includes('json')) || contentTypes[0];
      
      if (contentType) {
        const mediaType = response.content[contentType];
        schema = mediaType.schema ? resolveSchema(mediaType.schema, spec) : undefined;
      }
    }

    return {
      statusCode,
      description: response.description,
      contentType,
      schema,
    };
  });
}

/**
 * Extract authentication schemes
 */
function extractAuthSchemes(spec: OpenAPISpec): ParsedAuthScheme[] {
  const schemes: ParsedAuthScheme[] = [];

  if (!spec.components?.securitySchemes) {
    return schemes;
  }

  for (const [name, scheme] of Object.entries(spec.components.securitySchemes)) {
    const parsed: ParsedAuthScheme = {
      name,
      type: scheme.type,
    };

    if (scheme.type === 'apiKey') {
      parsed.location = scheme.in;
      parsed.apiKeyName = scheme.name;
    } else if (scheme.type === 'http') {
      parsed.scheme = scheme.scheme;
      parsed.bearerFormat = scheme.bearerFormat;
    } else if (scheme.type === 'oauth2') {
      // OAuth2 is complex, we'll handle it later
      parsed.type = 'oauth2';
    }

    schemes.push(parsed);
  }

  return schemes;
}

/**
 * Extract and resolve all schemas
 */
function extractSchemas(spec: OpenAPISpec): Record<string, any> {
  const schemas: Record<string, any> = {};

  if (!spec.components?.schemas) {
    return schemas;
  }

  for (const [name, schema] of Object.entries(spec.components.schemas)) {
    schemas[name] = resolveSchema(schema, spec);
  }

  return schemas;
}

/**
 * Generate operationId from method and path
 */
function generateOperationId(method: string, path: string): string {
  const parts = path
    .split('/')
    .filter(p => p && !p.startsWith('{'))
    .map(p => p.replace(/[^a-zA-Z0-9]/g, ''));
  
  const pathName = parts.length > 0 
    ? parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
    : 'Resource';
  
  const methodPrefix = method.toLowerCase();
  return `${methodPrefix}${pathName}`;
}

/**
 * Helper to resolve $ref (used in requestBody parsing)
 */
function resolveRef(ref: string, spec: OpenAPISpec): any {
  if (!ref.startsWith('#/')) {
    throw new Error(`External references not supported: ${ref}`);
  }

  const parts = ref.substring(2).split('/');
  let current: any = spec;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      throw new Error(`Reference not found: ${ref}`);
    }
  }

  return current;
}
