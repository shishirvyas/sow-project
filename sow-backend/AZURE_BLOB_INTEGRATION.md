# Azure Blob Storage Integration for SOW Documents

## Overview

The SOW backend now supports uploading and processing documents directly from Azure Blob Storage instead of the local filesystem.

## New Workflow

```
Frontend → Upload SOW → Azure Blob Storage → Backend Downloads → Process → Store Results
```

## API Endpoints

### 1. Upload SOW Document

**POST** `/api/v1/upload-sow`

Upload a SOW document (PDF, DOCX, or TXT) to Azure Blob Storage.

**Request:**
- Content-Type: `multipart/form-data`
- Body: File upload field named `file`

**Example (curl):**
```bash
curl -X POST http://localhost:8000/api/v1/upload-sow \
  -F "file=@/path/to/contract.pdf"
```

**Example (JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:8000/api/v1/upload-sow', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.blob_name); // Use this for processing
```

**Response:**
```json
{
  "message": "SOW uploaded successfully",
  "blob_name": "20251122_143052_contract.pdf",
  "url": "https://sowstorage.blob.core.windows.net/sow-uploads/20251122_143052_contract.pdf",
  "size": 245678,
  "content_type": "application/pdf",
  "original_filename": "contract.pdf"
}
```

### 2. Process SOW from Blob

**POST** `/api/v1/process-sow/{blob_name}`

Process a SOW document that's already in Azure Blob Storage.

**Path Parameter:**
- `blob_name` - The blob name returned from the upload endpoint

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/process-sow/20251122_143052_contract.pdf
```

**Response:**
```json
{
  "blob_name": "20251122_143052_contract.pdf",
  "prompts_processed": 3,
  "trigger_hits": 12,
  "results": {
    "ADM-E01": {
      "detected": true,
      "findings": [...],
      "overall_risk": "medium",
      "actions": [...],
      "meta": {
        "source_blob": "20251122_143052_contract.pdf",
        "prompt_name": "ADM-E01",
        "trigger_hits": 12
      }
    },
    "ADM-E04": {...},
    "ADM-R01": {...}
  }
}
```

### 3. List All SOWs

**GET** `/api/v1/sows?limit=100`

List all SOW documents in Azure Blob Storage.

**Query Parameters:**
- `limit` (optional) - Maximum number of results (default: 100)

**Response:**
```json
{
  "sows": [
    {
      "blob_name": "20251122_143052_contract.pdf",
      "size": 245678,
      "created": "2025-11-22T14:30:52Z",
      "last_modified": "2025-11-22T14:30:52Z",
      "content_type": "application/pdf",
      "metadata": {
        "original_filename": "contract.pdf",
        "upload_timestamp": "20251122_143052"
      }
    }
  ],
  "count": 1
}
```

### 4. Get SOW Metadata

**GET** `/api/v1/sows/{blob_name}`

Get metadata for a specific SOW document.

**Example:**
```bash
curl http://localhost:8000/api/v1/sows/20251122_143052_contract.pdf
```

### 5. Delete SOW

**DELETE** `/api/v1/sows/{blob_name}`

Delete a SOW document from Azure Blob Storage.

**Example:**
```bash
curl -X DELETE http://localhost:8000/api/v1/sows/20251122_143052_contract.pdf
```

**Response:**
```json
{
  "message": "SOW deleted successfully",
  "blob_name": "20251122_143052_contract.pdf"
}
```

## Setup Instructions

### 1. Create Azure Storage Account

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Storage Account**
   - Performance: Standard
   - Redundancy: LRS (Locally Redundant Storage)
   - Access tier: Hot
3. Create a container named `sow-uploads`
4. Set public access level: **Private** (recommended)

### 2. Get Connection String

1. Navigate to your Storage Account
2. Go to **Security + networking** → **Access keys**
3. Copy the **Connection string** under key1 or key2

### 3. Update Environment Variables

Edit `.env` file:

```bash
# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT_NAME;AccountKey=YOUR_ACCOUNT_KEY;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=sow-uploads
```

Replace `YOUR_ACCOUNT_NAME` and `YOUR_ACCOUNT_KEY` with your actual values.

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

New dependencies added:
- `azure-storage-blob` - Azure Blob Storage SDK
- `python-multipart` - For file upload support

### 5. Test the Integration

```bash
# Start the server
cd sow-backend
python -m uvicorn src.app.main:app --reload --host 127.0.0.1 --port 8000

# Test upload
curl -X POST http://localhost:8000/api/v1/upload-sow \
  -F "file=@resources/sow-docs/ADM_SOW_Testing.docx"

# Copy the blob_name from response, then process
curl -X POST http://localhost:8000/api/v1/process-sow/BLOB_NAME_HERE
```

## Frontend Integration Example

### React Upload Component

```jsx
import { useState } from 'react';

function SOWUploader() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [blobName, setBlobName] = useState('');
  const [results, setResults] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload to Azure Blob
      const uploadRes = await fetch('http://localhost:8000/api/v1/upload-sow', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      setBlobName(uploadData.blob_name);

      // Process the uploaded SOW
      setProcessing(true);
      const processRes = await fetch(
        `http://localhost:8000/api/v1/process-sow/${uploadData.blob_name}`,
        { method: 'POST' }
      );
      const processData = await processRes.json();
      setResults(processData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button disabled={!file || uploading || processing}>
          {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Upload & Analyze'}
        </button>
      </form>

      {results && (
        <div>
          <h3>Analysis Complete</h3>
          <p>Blob: {blobName}</p>
          <p>Prompts Processed: {results.prompts_processed}</p>
          {/* Display results */}
        </div>
      )}
    </div>
  );
}
```

## Architecture

### Components

1. **AzureBlobService** (`src/app/services/azure_blob_service.py`)
   - Handles all Azure Blob Storage operations
   - Upload, download, list, delete SOWs
   - Manages blob metadata

2. **SOWProcessor** (`src/app/services/sow_processor.py`)
   - Downloads SOW from blob to temp file
   - Extracts text using existing helpers
   - Processes through all prompts
   - Saves results to `resources/output/`

3. **API Endpoints** (`src/app/api/v1/endpoints.py`)
   - `/upload-sow` - File upload endpoint
   - `/process-sow/{blob_name}` - Processing trigger
   - `/sows` - List/manage SOWs

### Data Flow

```
1. Frontend uploads file
   ↓
