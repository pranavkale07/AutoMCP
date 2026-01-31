# AutoMCP 🚀

**AutoMCP** is a powerful platform that automatically generates ready-to-use [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers from your backend API documentation. Simply upload your OpenAPI, Swagger, or Postman collection, and AutoMCP uses Google's Gemini AI to generate a complete, production-ready MCP server package.

## ✨ Features

- 🤖 **AI-Powered Generation**: Uses Google Gemini AI to generate high-quality MCP server code
- 📚 **Multiple Format Support**: Supports OpenAPI 3.x, Swagger 2.x, and Postman Collections
- 🔧 **Complete Package Generation**: Generates full MCP server with:
  - TypeScript tool implementations
  - Type definitions
  - Configuration files
  - Package.json with dependencies
  - Comprehensive README
- 🎯 **Smart Parsing**: Automatically extracts endpoints, parameters, schemas, and authentication schemes
- 📦 **Ready-to-Use**: Generated packages are immediately deployable
- 🔒 **Secure**: Local file storage, no cloud dependencies
- 🚀 **Fast**: Efficient parsing and code generation pipeline

## 📋 Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/api-key))

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AutoMCP
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-1.5-pro
   GEMINI_MAX_TOKENS=32768
   MAX_FILE_SIZE=10485760
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `GEMINI_API_KEY` | Google Gemini API key | **Required** |
| `GEMINI_MODEL` | Gemini model to use | `gemini-1.5-pro` |
| `GEMINI_TEMPERATURE` | Generation temperature | `0.7` |
| `GEMINI_MAX_TOKENS` | Maximum tokens per request | `32768` |
| `MAX_FILE_SIZE` | Max upload file size (bytes) | `10485760` (10MB) |
| `NODE_ENV` | Environment mode | `development` |

### Supported Gemini Models

- `gemini-1.5-pro` (Recommended)
- `gemini-pro`
- `gemini-1.5-flash`

To list available models:
```bash
npm run list-models
```

## 🚀 Usage

### Start the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

### API Workflow

#### 1. Upload API Documentation

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@your-api-docs.json"
```

**Response:**
```json
{
  "status": "success",
  "fileId": "8f4be01f-236d-4f67-8b70-6cf347b81d12",
  "filename": "pet-store-openapi.json",
  "metadata": {
    "title": "Swagger Petstore",
    "version": "1.0.0",
    "endpoints": 19
  }
}
```

#### 2. Generate MCP Server

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "8f4be01f-236d-4f67-8b70-6cf347b81d12"
  }'
```

**Response:**
```json
{
  "status": "success",
  "packageId": "8f4be01f-236d-4f67-8b70-6cf347b81d12",
  "packageName": "mcp-swagger-petstore---openapi-3-0",
  "downloadUrl": "/api/download/8f4be01f-236d-4f67-8b70-6cf347b81d12",
  "toolsGenerated": 19
}
```

#### 3. Check Generation Status

```bash
curl http://localhost:3000/api/status/8f4be01f-236d-4f67-8b70-6cf347b81d12
```

#### 4. Download Generated Package

```bash
curl -O http://localhost:3000/api/download/8f4be01f-236d-4f67-8b70-6cf347b81d12
```

Or open in browser:
```
http://localhost:3000/api/download/8f4be01f-236d-4f67-8b70-6cf347b81d12
```

### Using Postman

Import the provided Postman collection (`AutoMCP.postman_collection.json`) for easy testing. See [POSTMAN_SETUP.md](./POSTMAN_SETUP.md) for details.

## 📚 API Documentation

### Endpoints

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

#### `POST /api/upload`
Upload API documentation file (OpenAPI/Swagger/Postman).

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` (file field)

**Response:**
```json
{
  "status": "success",
  "fileId": "uuid",
  "filename": "api-docs.json",
  "metadata": { ... }
}
```

#### `POST /api/generate`
Generate MCP server from uploaded file.

**Request:**
```json
{
  "fileId": "uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "packageId": "uuid",
  "packageName": "mcp-api-name",
  "downloadUrl": "/api/download/uuid",
  "toolsGenerated": 19
}
```

#### `GET /api/download/:id`
Download generated MCP server package as ZIP.

**Response:**
- Content-Type: `application/zip`
- File: `mcp-server-package.zip`

#### `GET /api/status/:id`
Get generation status of a package.

**Response:**
```json
{
  "status": "completed",
  "packageId": "uuid",
  "packageName": "mcp-api-name",
  "toolsGenerated": 19,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

## 🏗️ Architecture

```
AutoMCP
├── API Layer (Express)
│   ├── Upload Controller
│   ├── Generate Controller
│   └── Download Controller
├── Parser Layer
│   ├── OpenAPI Parser
│   ├── Schema Resolver
│   └── Data Transformer
├── Gemini Integration
│   ├── Gemini Client (with retry logic)
│   ├── Code Generator
│   └── Prompt Templates
├── Generator Layer
│   ├── MCP Package Generator
│   └── Config Template Generator
└── Storage Layer
    ├── File Storage (Local)
    └── Package Storage (Local)
```

### Data Flow

1. **Upload** → File saved to temp storage
2. **Parse** → OpenAPI/Swagger parsed into structured format
3. **Transform** → Data normalized for Gemini prompts
4. **Generate** → Gemini AI generates MCP server code
5. **Assemble** → Code assembled into complete package
6. **Package** → ZIP archive created
7. **Download** → Package available for download

## 🧪 Testing the Generated MCP Server

### 1. Extract and Install

```bash
unzip mcp-server-package.zip
cd mcp-server-package
npm install
```

### 2. Configure

Create `.env` file:
```env
API_BASE_URL=https://your-api.com/v2
API_KEY=your_api_key
```

### 3. Build

```bash
npm run build
```

### 4. Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a web UI at `http://localhost:5173` where you can test all generated tools.

### 5. Test Individual Tools

```bash
node -e "
import('./dist/tools/getPetById.js').then(m => 
  m.getPetById({petId: 1})
    .then(console.log)
    .catch(console.error)
);
"
```

## 🔧 Development

### Project Structure

```
src/
├── api/              # API routes and controllers
├── config/           # Configuration management
├── gemini/           # Gemini AI integration
├── generators/       # MCP package generators
├── middleware/       # Express middleware
├── parsers/          # API documentation parsers
├── transformers/     # Data transformers
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── server.ts         # Main server entry point
```

### Development Commands

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Production start
npm start

# List available Gemini models
npm run list-models
```

### Code Style

- TypeScript with strict mode
- ES2020 target
- CommonJS modules
- Express.js for API
- Async/await for async operations

## 🐛 Troubleshooting

### Common Issues

#### 1. Gemini API Errors

**Error:** `404 Not Found - models/gemini-X is not found`

**Solution:**
- Check available models: `npm run list-models`
- Update `GEMINI_MODEL` in `.env` to a valid model
- The system will auto-detect and use available models

#### 2. File Upload Errors

**Error:** `File too large`

**Solution:**
- Increase `MAX_FILE_SIZE` in `.env`
- Or compress your API documentation file

#### 3. Generation Timeout

**Error:** `Generation timeout`

**Solution:**
- Increase `GEMINI_MAX_TOKENS` in `.env`
- Split large APIs into smaller services
- Check Gemini API quota limits

#### 4. Generated MCP Server Errors

**Error:** `API error: 500 Internal Server Error`

**Solution:**
- Check the API base URL in generated `config.ts`
- Verify API authentication credentials
- Test the API directly with `curl`

### Debug Mode

Enable verbose logging:
```bash
DEBUG=* npm run dev
```

## 📝 Generated Package Structure

```
mcp-api-name/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── config.ts         # Configuration
│   ├── types.ts          # TypeScript types
│   └── tools/            # Generated tool implementations
│       ├── getPetById.ts
│       ├── addPet.ts
│       └── ...
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── .env.example          # Environment template
├── .gitignore
└── README.md             # Usage instructions
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC License

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io) - The MCP specification
- [Google Gemini AI](https://ai.google.dev) - AI code generation
- [OpenAPI Initiative](https://www.openapis.org) - API specification standard

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

## 🗺️ Roadmap

- [ ] Support for Postman Collections
- [ ] Swagger 2.x support improvements
- [ ] Custom prompt templates
- [ ] Batch generation
- [ ] Cloud storage integration
- [ ] Web UI dashboard
- [ ] API versioning support
- [ ] Authentication scheme improvements

---

**Built with ❤️ for the hackathon**
