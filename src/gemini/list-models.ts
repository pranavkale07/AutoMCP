/**
 * Utility to list available Gemini models
 * Run with: npx ts-node src/gemini/list-models.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function listAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set in environment');
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try to list models using the API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as {
      models?: Array<{
        name: string;
        displayName?: string;
        description?: string;
        supportedGenerationMethods?: string[];
      }>;
    };
    
    console.log('✅ Available Gemini Models:\n');
    
    if (data.models && Array.isArray(data.models)) {
      const models = data.models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => ({
          name: m.name.replace('models/', ''),
          displayName: m.displayName,
          description: m.description,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      models.forEach((model) => {
        console.log(`📦 ${model.name}`);
        if (model.displayName) {
          console.log(`   Display: ${model.displayName}`);
        }
        if (model.description) {
          console.log(`   ${model.description}`);
        }
        console.log('');
      });
      
      console.log(`\n💡 Total models: ${models.length}`);
      console.log('\n💡 Recommended models for code generation:');
      console.log('   - gemini-1.5-pro (best for complex code generation)');
      console.log('   - gemini-1.5-flash (faster, good for simpler tasks)');
    } else {
      console.log('⚠️  No models found in response');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error: any) {
    console.error('❌ Error listing models:', error.message);
    console.error('\n💡 Common available models:');
    console.error('   - gemini-1.5-pro');
    console.error('   - gemini-1.5-flash');
    console.error('   - gemini-pro');
    process.exit(1);
  }
}

if (require.main === module) {
  listAvailableModels();
}
