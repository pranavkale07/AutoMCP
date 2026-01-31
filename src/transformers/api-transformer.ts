import type {
  ParsedAPI,
  ParsedEndpoint,
  ParsedParameter,
  ParsedRequestBody,
  ParsedResponse,
  ParsedAuthScheme,
} from '../parsers/types';
import type {
  TransformedAPI,
  TransformedEndpoint,
  TransformedParameter,
  TransformedRequestBody,
  TransformedResponse,
  TransformedAuthScheme,
  TransformedSchema,
  TransformedSchemaProperty,
} from './types';

/**
 * Transform parsed API data into Gemini-ready format
 */

/**
 * Transform parsed API to Gemini-ready format
 */
export function transformAPI(parsed: ParsedAPI): TransformedAPI {
  return {
    info: parsed.info,
    baseUrl: parsed.baseUrl,
    endpoints: parsed.endpoints.map(transformEndpoint),
    authSchemes: parsed.authSchemes.map(transformAuthScheme),
    schemas: transformSchemas(parsed.schemas),
  };
}

/**
 * Transform endpoint
 */
function transformEndpoint(endpoint: ParsedEndpoint): TransformedEndpoint {
  return {
    path: endpoint.path,
    method: endpoint.method,
    operationId: endpoint.operationId,
    summary: endpoint.summary,
    description: endpoint.description,
    tags: endpoint.tags,
    parameters: endpoint.parameters.map(transformParameter),
    requestBody: endpoint.requestBody ? transformRequestBody(endpoint.requestBody) : undefined,
    responses: endpoint.responses.map(transformResponse),
    security: endpoint.security ? extractSecurityNames(endpoint.security) : undefined,
  };
}

/**
 * Transform parameter
 */
function transformParameter(param: ParsedParameter): TransformedParameter {
  return {
    name: param.name,
    in: param.in,
    description: param.description,
    required: param.required,
    type: param.type,
    format: param.format,
    enum: param.enum,
    default: param.default,
  };
}

/**
 * Transform request body
 */
function transformRequestBody(body: ParsedRequestBody): TransformedRequestBody {
  const schemaName = extractSchemaName(body.schema);
  
  return {
    description: body.description,
    required: body.required,
    contentType: body.contentType,
    schemaName,
    schema: simplifySchema(body.schema),
  };
}

/**
 * Transform response
 */
function transformResponse(response: ParsedResponse): TransformedResponse {
  const schemaName = response.schema ? extractSchemaName(response.schema) : undefined;
  
  return {
    statusCode: response.statusCode,
    description: response.description,
    contentType: response.contentType,
    schemaName,
    schema: response.schema ? simplifySchema(response.schema) : undefined,
  };
}

/**
 * Transform auth schemes
 */
function transformAuthScheme(auth: ParsedAuthScheme): TransformedAuthScheme {
  return {
    name: auth.name,
    type: auth.type === 'openIdConnect' ? 'oauth2' : auth.type,
    location: auth.location,
    scheme: auth.scheme,
    apiKeyName: auth.apiKeyName,
  };
}

/**
 * Transform schemas
 */
function transformSchemas(schemas: Record<string, any>): Record<string, TransformedSchema> {
  const transformed: Record<string, TransformedSchema> = {};

  for (const [name, schema] of Object.entries(schemas)) {
    transformed[name] = {
      name,
      type: getSchemaType(schema),
      properties: schema.properties ? transformSchemaProperties(schema.properties, schema.required || []) : undefined,
      required: schema.required,
      description: schema.description,
    };
  }

  return transformed;
}

/**
 * Transform schema properties
 */
function transformSchemaProperties(
  properties: Record<string, any>,
  required: string[]
): Record<string, TransformedSchemaProperty> {
  const transformed: Record<string, TransformedSchemaProperty> = {};

  for (const [name, prop] of Object.entries(properties)) {
    transformed[name] = {
      name,
      type: getSchemaType(prop),
      format: prop.format,
      description: prop.description,
      required: required.includes(name),
      enum: prop.enum,
      default: prop.default,
      items: prop.items ? transformSchemaProperty(prop.items, []) : undefined,
      properties: prop.properties ? transformSchemaProperties(prop.properties, prop.required || []) : undefined,
    };
  }

  return transformed;
}

/**
 * Transform single schema property
 */
