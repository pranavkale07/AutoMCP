/**
 * Quick test script for OpenAPI parser
 * Run with: npx ts-node src/parsers/__test__.ts
 */

import fs from 'fs/promises';
import { parseOpenAPI } from './openapi-parser';

async function testParser() {
  try {
    const content = await fs.readFile('pet-store-openapi.json', 'utf-8');
    const parsed = await parseOpenAPI(content);
    
    console.log('✅ Parser test successful!');
    console.log(`\n📋 API Info:`);
    console.log(`   Title: ${parsed.info.title}`);
    console.log(`   Version: ${parsed.info.version}`);
    console.log(`   Base URL: ${parsed.baseUrl}`);
    console.log(`\n🔌 Endpoints: ${parsed.endpoints.length}`);
    console.log(`   Sample endpoints:`);
    parsed.endpoints.slice(0, 5).forEach(ep => {
      console.log(`   - ${ep.method} ${ep.path} (${ep.operationId})`);
    });
    console.log(`\n🔐 Auth Schemes: ${parsed.authSchemes.length}`);
    parsed.authSchemes.forEach(auth => {
      console.log(`   - ${auth.name} (${auth.type})`);
    });
    console.log(`\n📦 Schemas: ${Object.keys(parsed.schemas).length}`);
    console.log(`   Sample schemas: ${Object.keys(parsed.schemas).slice(0, 5).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Parser test failed:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  testParser();
}
