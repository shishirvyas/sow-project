-- ============================================================================
-- Admin Permissions Update - Add missing permissions for Phase 5
-- ============================================================================

-- Add role.assign permission (for assigning roles to users)
INSERT INTO permissions (code, name, description, category, created_at) 
VALUES ('role.assign', 'Assign Roles to Users', 'Assign and remove roles from user accounts', 'admin', CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Add audit.view permission (for viewing audit logs)
INSERT INTO permissions (code, name, description, category, created_at) 
VALUES ('audit.view', 'View Audit Logs', 'View system audit logs and user activity', 'admin', CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Grant role.assign and audit.view to super_admin role
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.code IN ('role.assign', 'audit.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant role.assign and audit.view to admin role
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.code IN ('role.assign', 'audit.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Add admin menu items to menu_items table
INSERT INTO menu_items (key, label, icon, path, display_order, is_active, required_permission, created_at)
VALUES 
    ('admin-users', 'Users', 'people', '/admin/users', 60, TRUE, 'user.view', CURRENT_TIMESTAMP),
    ('admin-roles', 'Roles', 'security', '/admin/roles', 61, TRUE, 'role.view', CURRENT_TIMESTAMP),
    ('admin-audit', 'Audit Logs', 'history', '/admin/audit-logs', 62, TRUE, 'audit.view', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

-- Verify the additions
SELECT 'Added permissions:' AS status;
SELECT code, name, category 
FROM permissions 
WHERE code IN ('role.assign', 'audit.view');

SELECT 'Added menu items:' AS status;
SELECT key, label, path, required_permission 
FROM menu_items 
WHERE key LIKE 'admin-%';