function transformSchemaProperty(prop: any, required: string[]): TransformedSchemaProperty {
  return {
    name: '',
    type: getSchemaType(prop),
    format: prop.format,
    description: prop.description,
    required: false,
    enum: prop.enum,
    default: prop.default,
    items: prop.items ? transformSchemaProperty(prop.items, []) : undefined,
    properties: prop.properties ? transformSchemaProperties(prop.properties, prop.required || []) : undefined,
  };
}

/**
 * Simplify schema for Gemini (remove unnecessary complexity)
 */
function simplifySchema(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const simplified: any = {
    type: getSchemaType(schema),
  };

  if (schema.description) simplified.description = schema.description;
  if (schema.format) simplified.format = schema.format;
  if (schema.enum) simplified.enum = schema.enum;
  if (schema.default !== undefined) simplified.default = schema.default;
  if (schema.required) simplified.required = schema.required;

  if (schema.properties) {
    simplified.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]: [string, any]) => [
        key,
        simplifySchema(value),
      ])
    );
  }

  if (schema.items) {
    simplified.items = simplifySchema(schema.items);
  }

  return simplified;
}

/**
 * Extract schema name from schema (if it's a reference or has a name)
 */
function extractSchemaName(schema: any): string | undefined {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  // If schema has a _name property (from our transformation)
  if (schema._name) {
    return schema._name;
  }

  // Try to infer from common patterns
  if (schema.type === 'object' && schema.properties) {
    // Could be a named schema, but we don't have that info here
    return undefined;
  }

  return undefined;
}

/**
 * Get schema type string
 */
function getSchemaType(schema: any): string {
  if (!schema || typeof schema !== 'object') {
    return 'any';
  }

  if (schema.type) {
    if (schema.type === 'array') {
      return 'array';
    }
    return schema.type;
  }

  if (schema.properties) {
    return 'object';
  }

  return 'any';
}

/**
 * Extract security scheme names from security requirements
 */
function extractSecurityNames(security: Array<Record<string, string[]>>): string[] {
  const names: string[] = [];
  for (const sec of security) {
    names.push(...Object.keys(sec));
  }
  return [...new Set(names)]; // Remove duplicates
}

/**
 * Create a summary of the API for Gemini context
 */
export function createAPISummary(transformed: TransformedAPI): string {
  const lines: string[] = [];
  
  lines.push(`API: ${transformed.info.title}`);
  lines.push(`Version: ${transformed.info.version}`);
  if (transformed.info.description) {
    lines.push(`Description: ${transformed.info.description}`);
  }
  lines.push(`Base URL: ${transformed.baseUrl}`);
  lines.push(`\nEndpoints: ${transformed.endpoints.length}`);
  lines.push(`Auth Schemes: ${transformed.authSchemes.length}`);
  lines.push(`Schemas: ${Object.keys(transformed.schemas).length}`);
  
  return lines.join('\n');
}

/**
 * Create endpoint summary for Gemini
 */
export function createEndpointSummary(endpoint: TransformedEndpoint): string {
  const lines: string[] = [];
  
  lines.push(`${endpoint.method} ${endpoint.path}`);
  if (endpoint.summary) {
    lines.push(`Summary: ${endpoint.summary}`);
  }
  if (endpoint.description) {
    lines.push(`Description: ${endpoint.description}`);
  }
  lines.push(`Operation ID: ${endpoint.operationId}`);
  
  if (endpoint.parameters.length > 0) {
    lines.push(`Parameters: ${endpoint.parameters.length}`);
    endpoint.parameters.forEach(param => {
      lines.push(`  - ${param.name} (${param.in}): ${param.type}${param.required ? ' [required]' : ''}`);
    });
  }
  
  if (endpoint.requestBody) {
    lines.push(`Request Body: ${endpoint.requestBody.contentType}${endpoint.requestBody.schemaName ? ` (${endpoint.requestBody.schemaName})` : ''}`);
  }
  
  if (endpoint.responses.length > 0) {
    lines.push(`Responses: ${endpoint.responses.length}`);
    endpoint.responses.slice(0, 3).forEach(resp => {
      lines.push(`  - ${resp.statusCode}: ${resp.description}${resp.schemaName ? ` (${resp.schemaName})` : ''}`);
    });
  }
  
  return lines.join('\n');
}
