-- Fix user_can_view_document function to work correctly
-- This matches the manual permission check that works

CREATE OR REPLACE FUNCTION user_can_view_document(p_user_id INTEGER, p_document_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM uploaded_documents ud
        WHERE ud.id = p_document_id
        AND ud.is_deleted = FALSE
        AND (
            -- User is the owner
            ud.uploaded_by = p_user_id
            OR
            -- User has file.view_all permission
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = p_user_id 
                AND p.code = 'file.view_all'
            )
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Test the function
SELECT user_can_view_document(3, 
    (SELECT id FROM uploaded_documents WHERE blob_name = '20251204_012627_sow1-small.docx')
) as should_return_true;