2. Backend receives multipart/form-data
   ↓
3. File uploaded to Azure Blob Storage
   ↓
4. Blob name returned to frontend
   ↓
5. Frontend triggers processing with blob name
   ↓
6. Backend downloads blob to temp file
   ↓
7. Text extracted from temp file
   ↓
8. LLM analysis performed
   ↓
9. Results saved to local output folder
   ↓
10. Results returned to frontend
```

## Benefits

✅ **Scalability** - No local storage limits
✅ **Reliability** - Azure handles redundancy
✅ **Security** - Centralized access control
✅ **Versioning** - Track document changes
✅ **Cost-Effective** - Pay only for storage used
✅ **Multi-Instance** - Multiple backend instances can share storage
✅ **Backup** - Automatic Azure backup options

## Migration from Local Files

The old endpoint `/api/v1/process-sows` is deprecated but still works for backward compatibility.

To migrate:
1. Upload existing SOWs from `resources/sow-docs/` using `/upload-sow`
2. Use new blob-based processing endpoints
3. Eventually remove local file processing

## Security Considerations

1. **Connection String** - Keep secure, never commit to git
2. **Container Access** - Use private containers
3. **SAS Tokens** - Consider using SAS tokens instead of connection string for production
4. **File Validation** - Backend validates file types (.pdf, .docx, .txt)
5. **File Size** - Consider adding size limits (currently unlimited)

## Cost Estimation

**Example for 1000 SOWs (2MB each):**
- Storage: 2GB × $0.02/GB = $0.04/month
- Transactions: ~5000 operations × $0.0004/10k = $0.0002/month
- **Total: ~$0.05/month**

## Troubleshooting

### Connection String Error
```
ValueError: AZURE_STORAGE_CONNECTION_STRING not found
```
**Solution:** Add the connection string to `.env` file

### Container Not Found
```
The specified container does not exist
```
**Solution:** Create the container in Azure Portal or it will be auto-created on first upload

### File Too Large
**Solution:** Add size validation in endpoint or configure Azure limits

### Slow Upload/Download
**Solution:** 
- Choose Azure region closest to your users
- Consider CDN for downloads
- Upgrade to Premium storage tier for high-throughput scenarios

## Next Steps

1. Add authentication/authorization to endpoints
2. Implement file size limits
3. Add progress tracking for large files
4. Implement blob lifecycle management (auto-archive old SOWs)
5. Add rate limiting
6. Implement audit logging
