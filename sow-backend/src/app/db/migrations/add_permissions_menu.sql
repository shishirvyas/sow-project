-- Migration: Add Permissions menu items (Permissions View + Permissions Graph)
-- Purpose: Ensure admin menu contains links for viewing permissions and the permissions graph
-- Date: 2025-11-30

INSERT INTO menu_items (key, label, icon, path, parent_id, display_order, is_active, required_permission, created_at)
VALUES
    ('admin-permissions', 'Permissions', 'VpnKey', '/admin/permissions', NULL, 63, TRUE, 'role.view', CURRENT_TIMESTAMP),
    ('permissions-graph', 'Permissions Graph', 'ChartBar', '/admin/permissions-graph', NULL, 64, TRUE, 'role.view', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

-- Comments
COMMENT ON COLUMN menu_items.required_permission IS 'Permission code required to view this menu entry (references permissions.code)';

-- Verification select (safe to run interactively)
-- SELECT key, label, path, required_permission FROM menu_items WHERE key IN ('admin-permissions', 'permissions-graph');
