import type { OpenAPISpec, Schema } from './types';

/**
 * Resolves $ref references in OpenAPI schemas
 */

/**
 * Resolve a $ref reference
 */
export function resolveRef(ref: string, spec: OpenAPISpec): any {
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

/**
 * Resolve all $ref in a schema recursively
 */
export function resolveSchema(schema: Schema | { $ref: string }, spec: OpenAPISpec, visited = new Set<string>()): any {
  // Handle direct $ref
  if (schema && typeof schema === 'object' && '$ref' in schema && schema.$ref) {
    const ref = schema.$ref;
    
    if (typeof ref !== 'string') {
      return schema;
    }
    
    // Prevent circular references
    if (visited.has(ref)) {
      return { $ref: ref, _circular: true };
    }
    
    visited.add(ref);
    const resolved = resolveRef(ref, spec);
    const result = resolveSchema(resolved, spec, visited);
    visited.delete(ref);
    return result;
  }

  // Handle schema object
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const resolved: any = { ...schema };
  
  // Remove $ref if present (already resolved)
  delete resolved.$ref;

  // Resolve properties
  if (resolved.properties) {
    resolved.properties = Object.fromEntries(
      Object.entries(resolved.properties).map(([key, value]) => [
        key,
        resolveSchema(value as Schema, spec, visited),
      ])
    );
  }

  // Resolve items (for arrays)
  if (resolved.items) {
    resolved.items = resolveSchema(resolved.items as Schema, spec, visited);
  }

  // Resolve additionalProperties
  if (resolved.additionalProperties && typeof resolved.additionalProperties === 'object') {
    if ('$ref' in resolved.additionalProperties) {
      resolved.additionalProperties = resolveSchema(resolved.additionalProperties as Schema, spec, visited);
    } else {
      resolved.additionalProperties = resolveSchema(resolved.additionalProperties as Schema, spec, visited);
    }
  }

  // Resolve allOf, oneOf, anyOf
  if (resolved.allOf) {
    resolved.allOf = resolved.allOf.map((s: Schema) => resolveSchema(s, spec, visited));
  }
  if (resolved.oneOf) {
    resolved.oneOf = resolved.oneOf.map((s: Schema) => resolveSchema(s, spec, visited));
  }
  if (resolved.anyOf) {
    resolved.anyOf = resolved.anyOf.map((s: Schema) => resolveSchema(s, spec, visited));
  }

  return resolved;
}

/**
 * Get schema type string
 */
export function getSchemaType(schema: any): string {
  if (!schema || typeof schema !== 'object') {
    return 'any';
  }

  if (schema.type) {
    if (schema.type === 'array' && schema.items) {
      const itemType = getSchemaType(schema.items);
      return `Array<${itemType}>`;
    }
    return schema.type;
  }

  if (schema.properties) {
    return 'object';
  }

  return 'any';
}
