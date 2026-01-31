import fs from 'fs/promises';
import path from 'path';
import type { TransformedAPI } from '../transformers/types';
import type { GeneratedCode } from '../gemini/code-generator';
import { createZipFromDirectory } from '../utils/zip-utils';
import { generateConfigFile } from './config-template';

/**
 * MCP Server Code Generator
 * Assembles generated code into a complete MCP server package
 */

export interface MCPPackage {
  packagePath: string;
  zipPath: string;
}

/**
 * Generate complete MCP server package
 */
export async function generateMCPServerPackage(
  api: TransformedAPI,
  generatedCode: GeneratedCode,
  outputDir: string
): Promise<MCPPackage> {
  // Create directory structure
  const packageName = `mcp-${api.info.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const packageDir = path.join(outputDir, packageName);
  
  await fs.mkdir(packageDir, { recursive: true });
  await fs.mkdir(path.join(packageDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(packageDir, 'src', 'tools'), { recursive: true });

  // Generate files
  await generatePackageJson(api, packageDir);
  await generateTsConfig(packageDir);
  await generateEnvExample(api, packageDir);
  await generateGitignore(packageDir);
  
  // Generate config file
  await generateConfigFileHelper(api, packageDir);

  // Generate source files
  if (generatedCode.types) {
    await generateTypesFile(generatedCode.types, packageDir);
  }
  
  if (generatedCode.mainServer) {
    await generateMainServerFile(generatedCode.mainServer, packageDir);
  } else {
    // Generate from components if mainServer not available
    await generateMainServerFromComponents(api, generatedCode, packageDir);
  }

  // Generate tool files
  await generateToolFiles(api, generatedCode, packageDir);

  // Generate README
  if (generatedCode.readme) {
    await generateReadmeFile(generatedCode.readme, packageDir);
  } else {
    await generateDefaultReadme(api, packageDir);
  }

  // Create ZIP package
  const zipPath = `${packageDir}.zip`;
  await createZipFromDirectory(packageDir, zipPath);

  return {
    packagePath: packageDir,
    zipPath,
  };
}

/**
 * Generate package.json
 */
async function generatePackageJson(api: TransformedAPI, packageDir: string): Promise<void> {
  let packageJson: any = {
    name: `mcp-${api.info.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    version: '1.0.0',
    description: `MCP server for ${api.info.title}`,
    type: 'module',
    main: 'dist/index.js',
    scripts: {
      build: 'tsc',
      start: 'node dist/index.js',
      dev: 'ts-node src/index.ts',
    },
    dependencies: {
      '@modelcontextprotocol/sdk': '^1.0.0',
      'dotenv': '^16.4.5',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      'typescript': '^5.9.3',
      'ts-node': '^10.9.2',
    },
    keywords: ['mcp', 'mcp-server', 'api'],
  };

  // Try to parse Gemini-generated package.json if available
  // For now, use the default structure above
  const packageJsonPath = path.join(packageDir, 'package.json');
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

/**
 * Generate tsconfig.json
 */
async function generateTsConfig(packageDir: string): Promise<void> {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      lib: ['ES2022'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      moduleResolution: 'node',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };

  const tsconfigPath = path.join(packageDir, 'tsconfig.json');
  await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
}

/**
 * Generate config.ts file
 */
async function generateConfigFileHelper(api: TransformedAPI, packageDir: string): Promise<void> {
  const configCode = generateConfigFile(api);
  const configPath = path.join(packageDir, 'src', 'config.ts');
  await fs.writeFile(configPath, configCode);
}

/**
 * Generate .env.example
 */
async function generateEnvExample(api: TransformedAPI, packageDir: string): Promise<void> {
  const envLines: string[] = [];
  
  envLines.push('# API Configuration');
  envLines.push(`API_BASE_URL=${api.baseUrl}`);
  
  // Add auth-related env vars
  for (const auth of api.authSchemes) {
    if (auth.type === 'apiKey') {
      envLines.push(`API_KEY=your_api_key_here`);
    } else if (auth.type === 'http' && auth.scheme === 'bearer') {
      envLines.push(`BEARER_TOKEN=your_bearer_token_here`);
    }
  }

  const envPath = path.join(packageDir, '.env.example');
  await fs.writeFile(envPath, envLines.join('\n') + '\n');
}

/**
 * Generate .gitignore
 */
async function generateGitignore(packageDir: string): Promise<void> {
  const gitignore = `node_modules/
dist/
.env
*.log
.DS_Store
`;

  const gitignorePath = path.join(packageDir, '.gitignore');
  await fs.writeFile(gitignorePath, gitignore);
}

/**
 * Generate types.ts file
 */
async function generateTypesFile(typesCode: string, packageDir: string): Promise<void> {
  // Extract code from markdown code blocks if present
  const code = extractCodeFromMarkdown(typesCode);
  const typesPath = path.join(packageDir, 'src', 'types.ts');
  await fs.writeFile(typesPath, code);
}

/**
 * Generate main server file (index.ts)
 */
async function generateMainServerFile(mainServerCode: string, packageDir: string): Promise<void> {
  // Extract code from markdown code blocks if present
  const code = extractCodeFromMarkdown(mainServerCode);
  const indexPath = path.join(packageDir, 'src', 'index.ts');
  await fs.writeFile(indexPath, code);
}

/**
 * Generate main server from components
 */
async function generateMainServerFromComponents(
  api: TransformedAPI,
  generatedCode: GeneratedCode,
  packageDir: string
): Promise<void> {
  const toolImports = api.endpoints.map(ep => 
    `import { ${ep.operationId} } from './tools/${ep.operationId}.js';`
  ).join('\n');

  const toolRegistrations = api.endpoints.map(ep => 
    `  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [${ep.operationId}Tool],
  }));`
  ).join('\n');

  const mainServerCode = `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

${toolImports}
import * as config from './config.js';


async function main() {
  const server = new Server(
    {
      name: '${api.info.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}',
      version: '${api.info.version}',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
${api.endpoints.map(ep => `      ${ep.operationId}Tool,`).join('\n')}
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    switch (name) {
${api.endpoints.map(ep => `      case '${ep.operationId}':
        return await ${ep.operationId}(args);`).join('\n')}
      default:
        throw new Error(\`Unknown tool: \${name}\`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server running on stdio');
}

main().catch(console.error);
`;

  const indexPath = path.join(packageDir, 'src', 'index.ts');
  await fs.writeFile(indexPath, mainServerCode);
}

/**
 * Generate tool files
 */
async function generateToolFiles(
  api: TransformedAPI,
  generatedCode: GeneratedCode,
  packageDir: string
): Promise<void> {
  const toolsDir = path.join(packageDir, 'src', 'tools');

  for (const endpoint of api.endpoints) {
    let toolCode: string;

    if (generatedCode.toolImplementations[endpoint.operationId]) {
      // Use generated implementation
      toolCode = extractCodeFromMarkdown(
        generatedCode.toolImplementations[endpoint.operationId]
      );
    } else {
      // Generate default implementation
      toolCode = generateDefaultToolImplementation(endpoint, api);
    }

    const toolPath = path.join(toolsDir, `${endpoint.operationId}.ts`);
    await fs.writeFile(toolPath, toolCode);
  }
}

/**
 * Generate default tool implementation
 */
function generateDefaultToolImplementation(
  endpoint: TransformedAPI['endpoints'][0],
  api: TransformedAPI
): string {
  const params = endpoint.parameters.map(p => 
    `${p.name}${p.required ? '' : '?'}: ${p.type}`
  ).join(', ');

  const queryParams = endpoint.parameters
    .filter(p => p.in === 'query')
    .map(p => `${p.name}: args.${p.name}`)
    .join(', ');

  const pathParams = endpoint.parameters
    .filter(p => p.in === 'path')
    .map(p => `\${args.${p.name}}`)
    .join('/');

  const apiKeyAuth = api.authSchemes.find(a => a.type === 'apiKey' && a.location === 'header');
  const bearerAuth = api.authSchemes.find(a => a.type === 'http' && a.scheme === 'bearer');
  
  const authHeaders: string[] = [];
  if (apiKeyAuth) {
    authHeaders.push(`    '${apiKeyAuth.apiKeyName || 'api_key'}': config.API_KEY,`);
  }
  if (bearerAuth) {
    authHeaders.push(`    'Authorization': \`Bearer \${config.BEARER_TOKEN}\`,`);
  }

  return `import * as config from '../config.js';

export const ${endpoint.operationId}Tool = {
  name: '${endpoint.operationId}',
  description: '${endpoint.summary || endpoint.description || ''}',
  inputSchema: {
    type: 'object',
    properties: {
${endpoint.parameters.map(p => `      ${p.name}: {
        type: '${p.type}',
        description: '${p.description || ''}',
      },`).join('\n')}
    },
    required: [${endpoint.parameters.filter(p => p.required).map(p => `'${p.name}'`).join(', ')}],
  },
};

export async function ${endpoint.operationId}(args: any) {
  // Construct URL properly - handle trailing slashes
  const baseUrl = config.API_BASE_URL.endsWith('/') 
    ? config.API_BASE_URL.slice(0, -1) 
    : config.API_BASE_URL;
  const pathTemplate = '${endpoint.path}';
  const pathWithParams = pathTemplate.replace(/\{([^}]+)\}/g, (_, param) => String(args[param] || ''));
  const url = \`\${baseUrl}\${pathWithParams.startsWith('/') ? '' : '/'}\${pathWithParams}\`;
  
  // Build query string
${endpoint.parameters.filter(p => p.in === 'query').length > 0 ? `  const queryParams = new URLSearchParams();
  ${endpoint.parameters.filter(p => p.in === 'query').map(p => `if (args.${p.name} !== undefined && args.${p.name} !== null) queryParams.append('${p.name}', String(args.${p.name}));`).join('\n  ')}
  const queryString = queryParams.toString();
  const fullUrl = queryString ? \`\${url}?\${queryString}\` : url;` : `  const fullUrl = url;`}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
${authHeaders.length > 0 ? authHeaders.join('\n') : ''}
  };

  const response = await fetch(fullUrl, {
    method: '${endpoint.method}',
    headers,
${endpoint.requestBody ? `    body: JSON.stringify(args.body),` : ''}
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(\`API error: \${response.status} \${response.statusText}. \${errorText}\`);
  }

  return await response.json();
}
`;
}

/**
 * Generate README file
 */
async function generateReadmeFile(readmeCode: string, packageDir: string): Promise<void> {
  // Extract markdown from code blocks if present
  const readme = extractCodeFromMarkdown(readmeCode, 'markdown');
  const readmePath = path.join(packageDir, 'README.md');
  await fs.writeFile(readmePath, readme);
}

/**
 * Generate default README
 */
async function generateDefaultReadme(api: TransformedAPI, packageDir: string): Promise<void> {
  const readme = `# MCP Server for ${api.info.title}

${api.info.description || ''}

## Installation

\`\`\`bash
npm install
\`\`\`

## Configuration

Copy \`.env.example\` to \`.env\` and configure your API credentials:

\`\`\`bash
cp .env.example .env
\`\`\`

## Usage

\`\`\`bash
npm run build
npm start
\`\`\`

## Available Tools

${api.endpoints.map(ep => `- **${ep.operationId}**: ${ep.summary || ep.description || ''}`).join('\n')}

## License

ISC
`;

  const readmePath = path.join(packageDir, 'README.md');
  await fs.writeFile(readmePath, readme);
}

/**
 * Extract code from markdown code blocks
 */
function extractCodeFromMarkdown(text: string, language: string = 'typescript'): string {
  // Try to find code blocks
  const codeBlockRegex = new RegExp(
    `\`\`\`${language}[\\s\\S]*?\\n([\\s\\S]*?)\`\`\``,
    'g'
  );
  const match = codeBlockRegex.exec(text);
  
  if (match && match[1]) {
    return match[1].trim();
  }

  // Try generic code block
  const genericCodeBlockRegex = /```[\s\S]*?\n([\s\S]*?)```/g;
  const genericMatch = genericCodeBlockRegex.exec(text);
  
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }

  // Return as-is if no code blocks found
  return text.trim();
}
