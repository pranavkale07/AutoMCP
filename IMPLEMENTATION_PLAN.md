# AutoMCP Implementation Plan

## Overview
Step-by-step implementation plan for building AutoMCP - a platform to generate MCP servers from OpenAPI documentation.

## Implementation Steps

### Step 1: File Storage Utilities ✅
**Goal**: Create temp directory structure and file storage utilities
- Create temp directory structure (uploads/, generated/)
- File storage utilities (save, read, delete)
- Path validation and security
- UUID-based session management
- Update .gitignore (already done)

**Files to create**:
- `src/utils/file-storage.ts`
- `src/utils/path-utils.ts`
- `src/types/storage.ts`

---

### Step 2: OpenAPI Parser
**Goal**: Parse OpenAPI 3.x files and extract structured data
- Parse OpenAPI JSON/YAML
- Extract endpoints (path, method, operationId)
- Extract parameters (query, path, header)
- Extract request bodies and response schemas
- Extract authentication schemes
- Resolve schema references ($ref)
- Extract base URL from servers

**Files to create**:
- `src/parsers/openapi-parser.ts`
- `src/parsers/types.ts`
- `src/parsers/schema-resolver.ts`

---

### Step 3: Data Transformation
**Goal**: Normalize parsed data into format suitable for Gemini
- Transform parsed data to structured format
- Resolve all schema references
- Create normalized endpoint structure
- Extract authentication information
- Prepare data for Gemini prompts

**Files to create**:
- `src/transformers/api-transformer.ts`
- `src/transformers/types.ts`

---

### Step 4: Gemini Client Setup
**Goal**: Initialize Gemini API client
- Set up Gemini API client
- Configure API key from environment
- Create client wrapper with error handling
- Test connection

**Files to create**:
- `src/gemini/gemini-client.ts`
- `src/gemini/types.ts`

---

### Step 5: Gemini Prompts
**Goal**: Design prompts for MCP code generation
- Create prompt templates
- Tool definition generation prompt
- Implementation code generation prompt
- Schema to TypeScript types prompt

**Files to create**:
- `src/gemini/prompts.ts`
- `src/gemini/code-generator.ts`

---

### Step 6: MCP Code Generator
**Goal**: Assemble generated code into complete MCP server package
- Create MCP server template structure
- Inject Gemini-generated code
- Generate package.json, tsconfig.json
- Generate README.md
- Create ZIP package

**Files to create**:
- `src/generators/mcp-generator.ts`
- `src/generators/template-engine.ts`
- `src/generators/templates/` (template files)
- `src/utils/zip-utils.ts`

---

### Step 7: API Endpoints
**Goal**: Create Express routes for upload, generate, and download
- POST /api/upload - Upload OpenAPI file
- POST /api/generate - Generate MCP server
- GET /api/download/:id - Download generated package
- GET /api/status/:id - Check generation status
- Error handling middleware

**Files to create**:
- `src/api/controllers/upload.controller.ts`
- `src/api/controllers/generate.controller.ts`
- `src/api/controllers/download.controller.ts`
- `src/api/routes.ts` (update)
- `src/middleware/error-handler.ts`
- `src/middleware/upload.ts`

---

### Step 8: Cleanup Service
**Goal**: Implement file cleanup mechanism
- Background cleanup service
- Delete old files (time-based)
- Cleanup after download
- Scheduled cleanup job

**Files to create**:
- `src/services/cleanup.service.ts`
- `src/utils/cleanup.ts`

---

## Testing Strategy
- Test each step with pet-store-openapi.json
- Verify file operations
- Test Gemini integration
- End-to-end flow testing

## Dependencies to Install
- Already installed: express, cors, dotenv, multer, @google/generative-ai, js-yaml
- May need: archiver (for ZIP), uuid (for session IDs)
