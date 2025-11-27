-- ============================================================================
-- RBAC (Role-Based Access Control) Schema for SKOPE360 Platform
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Roles table (e.g., Admin, Manager, Analyst, Viewer)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Role mapping (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- Permissions table (granular permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'document.upload', 'analysis.view'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- e.g., 'document', 'analysis', 'admin', 'settings'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Menu Items table (dynamic menu configuration)
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'dashboard', 'analyze-doc'
    label VARCHAR(255) NOT NULL,
    icon VARCHAR(100), -- Material-UI icon name
    path VARCHAR(255), -- Route path
    parent_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE, -- For nested menus
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    required_permission VARCHAR(100) REFERENCES permissions(code), -- Permission needed to view
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UI Components/Features table (for granular UI control)
CREATE TABLE IF NOT EXISTS ui_components (
    id SERIAL PRIMARY KEY,
    component_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'dashboard.stats_card', 'analysis.pdf_download'
    component_name VARCHAR(255) NOT NULL,
    description TEXT,
    required_permission VARCHAR(100) REFERENCES permissions(code),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for tracking access and changes
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- e.g., 'login', 'document.upload', 'analysis.create'
    resource_type VARCHAR(100), -- e.g., 'document', 'analysis', 'user'
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_parent_id ON menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_ui_components_key ON ui_components(component_key);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- SEED DATA: Roles
-- ============================================================================

INSERT INTO roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Admin', 'Full system access with all permissions', TRUE),
('admin', 'Administrator', 'Full access to platform features and user management', TRUE),
('manager', 'Manager', 'Can manage documents, view all analyses, and generate reports', TRUE),
('analyst', 'Analyst', 'Can upload documents, run analyses, and view results', TRUE),
('viewer', 'Viewer', 'Read-only access to analyses and reports', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Permissions
-- ============================================================================

INSERT INTO permissions (code, name, description, category) VALUES
-- Document permissions
('document.upload', 'Upload Documents', 'Upload SOW documents for analysis', 'document'),
('document.view', 'View Documents', 'View uploaded documents', 'document'),
('document.delete', 'Delete Documents', 'Delete documents from the system', 'document'),
('document.download', 'Download Documents', 'Download original documents', 'document'),

-- Analysis permissions
('analysis.create', 'Create Analysis', 'Initiate document analysis', 'analysis'),
('analysis.view', 'View Analysis', 'View analysis results', 'analysis'),
('analysis.view_all', 'View All Analyses', 'View analyses created by all users', 'analysis'),
('analysis.delete', 'Delete Analysis', 'Delete analysis results', 'analysis'),
('analysis.export', 'Export Analysis', 'Export analysis results as PDF', 'analysis'),

-- Prompt permissions
('prompt.view', 'View Prompts', 'View prompt templates', 'prompt'),
('prompt.create', 'Create Prompts', 'Create new prompt templates', 'prompt'),
('prompt.edit', 'Edit Prompts', 'Modify existing prompts', 'prompt'),
('prompt.delete', 'Delete Prompts', 'Delete prompt templates', 'prompt'),

-- User management permissions
('user.view', 'View Users', 'View user list and details', 'admin'),
('user.create', 'Create Users', 'Create new user accounts', 'admin'),
('user.edit', 'Edit Users', 'Modify user accounts', 'admin'),
('user.delete', 'Delete Users', 'Delete user accounts', 'admin'),
('user.assign_roles', 'Assign Roles', 'Assign roles to users', 'admin'),

-- Role management permissions
('role.view', 'View Roles', 'View role definitions', 'admin'),
('role.create', 'Create Roles', 'Create new roles', 'admin'),
('role.edit', 'Edit Roles', 'Modify role permissions', 'admin'),
('role.delete', 'Delete Roles', 'Delete custom roles', 'admin'),

-- System permissions
('system.settings', 'System Settings', 'Access system configuration', 'system'),
('system.audit_log', 'View Audit Log', 'View system audit logs', 'system'),
('system.dashboard', 'Dashboard Access', 'Access main dashboard', 'system'),

-- Profile permissions
('profile.view', 'View Profile', 'View own profile', 'profile'),
('profile.edit', 'Edit Profile', 'Edit own profile information', 'profile')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Role-Permission Mappings
-- ============================================================================

-- Super Admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: All except super admin system tasks
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.code NOT IN ('system.settings')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: Document management, view all analyses, user viewing
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.code IN (
    'document.upload', 'document.view', 'document.download',
    'analysis.create', 'analysis.view', 'analysis.view_all', 'analysis.export',
    'prompt.view',
    'user.view',
    'system.dashboard',
    'profile.view', 'profile.edit'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Analyst: Document and analysis operations
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'analyst'
  AND p.code IN (
    'document.upload', 'document.view', 'document.download',
    'analysis.create', 'analysis.view', 'analysis.export',
    'prompt.view',
    'system.dashboard',
    'profile.view', 'profile.edit'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer: Read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer'
  AND p.code IN (
    'document.view',
    'analysis.view',
    'prompt.view',
    'system.dashboard',
    'profile.view', 'profile.edit'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- SEED DATA: Menu Items
-- ============================================================================

INSERT INTO menu_items (key, label, icon, path, parent_id, display_order, required_permission) VALUES
('dashboard', 'Dashboard', 'DashboardIcon', '/dashboard', NULL, 1, 'system.dashboard'),
('analyze-doc', 'Analyze Doc', 'DescriptionIcon', '/analyze-doc', NULL, 2, 'analysis.create'),
('analysis-history', 'Analysis History', 'HistoryIcon', '/analysis-history', NULL, 3, 'analysis.view'),
('prompts', 'Prompts', 'EditNoteIcon', '/prompts', NULL, 4, 'prompt.view'),
('users', 'Users', 'PeopleIcon', '/users', NULL, 5, 'user.view'),
('settings', 'Settings', 'SettingsIcon', '/settings', NULL, 6, 'system.settings'),
('profile', 'Profile', 'AccountCircleIcon', '/profile', NULL, 7, 'profile.view')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SEED DATA: UI Components
-- ============================================================================

INSERT INTO ui_components (component_key, component_name, description, required_permission) VALUES
('dashboard.stats_card', 'Dashboard Statistics Card', 'Overview statistics on dashboard', 'system.dashboard'),
('dashboard.recent_analyses', 'Recent Analyses Widget', 'Recent analyses widget on dashboard', 'analysis.view'),
('dashboard.quick_actions', 'Quick Actions Panel', 'Quick action buttons on dashboard', 'system.dashboard'),
('analysis.pdf_download', 'PDF Download Button', 'Download analysis as PDF', 'analysis.export'),
('analysis.delete_button', 'Delete Analysis Button', 'Delete analysis results', 'analysis.delete'),
('analysis.view_all_toggle', 'View All Analyses Toggle', 'Toggle to view all user analyses', 'analysis.view_all'),
('prompt.create_button', 'Create Prompt Button', 'Create new prompt template', 'prompt.create'),
('prompt.edit_button', 'Edit Prompt Button', 'Edit existing prompt', 'prompt.edit'),
('prompt.delete_button', 'Delete Prompt Button', 'Delete prompt template', 'prompt.delete')
ON CONFLICT (component_key) DO NOTHING;

-- ============================================================================
-- SEED DATA: Test Users (passwords are hashed 'password123')
-- ============================================================================

-- Password hash for 'password123' using bcrypt
-- Note: In production, use proper password hashing via backend
INSERT INTO users (email, full_name, password_hash, is_active, is_verified) VALUES
('admin@skope.ai', 'Admin User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE),
('manager@skope.ai', 'Manager User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE),
('analyst@skope.ai', 'Analyst User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE),
('viewer@skope.ai', 'Viewer User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE),
('john.doe@skope.ai', 'John Doe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SEED DATA: Assign Roles to Test Users
-- ============================================================================

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE (u.email = 'admin@skope.ai' AND r.name = 'admin')
   OR (u.email = 'manager@skope.ai' AND r.name = 'manager')
   OR (u.email = 'analyst@skope.ai' AND r.name = 'analyst')
   OR (u.email = 'viewer@skope.ai' AND r.name = 'viewer')
   OR (u.email = 'john.doe@skope.ai' AND r.name = 'analyst')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: User permissions (aggregated from roles)
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT DISTINCT
    u.id AS user_id,
    u.email,
    u.full_name,
    p.code AS permission_code,
    p.name AS permission_name,
    p.category AS permission_category
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.is_active = TRUE;

-- View: User menu items (based on permissions)
CREATE OR REPLACE VIEW user_menu_items_view AS
SELECT DISTINCT
    u.id AS user_id,
    u.email,
    mi.id AS menu_id,
    mi.key AS menu_key,
    mi.label,
    mi.icon,
    mi.path,
    mi.parent_id,
    mi.display_order
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN menu_items mi ON mi.required_permission = p.code
WHERE u.is_active = TRUE
  AND mi.is_active = TRUE
ORDER BY mi.display_order;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id INTEGER,
    p_permission_code VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_permissions_view
        WHERE user_id = p_user_id
          AND permission_code = p_permission_code
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's menu items
CREATE OR REPLACE FUNCTION get_user_menu(p_user_id INTEGER)
RETURNS TABLE (
    menu_id INTEGER,
    menu_key VARCHAR,
    label VARCHAR,
    icon VARCHAR,
    path VARCHAR,
    parent_id INTEGER,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        mi.id,
        mi.key,
        mi.label,
        mi.icon,
        mi.path,
        mi.parent_id,
        mi.display_order
    FROM menu_items mi
    WHERE mi.is_active = TRUE
      AND (
          mi.required_permission IS NULL
          OR user_has_permission(p_user_id, mi.required_permission)
      )
    ORDER BY mi.display_order;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts in the system';
COMMENT ON TABLE roles IS 'Role definitions for RBAC';
COMMENT ON TABLE permissions IS 'Granular permissions for actions and resources';
COMMENT ON TABLE menu_items IS 'Dynamic menu configuration based on permissions';
COMMENT ON TABLE ui_components IS 'UI component visibility control based on permissions';
COMMENT ON TABLE audit_log IS 'Audit trail of user actions';

COMMENT ON FUNCTION user_has_permission IS 'Check if a user has a specific permission';
COMMENT ON FUNCTION get_user_menu IS 'Get menu items available to a specific user based on their permissions';
