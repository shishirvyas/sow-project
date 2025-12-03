# File Management & User Ownership System

## Overview

This system implements **user-based document ownership** with **permission-based access control** for uploaded SOW documents. Users can always view their own uploaded files, while users with the `file.view_all` permission can view all files uploaded by any user.

---

## Database Schema

### Tables Created

#### 1. **uploaded_documents**
Stores metadata for all uploaded documents with user ownership tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Unique document ID |
| blob_name | VARCHAR(500) UNIQUE | Azure blob storage identifier |
| original_filename | VARCHAR(500) | Original filename from upload |
| file_size_bytes | BIGINT | File size in bytes |
| content_type | VARCHAR(100) | MIME type (application/pdf, etc.) |
| upload_date | TIMESTAMP | When file was uploaded |
| uploaded_by | INTEGER FK | User ID who uploaded (references users.id) |
| blob_url | TEXT | Full Azure blob URL (optional) |
| file_extension | VARCHAR(20) | File extension (.pdf, .docx, etc.) |
| analysis_status | VARCHAR(50) | pending, processing, completed, failed |
| last_analyzed_at | TIMESTAMP | Last analysis timestamp |
| is_deleted | BOOLEAN | Soft delete flag |
| deleted_at | TIMESTAMP | When file was soft-deleted |
| deleted_by | INTEGER FK | Who deleted the file |
| metadata | JSONB | Additional custom metadata |

**Indexes:**
- `idx_uploaded_documents_uploaded_by` - Fast user lookup
- `idx_uploaded_documents_blob_name` - Unique blob identifier lookup
- `idx_uploaded_documents_upload_date` - Recent files query
- `idx_uploaded_documents_status` - Status filtering

#### 2. **document_access_log**
Audit trail for document access (compliance & security).

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Log entry ID |
| document_id | INTEGER FK | Document accessed |
| user_id | INTEGER FK | User who accessed |
| access_type | VARCHAR(50) | view, download, analyze, delete |
| access_timestamp | TIMESTAMP | When access occurred |
| ip_address | VARCHAR(50) | IP address (optional) |
| user_agent | TEXT | Browser/client info (optional) |

**Indexes:**
- `idx_document_access_log_document_id` - Audit trail per document
- `idx_document_access_log_user_id` - Audit trail per user
- `idx_document_access_log_timestamp` - Time-based queries

#### 3. **analysis_results**
Links uploaded documents to their analysis outputs.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Result ID |
| document_id | INTEGER FK | Source document |
| result_blob_name | VARCHAR(500) | Analysis result blob name |
| analyzed_by | INTEGER FK | User who ran analysis |
| analysis_date | TIMESTAMP | When analysis was performed |
| analysis_duration_ms | INTEGER | Analysis duration in milliseconds |
| status | VARCHAR(50) | completed, failed, partial |
| error_message | TEXT | Error details if failed |
| prompts_executed | JSONB | Array of prompt IDs used |

---

## Permissions

### New Permission: `file.view_all`

- **Code:** `file.view_all`
- **Name:** View All Files
- **Description:** View and access documents uploaded by any user
- **Category:** document

### Role Assignments

| Role | Has file.view_all | Can See |
|------|-------------------|---------|
| super_admin | ✅ Yes | All files from all users |
| admin | ✅ Yes | All files from all users |
| manager | ✅ Yes | All files from all users |
| analyst | ❌ No | Only their own uploaded files |
| viewer | ❌ No | Only their own uploaded files |

---

## Database Functions

### 1. `user_can_view_document(p_user_id, p_document_id)`
Returns `TRUE` if user can access the document.

**Logic:**
- Returns TRUE if user is the owner (uploaded_by = user_id)
- Returns TRUE if user has `file.view_all` permission
- Returns FALSE otherwise

**Usage:**
```sql
SELECT user_can_view_document(123, 456);  -- TRUE or FALSE
```

### 2. `get_user_documents(p_user_id)`
Returns documents accessible by the user.

**Logic:**
- If user has `file.view_all`: Returns ALL documents (not deleted)
- Otherwise: Returns only documents uploaded by that user

**Usage:**
```sql
SELECT * FROM get_user_documents(123);
```

---

## API Endpoints

### Document Upload (Modified)

**POST** `/api/v1/upload-sow`

**Changes:**
- Now creates a record in `uploaded_documents` table
- Captures `uploaded_by` user ID
- Returns `document_id` in response

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/upload-sow" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

**Response:**
```json
{
  "message": "SOW uploaded successfully",
  "document_id": 123,
  "blob_name": "20241204_143022_document.pdf",
  "url": "https://storage.azure.com/...",
  "size": 1048576,
  "content_type": "application/pdf",
  "original_filename": "document.pdf"
}
```

