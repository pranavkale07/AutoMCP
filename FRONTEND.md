# AutoMCP Frontend

## Overview

A modern, responsive web interface for AutoMCP that allows users to upload API documentation and generate MCP servers through an intuitive UI.

## Features

- 📤 **File Upload**: Drag & drop or click to upload OpenAPI/Swagger files
- 🔄 **Real-time Status**: Live generation progress updates
- 📦 **Download**: One-click download of generated MCP server packages
- 🎨 **Modern UI**: Clean, responsive design with smooth animations
- ⚠️ **Error Handling**: Clear error messages and recovery options

## File Structure

```
public/
├── index.html    # Main HTML structure
├── styles.css    # Styling and responsive design
└── app.js        # Frontend logic and API integration
```

## Usage

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Open browser**:
   Navigate to `http://localhost:3000`

3. **Upload & Generate**:
   - Upload an OpenAPI/Swagger JSON or YAML file
   - Click "Generate MCP Server"
   - Wait for generation to complete
   - Download the ZIP package

## API Integration

The frontend integrates with the following endpoints:

- `POST /api/upload` - Upload API documentation file
- `POST /api/generate` - Generate MCP server from uploaded file
- `GET /api/download/:id` - Download generated package
- `GET /api/status/:id` - Check generation status
- `GET /api/health` - Health check

## Design Features

- **Color Scheme**: Modern indigo/purple gradient theme
- **Responsive**: Works on desktop, tablet, and mobile
- **Animations**: Smooth transitions and loading indicators
- **Accessibility**: Semantic HTML and keyboard navigation support

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

---

Built with vanilla HTML/CSS/JavaScript for simplicity and performance.
