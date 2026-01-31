// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// State Management
let state = {
    file: null,
    fileId: null,
    packageId: null,
    uploadMetadata: null,
    generationStatus: null,
};

// DOM Elements
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');
const uploadBtn = document.getElementById('upload-btn');
const uploadSection = document.getElementById('upload-section');
const generateSection = document.getElementById('generate-section');
const statusSection = document.getElementById('status-section');
const downloadSection = document.getElementById('download-section');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const dismissErrorBtn = document.getElementById('dismiss-error');
const fileMetadata = document.getElementById('file-metadata');
const generateBtn = document.getElementById('generate-btn');
const statusMessage = document.getElementById('status-message');
const progressDetails = document.getElementById('progress-details');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const packageInfo = document.getElementById('package-info');

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
removeFileBtn.addEventListener('click', clearFile);
uploadBtn.addEventListener('click', handleUpload);
generateBtn.addEventListener('click', handleGenerate);
downloadBtn.addEventListener('click', handleDownload);
resetBtn.addEventListener('click', resetApp);
dismissErrorBtn.addEventListener('click', () => hideError());

// File Handling
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        setFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.yaml') || file.name.endsWith('.yml'))) {
        setFile(file);
    } else {
        showError('Please upload a JSON or YAML file');
    }
}

function setFile(file) {
    state.file = file;
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
    uploadBtn.classList.remove('hidden');
    uploadBtn.disabled = false;
}

function clearFile() {
    state.file = null;
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    uploadBtn.classList.add('hidden');
}

// API Calls
async function handleUpload() {
    if (!state.file) {
        showError('Please select a file first');
        return;
    }

    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        const formData = new FormData();
        formData.append('file', state.file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }

        state.fileId = data.data.fileId;
        state.uploadMetadata = data.data.api;

        // Show generate section
        displayFileMetadata(data.metadata);
        generateSection.classList.remove('hidden');
        uploadBtn.textContent = 'Upload File';
        uploadBtn.disabled = false;

    } catch (error) {
        showError(`Upload failed: ${error.message}`);
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload File';
    }
}

function displayFileMetadata(metadata) {
    fileMetadata.innerHTML = `
        <div class="metadata-item">
            <span class="metadata-label">Title:</span>
            <span class="metadata-value">${metadata.title || 'N/A'}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Version:</span>
            <span class="metadata-value">${metadata.version || 'N/A'}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Endpoints:</span>
            <span class="metadata-value">${metadata.endpointsCount || 0}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Base URL:</span>
            <span class="metadata-value">${metadata.baseUrl || 'N/A'}</span>
        </div>
    `;
}

async function handleGenerate() {
    if (!state.fileId) {
        showError('Please upload a file first');
        return;
    }

    try {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        statusSection.classList.remove('hidden');
        statusMessage.textContent = 'Generating MCP server...';
        progressDetails.innerHTML = '<div class="progress-item">Initializing code generation...</div>';

        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileId: state.fileId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Generation failed');
        }

        state.packageId = data.data.packageId;
        state.generationStatus = data.data;

        // Update status
        statusMessage.textContent = 'Generation complete!';
        progressDetails.innerHTML = `
            <div class="progress-item">✅ Generated ${data.data.toolsGenerated || 0} tools</div>
            <div class="progress-item">✅ Package: ${data.data.packageName || 'mcp-server'}</div>
        `;

        // Show download section after a brief delay
        setTimeout(() => {
            statusSection.classList.add('hidden');
            displayDownloadInfo(data);
            downloadSection.classList.remove('hidden');
        }, 1500);

    } catch (error) {
        showError(`Generation failed: ${error.message}`);
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate MCP Server';
    }
}

function displayDownloadInfo(data) {
    packageInfo.innerHTML = `
        <div class="package-info-item">
            <span class="package-info-label">Package Name:</span>
            <span class="package-info-value">${data.packageName || 'mcp-server'}</span>
        </div>
        <div class="package-info-item">
            <span class="package-info-label">Tools Generated:</span>
            <span class="package-info-value">${data.toolsGenerated || 0}</span>
        </div>
        <div class="package-info-item">
            <span class="package-info-label">Package ID:</span>
            <span class="package-info-value">${data.packageId || 'N/A'}</span>
        </div>
    `;
}

async function handleDownload() {
    if (!state.packageId) {
        showError('No package available for download');
        return;
    }

    try {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Downloading...';

        const response = await fetch(`${API_BASE_URL}/download/${state.packageId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Download failed');
        }

        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'mcp-server.zip';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download ZIP Package';

    } catch (error) {
        showError(`Download failed: ${error.message}`);
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download ZIP Package';
    }
}

function resetApp() {
    state = {
        file: null,
        fileId: null,
        packageId: null,
        uploadMetadata: null,
        generationStatus: null,
    };
    
    clearFile();
    generateSection.classList.add('hidden');
    statusSection.classList.add('hidden');
    downloadSection.classList.add('hidden');
    hideError();
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
    errorSection.classList.add('hidden');
}

// Check API health on load
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
            console.warn('API health check failed');
        }
    } catch (error) {
        console.warn('API health check failed:', error);
    }
}

// Initialize
checkHealth();