### Process Document (Modified)

**POST** `/api/v1/process-sow/{blob_name}`

**Changes:**
- Checks if user has access to the document
- Updates `analysis_status` to 'processing' → 'completed'/'failed'
- Creates record in `analysis_results` table
- Only allows processing files user uploaded or has `file.view_all` permission

**Error Response (No Access):**
```json
{
  "detail": "Permission denied: You can only analyze files you uploaded or have file.view_all permission"
}
```

### Analysis History (Modified)

**GET** `/api/v1/analysis-history`

**Changes:**
- Filters results based on user permissions
- Users WITHOUT `file.view_all`: See only their own files
- Users WITH `file.view_all`: See all files
- Returns `view_mode` field: "own" or "all"

**Response:**
```json
{
  "history": [...],
  "count": 15,
  "success_count": 12,
  "error_count": 3,
  "view_mode": "own",
  "user_id": 123
}
```

### New Endpoint: Get My Documents

**GET** `/api/v1/my-documents`

**Description:** Get all documents accessible by current user

**Requires:** `document.view` permission

**Response:**
```json
{
  "documents": [
    {
      "id": 123,
      "blob_name": "20241204_143022_contract.pdf",
      "original_filename": "contract.pdf",
      "file_size_bytes": 1048576,
      "content_type": "application/pdf",
      "upload_date": "2024-12-04T14:30:22Z",
      "uploaded_by": 456,
      "analysis_status": "completed",
      "last_analyzed_at": "2024-12-04T14:35:10Z"
    }
  ],
  "count": 15,
  "view_mode": "own"
}
```

### New Endpoint: Get Document Info

**GET** `/api/v1/documents/{blob_name}/info`

**Description:** Get metadata for a specific document (permission-checked)

**Requires:** `document.view` + access to the document

**Response:**
```json
{
  "document": {
    "id": 123,
    "blob_name": "20241204_143022_contract.pdf",
    "original_filename": "contract.pdf",
    "file_size_bytes": 1048576,
    "upload_date": "2024-12-04T14:30:22Z",
    "uploaded_by": 456,
    "analysis_status": "completed"
  },
  "can_access": true,
  "is_owner": true
}
```

### New Endpoint: Document Statistics

**GET** `/api/v1/documents/stats`

**Description:** Get document statistics for user

**Requires:** `document.view` permission

**Response:**
```json
{
  "total_documents": 15,
  "total_size_bytes": 157286400,
  "total_size_mb": 150.0,
  "status_breakdown": {
    "completed": 12,
    "pending": 2,
    "failed": 1
  },
  "view_mode": "own",
  "pending_analysis": 2,
  "completed_analysis": 12
}
```

---

## Service Layer: FileManagementService

Located in: `src/app/services/file_management_service.py`

### Methods

#### `create_document_record(blob_name, original_filename, file_size_bytes, content_type, uploaded_by, blob_url, metadata)`
Creates a new document record in database.

**Returns:** Document ID

#### `get_user_documents(user_id, include_deleted, limit)`
Gets documents accessible by user (uses database function).

**Returns:** List of document dictionaries

#### `get_document_by_blob_name(blob_name)`
Gets document metadata by blob name.

**Returns:** Document dict or None

#### `user_can_access_document(user_id, blob_name)`
Checks if user has permission to access document (uses database function).

**Returns:** Boolean

#### `update_analysis_status(blob_name, status, last_analyzed_at)`
Updates document analysis status.

**Status values:** pending, processing, completed, failed

#### `log_document_access(document_id, user_id, access_type, ip_address, user_agent)`
Logs document access for audit trail.

**Access types:** view, download, analyze, delete

#### `soft_delete_document(blob_name, deleted_by)`
Soft deletes a document (marks as deleted but keeps in DB).

#### `create_analysis_result(document_id, result_blob_name, analyzed_by, analysis_duration_ms, status, error_message, prompts_executed)`
Creates analysis result record linking document to analysis output.

---

## Migration

### Running the Migration

```bash
cd sow-backend
python src/app/db/migrate_file_management.py
```

### What the Migration Does

1. ✅ Creates `uploaded_documents` table
2. ✅ Creates `document_access_log` table
3. ✅ Creates `analysis_results` table
4. ✅ Adds `file.view_all` permission
5. ✅ Assigns `file.view_all` to super_admin, admin, manager roles
6. ✅ Creates helper functions `user_can_view_document()` and `get_user_documents()`
7. ✅ Creates all necessary indexes

