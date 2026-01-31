import { GeminiClient } from './gemini-client';
import type { TransformedAPI, TransformedEndpoint } from '../transformers/types';
import {
  createToolDefinitionsPrompt,
  createToolImplementationPrompt,
  createTypesGenerationPrompt,
  createMainServerPrompt,
  createPackageJsonPrompt,
  createReadmePrompt,
  createCompleteServerPrompt,
} from './prompts';

/**
 * Code generator using Gemini API
 */

export interface GeneratedCode {
  toolDefinitions?: string;
  toolImplementations: Record<string, string>;
  types?: string;
  mainServer?: string;
  packageJson?: string;
  readme?: string;
}

export class CodeGenerator {
  private client: GeminiClient;

  constructor(client: GeminiClient) {
    this.client = client;
  }

  /**
   * Generate complete MCP server code (all-in-one approach)
   * Best for smaller APIs or when you want everything in one generation
   */
  async generateCompleteServer(api: TransformedAPI): Promise<GeneratedCode> {
    const prompt = createCompleteServerPrompt(api);
    
    console.log('\n🚀 [CodeGenerator] Generating complete MCP server...');
    console.log(`   API: ${api.info.title}`);
    console.log(`   Endpoints: ${api.endpoints.length}`);
    console.log(`   Schemas: ${Object.keys(api.schemas).length}`);
    console.log(`   Prompt Size: ${prompt.length} characters`);
    
    const response = await this.client.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 32768,
    });
    
    console.log(`   ✅ Code generation completed`);
    console.log(`   📝 Generated Code Length: ${response.text.length} characters`);

    // Parse the response to extract different sections
    // For now, return as a single blob - we'll parse it in the generator
    return {
      mainServer: response.text,
      toolImplementations: {},
    };
  }

  /**
   * Generate MCP tool definitions from API endpoints
   */
  async generateToolDefinitions(api: TransformedAPI): Promise<string> {
    const prompt = createToolDefinitionsPrompt(api);
    
    console.log('\n🔧 [CodeGenerator] Generating tool definitions...');
    console.log(`   Endpoints: ${api.endpoints.length}`);
    
    const response = await this.client.generateText(prompt, {
      temperature: 0.5, // Lower temperature for more structured output
      maxTokens: 8192,
    });
    
    console.log(`   ✅ Tool definitions generated (${response.text.length} chars)`);

    return response.text;
  }

  /**
   * Generate tool implementation for a single endpoint
   */
  async generateToolImplementation(
    endpoint: TransformedEndpoint,
    api: TransformedAPI
  ): Promise<string> {
    const prompt = createToolImplementationPrompt(endpoint, api);
    
    console.log(`\n⚙️  [CodeGenerator] Generating tool: ${endpoint.operationId}`);
    console.log(`   Method: ${endpoint.method} ${endpoint.path}`);
    
    const response = await this.client.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 4096,
    });
    
    console.log(`   ✅ Tool implementation generated (${response.text.length} chars)`);

    return response.text;
  }

  /**
   * Generate all tool implementations
   */
  async generateAllToolImplementations(
    api: TransformedAPI
  ): Promise<Record<string, string>> {
    const implementations: Record<string, string> = {};
    const totalEndpoints = api.endpoints.length;
    let successCount = 0;
    let errorCount = 0;

    console.log(`\n📦 [CodeGenerator] Generating ${totalEndpoints} tool implementations...`);

    // Generate implementations for each endpoint
    for (let i = 0; i < api.endpoints.length; i++) {
      const endpoint = api.endpoints[i];
      console.log(`\n   [${i + 1}/${totalEndpoints}] Processing ${endpoint.operationId}...`);
      
      try {
        const code = await this.generateToolImplementation(endpoint, api);
        implementations[endpoint.operationId] = code;
        successCount++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        errorCount++;
        implementations[endpoint.operationId] = `// Error generating implementation: ${error.message}`;
      }
    }

    console.log(`\n✅ [CodeGenerator] Tool generation complete:`);
    console.log(`   Success: ${successCount}/${totalEndpoints}`);
    console.log(`   Errors: ${errorCount}/${totalEndpoints}`);

    return implementations;
  }

  /**
   * Generate TypeScript types from schemas
   */
  async generateTypes(api: TransformedAPI): Promise<string> {
    const prompt = createTypesGenerationPrompt(api);
    const schemaCount = Object.keys(api.schemas).length;
    
    console.log('\n📝 [CodeGenerator] Generating TypeScript types...');
    console.log(`   Schemas: ${schemaCount}`);
    
    const response = await this.client.generateText(prompt, {
      temperature: 0.3, // Very low temperature for type definitions
      maxTokens: 8192,
    });
    
    console.log(`   ✅ Types generated (${response.text.length} chars)`);

    return response.text;
  }

  /**
   * Generate main MCP server file
   */
  async generateMainServer(
    api: TransformedAPI,
    toolNames: string[]
  ): Promise<string> {
    const prompt = createMainServerPrompt(api, toolNames);
    
    console.log('\n🖥️  [CodeGenerator] Generating main server file...');
    console.log(`   Tools: ${toolNames.length}`);
    
    const response = await this.client.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 4096,
    });
    
    console.log(`   ✅ Main server file generated (${response.text.length} chars)`);

    return response.text;
  }

  /**
   * Generate package.json
   */
  async generatePackageJson(api: TransformedAPI): Promise<string> {
    const prompt = createPackageJsonPrompt(api);
    
    console.log('\n📦 [CodeGenerator] Generating package.json...');
    
    const response = await this.client.generateText(prompt, {
      temperature: 0.2, // Very low temperature for JSON
      maxTokens: 2048,
    });
    
    console.log(`   ✅ package.json generated (${response.text.length} chars)`);

    return response.text;
  }

  /**
   * Generate README.md
   */
  async generateReadme(api: TransformedAPI, toolNames: string[]): Promise<string> {
    const prompt = createReadmePrompt(api, toolNames);
    
    console.log('\n📖 [CodeGenerator] Generating README.md...');
    
    const response = await this.client.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 4096,
    });
    
    console.log(`   ✅ README.md generated (${response.text.length} chars)`);

    return response.text;
  }

  /**
   * Generate all code components (modular approach)
   */
  async generateAllComponents(api: TransformedAPI): Promise<GeneratedCode> {
    const code: GeneratedCode = {
      toolImplementations: {},
    };

    try {
      // Generate types first
      code.types = await this.generateTypes(api);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate tool definitions
      code.toolDefinitions = await this.generateToolDefinitions(api);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate tool implementations
      code.toolImplementations = await this.generateAllToolImplementations(api);

      // Generate main server
      const toolNames = api.endpoints.map(ep => ep.operationId);
      code.mainServer = await this.generateMainServer(api, toolNames);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate package.json
      code.packageJson = await this.generatePackageJson(api);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate README
      code.readme = await this.generateReadme(api, toolNames);

    } catch (error) {
      console.error('Error generating code components:', error);
      throw error;
    }

    return code;
  }
}
