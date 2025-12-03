-- Debug query to check document access issue
-- Replace USER_ID with your actual user ID (probably 3 based on logs)
-- Replace BLOB_NAME with the actual blob name

-- 1. Check if document exists
SELECT id, blob_name, original_filename, uploaded_by, is_deleted
FROM uploaded_documents
WHERE blob_name = '20251204_012627_sow1-small.docx';

-- 2. Check if user_can_view_document function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'user_can_view_document';

-- 3. Test the function directly
SELECT user_can_view_document(3, 
    (SELECT id FROM uploaded_documents WHERE blob_name = '20251204_012627_sow1-small.docx')
);

-- 4. Check user permissions
SELECT u.id, u.username, p.code as permission
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN role_permissions rp ON ur.role_id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.id = 3
ORDER BY p.code;

-- 5. Manual permission check
SELECT 
    ud.id as document_id,
    ud.uploaded_by,
    ud.blob_name,
    (ud.uploaded_by = 3) as is_owner,
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = 3 AND p.code = 'file.view_all'
    ) as has_view_all_permission
FROM uploaded_documents ud
WHERE ud.blob_name = '20251204_012627_sow1-small.docx';