**Safe to re-run:** Uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING`

---

## Security Features

### 1. **User Isolation**
- Analysts and viewers can ONLY see their own uploaded files
- Managers and admins can see ALL files

### 2. **Permission-Based Access**
- Every file access is checked via `user_can_access_document()`
- Endpoints enforce `document.view`, `document.upload`, `analysis.create` permissions
- API returns 403 Forbidden if user tries to access unauthorized file

### 3. **Audit Trail**
- `document_access_log` table tracks WHO accessed WHAT and WHEN
- Includes access type (view, download, analyze, delete)
- Optional IP address and user agent logging

### 4. **Soft Delete**
- Documents are marked as deleted but not removed
- Allows for recovery and audit compliance
- Tracks who deleted and when

---

## Testing Scenarios

### Scenario 1: Analyst Role (Own Files Only)

**User:** john.doe@company.com (Analyst)

**Expected Behavior:**
- ✅ Can upload documents
- ✅ Can see their own uploaded files in `/my-documents`
- ✅ Can analyze their own files
- ✅ Analysis history shows only their files
- ❌ Cannot see files uploaded by others
- ❌ Cannot analyze files uploaded by others

### Scenario 2: Manager Role (All Files)

**User:** manager@company.com (Manager)

**Expected Behavior:**
- ✅ Can upload documents
- ✅ Can see ALL uploaded files in `/my-documents`
- ✅ Can analyze ANY file
- ✅ Analysis history shows all files
- ✅ `view_mode` returns "all"

### Scenario 3: Admin Role (Full Access)

**User:** admin@company.com (Admin)

**Expected Behavior:**
- ✅ Same as Manager
- ✅ Can manage users and roles
- ✅ Can assign `file.view_all` to new roles

---

## Configuration

### Database Tables

All tables are created automatically by migration script. No manual SQL needed.

### Environment Variables

No new environment variables required. Uses existing database connection settings.

### Role Configuration

To give a custom role access to all files:

```sql
-- Give 'custom_role' access to all files
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'custom_role'
  AND p.code = 'file.view_all'
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

---

## Future Enhancements

### Potential Features

1. **File Sharing** - Allow users to share specific files with other users
2. **Folder Organization** - Group files into folders/projects
3. **Expiration Dates** - Auto-delete files after X days
4. **Download Tracking** - Log when users download original files
5. **File Comments** - Allow users to add notes to files
6. **Batch Operations** - Delete/analyze multiple files at once
7. **Advanced Filters** - Filter by date range, status, size, etc.

### Database Extensions

```sql
-- File sharing table (future)
CREATE TABLE document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES uploaded_documents(id),
    shared_by INTEGER REFERENCES users(id),
    shared_with INTEGER REFERENCES users(id),
    permission_level VARCHAR(20), -- view, analyze, edit
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Troubleshooting

### Issue: Users can't see their uploaded files

**Solution:**
1. Check user has `document.view` permission
2. Verify files exist in `uploaded_documents` table:
   ```sql
   SELECT * FROM uploaded_documents WHERE uploaded_by = <user_id>;
   ```
3. Check file is not soft-deleted: `is_deleted = FALSE`

### Issue: Manager can't see all files

**Solution:**
1. Check user has `file.view_all` permission:
   ```sql
   SELECT user_has_permission(<user_id>, 'file.view_all');
   ```
2. Verify role has the permission:
   ```sql
   SELECT r.name, p.code
   FROM roles r
   JOIN user_roles ur ON r.id = ur.role_id
   JOIN role_permissions rp ON r.id = rp.role_id
   JOIN permissions p ON rp.permission_id = p.id
   WHERE ur.user_id = <user_id> AND p.code = 'file.view_all';
   ```

### Issue: Document record not created on upload

**Solution:**
1. Check backend logs for errors from `FileManagementService.create_document_record()`
2. Verify `uploaded_documents` table exists: `\dt uploaded_documents` in psql
3. Check foreign key constraint (user must exist in `users` table)

---

## Summary

| Table Name | Purpose | Key Feature |
|------------|---------|-------------|
| uploaded_documents | File metadata | User ownership tracking |
| document_access_log | Audit trail | Who accessed what when |
| analysis_results | Analysis tracking | Links docs to analysis outputs |

| Permission | Who Has It | What It Does |
|------------|------------|--------------|
| file.view_all | admin, manager | View all files from all users |
| document.view | all roles | View documents (filtered by ownership) |
| document.upload | analyst+ | Upload new documents |
| analysis.create | analyst+ | Run analysis on documents |

**Result:** Users can always see their own files. Managers/admins see everything. Perfect for team collaboration with data isolation! 🎉

