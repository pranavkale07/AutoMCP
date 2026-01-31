/**
 * Quick test script for Gemini client
 * Run with: npx ts-node src/gemini/__test__.ts
 * 
 * Note: Requires GEMINI_API_KEY in .env file
 */

import { createGeminiClient } from './gemini-client';

async function testGeminiClient() {
  try {
    console.log('🔧 Creating Gemini client...');
    const client = createGeminiClient();
    
    console.log(`✅ Gemini client created successfully!`);
    console.log(`   Model: ${client.getModelName()}`);
    
    // Test connection (only if API key is set)
    if (process.env.GEMINI_API_KEY) {
      console.log('\n🔌 Testing connection to Gemini API...');
      const connected = await client.testConnection();
      
      if (connected) {
        console.log('✅ Connection test successful!');
        
        // Test a simple generation
        console.log('\n📝 Testing text generation...');
        const response = await client.generateText('Say "Hello, AutoMCP!" in one sentence.', {
          maxTokens: 50,
        });
        
        console.log(`✅ Generated text: ${response.text}`);
        if (response.usage) {
          console.log(`   Tokens used: ${response.usage.totalTokens}`);
        }
      } else {
        console.log('❌ Connection test failed');
      }
    } else {
      console.log('\n⚠️  GEMINI_API_KEY not set in environment');
      console.log('   Client structure is correct, but API calls require an API key');
      console.log('   Set GEMINI_API_KEY in .env file to test actual API calls');
    }
    
  } catch (error: any) {
    if (error.message.includes('GEMINI_API_KEY')) {
      console.log('⚠️  GEMINI_API_KEY not set in environment');
      console.log('   Client structure is correct, but API calls require an API key');
      console.log('   Set GEMINI_API_KEY in .env file to test actual API calls');
    } else {
      console.error('❌ Gemini client test failed:', error.message);
      process.exit(1);
    }
  }
}

// Only run if executed directly
if (require.main === module) {
  testGeminiClient();
}
