-- ============================================================================
-- File Management Schema for SOW Document Tracking
-- ============================================================================
-- This schema tracks uploaded documents and user ownership for permission-based access

-- Table: uploaded_documents
-- Stores metadata for all uploaded documents with user ownership
CREATE TABLE IF NOT EXISTS uploaded_documents (
    id SERIAL PRIMARY KEY,
    blob_name VARCHAR(500) UNIQUE NOT NULL,         -- Azure blob storage name (unique identifier)
    original_filename VARCHAR(500) NOT NULL,        -- Original uploaded filename
    file_size_bytes BIGINT NOT NULL,                -- File size in bytes
    content_type VARCHAR(100) NOT NULL,             -- MIME type (application/pdf, etc.)
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,-- When file was uploaded
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- User who uploaded
    blob_url TEXT,                                  -- Full Azure blob URL (optional)
    file_extension VARCHAR(20),                     -- File extension (.pdf, .docx, etc.)
    analysis_status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
    last_analyzed_at TIMESTAMP,                     -- Last analysis timestamp
    is_deleted BOOLEAN DEFAULT FALSE,               -- Soft delete flag
    deleted_at TIMESTAMP,                           -- When file was soft-deleted
    deleted_by INTEGER REFERENCES users(id),        -- Who deleted the file
    metadata JSONB,                                 -- Additional custom metadata (flexible)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: document_access_log
-- Audit trail for who accessed which documents
CREATE TABLE IF NOT EXISTS document_access_log (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES uploaded_documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_type VARCHAR(50) NOT NULL,               -- view, download, analyze, delete
    access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),                         -- Optional: track access IP
    user_agent TEXT                                 -- Optional: browser/client info
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_uploaded_by ON uploaded_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_upload_date ON uploaded_documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_blob_name ON uploaded_documents(blob_name);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_is_deleted ON uploaded_documents(is_deleted);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_status ON uploaded_documents(analysis_status);
CREATE INDEX IF NOT EXISTS idx_document_access_log_document_id ON document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_user_id ON document_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_timestamp ON document_access_log(access_timestamp DESC);

-- Comments for documentation
COMMENT ON TABLE uploaded_documents IS 'Metadata for all uploaded SOW documents with user ownership tracking';
COMMENT ON TABLE document_access_log IS 'Audit trail of document access for compliance and security';

COMMENT ON COLUMN uploaded_documents.blob_name IS 'Unique Azure Blob Storage identifier for the file';
COMMENT ON COLUMN uploaded_documents.uploaded_by IS 'User ID of the person who uploaded this document';
COMMENT ON COLUMN uploaded_documents.analysis_status IS 'Current analysis state: pending, processing, completed, failed';
COMMENT ON COLUMN uploaded_documents.is_deleted IS 'Soft delete flag - file still in blob storage but hidden from users';

-- Helper function: Check if user can view a specific document
CREATE OR REPLACE FUNCTION user_can_view_document(p_user_id INTEGER, p_document_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    is_owner BOOLEAN;
    has_view_all_permission BOOLEAN;
BEGIN
    -- Check if user is the owner
    SELECT EXISTS (
        SELECT 1 FROM uploaded_documents 
        WHERE id = p_document_id 
        AND uploaded_by = p_user_id
        AND is_deleted = FALSE
    ) INTO is_owner;
    
    -- Check if user has file.view_all permission
    SELECT user_has_permission(p_user_id, 'file.view_all') INTO has_view_all_permission;
    
    -- Return TRUE if either condition is met
    RETURN is_owner OR has_view_all_permission;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION user_can_view_document IS 'Returns TRUE if user owns the document or has file.view_all permission';

-- Helper function: Get documents accessible by user
CREATE OR REPLACE FUNCTION get_user_documents(p_user_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    blob_name VARCHAR(500),
    original_filename VARCHAR(500),
    file_size_bytes BIGINT,
    content_type VARCHAR(100),
    upload_date TIMESTAMP,
    uploaded_by INTEGER,
    analysis_status VARCHAR(50),
    last_analyzed_at TIMESTAMP
) AS $$
DECLARE
    has_view_all_permission BOOLEAN;
BEGIN
    -- Check if user has file.view_all permission
    SELECT user_has_permission(p_user_id, 'file.view_all') INTO has_view_all_permission;
    
    IF has_view_all_permission THEN
        -- Return all documents (not deleted)
        RETURN QUERY
        SELECT 
            ud.id, ud.blob_name, ud.original_filename, ud.file_size_bytes,
            ud.content_type, ud.upload_date, ud.uploaded_by,
            ud.analysis_status, ud.last_analyzed_at
        FROM uploaded_documents ud
        WHERE ud.is_deleted = FALSE
        ORDER BY ud.upload_date DESC;
    ELSE
        -- Return only user's own documents
        RETURN QUERY
        SELECT 
            ud.id, ud.blob_name, ud.original_filename, ud.file_size_bytes,
            ud.content_type, ud.upload_date, ud.uploaded_by,
            ud.analysis_status, ud.last_analyzed_at
        FROM uploaded_documents ud
        WHERE ud.uploaded_by = p_user_id
        AND ud.is_deleted = FALSE
        ORDER BY ud.upload_date DESC;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_documents IS 'Returns documents based on user permissions - own files or all files if has file.view_all';

-- ============================================================================
-- Add file.view_all permission to RBAC system
-- ============================================================================

-- Insert file.view_all permission
INSERT INTO permissions (code, name, description, category) 
VALUES (
    'file.view_all', 
    'View All Files', 
    'View and access documents uploaded by any user', 
    'document'
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Assign file.view_all to appropriate roles
-- ============================================================================

-- Super Admin gets file.view_all
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.code = 'file.view_all'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin gets file.view_all
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.code = 'file.view_all'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets file.view_all (managers can view all team files)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.code = 'file.view_all'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- Migration: Add analysis results tracking
-- ============================================================================

-- Table: analysis_results
-- Links uploaded documents to their analysis outputs
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES uploaded_documents(id) ON DELETE CASCADE,
    result_blob_name VARCHAR(500) NOT NULL,         -- Blob name for analysis result JSON
    analyzed_by INTEGER NOT NULL REFERENCES users(id), -- User who ran the analysis
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_duration_ms INTEGER,                   -- How long analysis took
    status VARCHAR(50) DEFAULT 'completed',         -- completed, failed, partial
    error_message TEXT,                             -- If analysis failed
    prompts_executed JSONB,                         -- Array of prompt IDs used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_document_id ON analysis_results(document_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_analyzed_by ON analysis_results(analyzed_by);
CREATE INDEX IF NOT EXISTS idx_analysis_results_date ON analysis_results(analysis_date DESC);

COMMENT ON TABLE analysis_results IS 'Links uploaded documents to their analysis outputs for history tracking';

