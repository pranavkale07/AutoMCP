/**
 * Quick test script for API transformer
 * Run with: npx ts-node src/transformers/__test__.ts
 */

import fs from 'fs/promises';
import { parseOpenAPI } from '../parsers/openapi-parser';
import { transformAPI, createAPISummary, createEndpointSummary } from './api-transformer';

async function testTransformer() {
  try {
    const content = await fs.readFile('pet-store-openapi.json', 'utf-8');
    const parsed = await parseOpenAPI(content);
    const transformed = transformAPI(parsed);
    
    console.log('✅ Transformer test successful!');
    console.log('\n📋 Transformed API Summary:');
    console.log(createAPISummary(transformed));
    
    console.log('\n🔌 Sample Endpoint:');
    if (transformed.endpoints.length > 0) {
      const sampleEndpoint = transformed.endpoints[0];
      console.log(createEndpointSummary(sampleEndpoint));
    }
    
    console.log('\n🔐 Auth Schemes:');
    transformed.authSchemes.forEach(auth => {
      console.log(`   - ${auth.name}: ${auth.type}${auth.location ? ` (${auth.location})` : ''}${auth.apiKeyName ? ` [${auth.apiKeyName}]` : ''}`);
    });
    
    console.log('\n📦 Schemas:');
    Object.keys(transformed.schemas).slice(0, 3).forEach(name => {
      const schema = transformed.schemas[name];
      console.log(`   - ${name}: ${schema.type}${schema.properties ? ` (${Object.keys(schema.properties).length} properties)` : ''}`);
    });
    
    console.log('\n✨ Transformation complete!');
    
  } catch (error) {
    console.error('❌ Transformer test failed:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  testTransformer();
}
