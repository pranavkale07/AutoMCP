# Postman Collection Setup Guide

## Import Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `AutoMCP.postman_collection.json`
5. Click **Import**

## Collection Variables

The collection uses the following variables:

- `base_url`: API base URL (default: `http://localhost:3000`)
- `file_id`: Automatically set after uploading a file
- `package_id`: Automatically set after generating a package

### Setting Base URL

1. Click on the collection name
2. Go to **Variables** tab
3. Update `base_url` if your server runs on a different port/host

## Testing Workflow

### Quick Test (Individual Endpoints)

1. **Health Check**
   - Run `GET /api/health` to verify server is running

2. **Upload File**
   - Run `POST /api/upload`
   - Select `pet-store-openapi.json` file in the body
   - Note the `file_id` from response (automatically saved)

3. **Generate MCP Server**
   - Run `POST /api/generate`
   - Uses `file_id` from previous step
   - Wait for generation to complete (may take 30-60 seconds)

4. **Check Status**
   - Run `GET /api/status/:id`
   - Verify package is ready

5. **Download Package**
   - Run `GET /api/download/:id`
   - ZIP file will be downloaded

### Complete Flow (Recommended)

Use the **"Complete Flow - Upload and Generate"** folder:

1. Run all requests in sequence (1 → 2 → 3 → 4)
2. Variables are automatically passed between requests
3. Check console for progress messages

## Request Details

### 1. Upload OpenAPI File
- **Method**: POST
- **Endpoint**: `/api/upload`
- **Body**: form-data with `file` field
- **File Types**: `.json`, `.yaml`, `.yml`
- **Max Size**: 5MB (configurable)

**Response**:
```json
{
  "status": "success",
  "data": {
    "fileId": "uuid-here",
    "filename": "pet-store-openapi.json",
    "api": {
      "title": "Swagger Petstore",
      "endpointsCount": 19
    }
  }
}
```

### 2. Generate MCP Server
- **Method**: POST
- **Endpoint**: `/api/generate`
- **Body**: `{ "fileId": "uuid-from-upload" }`
- **Duration**: 30-60 seconds (depends on API size)

**Response**:
```json
{
  "status": "success",
  "data": {
    "packageId": "uuid-here",
    "downloadUrl": "/api/download/uuid-here"
  }
}
```

### 3. Check Package Status
- **Method**: GET
- **Endpoint**: `/api/status/:id`

**Response**:
```json
{
  "status": "success",
  "data": {
    "packageId": "uuid-here",
    "exists": true,
    "ready": true,
    "downloadUrl": "/api/download/uuid-here"
  }
}
```

### 4. Download Package
- **Method**: GET
- **Endpoint**: `/api/download/:id`
- **Response**: ZIP file download

## Tips

1. **File Upload**: Make sure to select the file in the body's form-data section
2. **Generation Time**: Generation can take 30-60 seconds. Be patient!
3. **Variables**: The collection automatically saves `file_id` and `package_id` for you
4. **Error Handling**: Check the response body for error messages
5. **Console**: Open Postman console (View → Show Postman Console) to see test script outputs

## Troubleshooting

### "File not found" error
- Make sure you uploaded the file first
- Check that `file_id` variable is set correctly

### "Package not found" error
- Wait for generation to complete
- Check status endpoint first

### Generation fails
- Verify Gemini API key is set in `.env`
- Check server logs for detailed error messages
- Ensure OpenAPI file is valid

### Download doesn't work
- Make sure package generation completed successfully
- Check status endpoint to verify package is ready

## Example Test File

Use `pet-store-openapi.json` from the project root for testing.

## Environment Setup

Make sure your server is running:
```bash
npm run dev
```

Server should be accessible at `http://localhost:3000`
