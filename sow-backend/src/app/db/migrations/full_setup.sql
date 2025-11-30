-- Combined DB setup script for SOW Project
-- Run this in your SQL client to create schema, seed data, and apply migrations
-- Usage (psql):
--   psql "postgresql://sowadmin@yourserver:YourPassword@yourhost:5432/sowdb?sslmode=require" -f full_setup.sql

-- NOTE: This script runs many DDL/DML operations. Review and back up any existing data before running.

BEGIN;

-- ============================================================================
-- RBAC core schema (from rbac_schema.sql)
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

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Role mapping
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    path VARCHAR(255),
    parent_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    required_permission VARCHAR(100) REFERENCES permissions(code),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UI Components
CREATE TABLE IF NOT EXISTS ui_components (
    id SERIAL PRIMARY KEY,
    component_key VARCHAR(100) UNIQUE NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    description TEXT,
    required_permission VARCHAR(100) REFERENCES permissions(code),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
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

-- Seed Roles
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Admin', 'Full system access with all permissions', TRUE),
('admin', 'Administrator', 'Full access to platform features and user management', TRUE),
('manager', 'Manager', 'Can manage documents, view all analyses, and generate reports', TRUE),
('analyst', 'Analyst', 'Can upload documents, run analyses, and view results', TRUE),
('viewer', 'Viewer', 'Read-only access to analyses and reports', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Seed Permissions (abridged - full list included)
INSERT INTO permissions (code, name, description, category) VALUES
('document.upload', 'Upload Documents', 'Upload SOW documents for analysis', 'document'),
('document.view', 'View Documents', 'View uploaded documents', 'document'),
('document.delete', 'Delete Documents', 'Delete documents from the system', 'document'),
('document.download', 'Download Documents', 'Download original documents', 'document'),
('analysis.create', 'Create Analysis', 'Initiate document analysis', 'analysis'),
('analysis.view', 'View Analysis', 'View analysis results', 'analysis'),
('analysis.view_all', 'View All Analyses', 'View analyses created by all users', 'analysis'),
('analysis.delete', 'Delete Analysis', 'Delete analysis results', 'analysis'),
('analysis.export', 'Export Analysis', 'Export analysis results as PDF', 'analysis'),
('prompt.view', 'View Prompts', 'View prompt templates', 'prompt'),
('prompt.create', 'Create Prompts', 'Create new prompt templates', 'prompt'),
('prompt.edit', 'Edit Prompts', 'Modify existing prompts', 'prompt'),
('prompt.delete', 'Delete Prompts', 'Delete prompt templates', 'prompt'),
('user.view', 'View Users', 'View user list and details', 'admin'),
('user.create', 'Create Users', 'Create new user accounts', 'admin'),
('user.edit', 'Edit Users', 'Modify user accounts', 'admin'),
('user.delete', 'Delete Users', 'Delete user accounts', 'admin'),
('user.assign_roles', 'Assign Roles', 'Assign roles to users', 'admin'),
('role.view', 'View Roles', 'View role definitions', 'admin'),
('role.create', 'Create Roles', 'Create new roles', 'admin'),
('role.edit', 'Edit Roles', 'Modify role permissions', 'admin'),
('role.delete', 'Delete Roles', 'Delete custom roles', 'admin'),
('system.settings', 'System Settings', 'Access system configuration', 'system'),
('system.audit_log', 'View Audit Log', 'View system audit logs and user activity', 'system'),
('system.dashboard', 'Dashboard Access', 'Access main dashboard', 'system'),
('profile.view', 'View Profile', 'View own profile', 'profile'),
('profile.edit', 'Edit Profile', 'Edit own profile information', 'profile')
ON CONFLICT (code) DO NOTHING;

-- Role-Permission mappings (super_admin/Admin/manager/analyst/viewer)
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

-- Manager/Analyst/Viewer role mappings (as in original schema)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.code IN (
    'document.upload', 'document.view', 'document.download',
    'analysis.create', 'analysis.view', 'analysis.view_all', 'analysis.export',
    'prompt.view', 'user.view', 'system.dashboard', 'profile.view', 'profile.edit'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'analyst'
  AND p.code IN (
    'document.upload', 'document.view', 'document.download',
    'analysis.create', 'analysis.view', 'analysis.export',
    'prompt.view', 'system.dashboard', 'profile.view', 'profile.edit'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer'
  AND p.code IN (
    'document.view', 'analysis.view', 'prompt.view', 'system.dashboard', 'profile.view', 'profile.edit'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Seed menu_items (from rbac_schema seed)
INSERT INTO menu_items (key, label, icon, path, parent_id, display_order, required_permission) VALUES
('dashboard', 'Dashboard', 'DashboardIcon', '/dashboard', NULL, 1, 'system.dashboard'),
('analyze-doc', 'Analyze Doc', 'DescriptionIcon', '/analyze-doc', NULL, 2, 'analysis.create'),
('analysis-history', 'Analysis History', 'HistoryIcon', '/analysis-history', NULL, 3, 'analysis.view'),
('prompts', 'Prompts', 'EditNoteIcon', '/prompts', NULL, 4, 'prompt.view'),
('users', 'Users', 'PeopleIcon', '/admin/users', NULL, 5, 'user.view'),
('settings', 'Settings', 'SettingsIcon', '/settings', NULL, 6, 'system.settings'),
('profile', 'Profile', 'AccountCircleIcon', '/profile', NULL, 7, 'profile.view')
ON CONFLICT (key) DO NOTHING;

-- Seed ui_components (abridged)
INSERT INTO ui_components (component_key, component_name, description, required_permission) VALUES
('dashboard.stats_card', 'Dashboard Statistics Card', 'Overview statistics on dashboard', 'system.dashboard'),
('dashboard.recent_analyses', 'Recent Analyses Widget', 'Recent analyses widget on dashboard', 'analysis.view')
ON CONFLICT (component_key) DO NOTHING;

-- Seed test users with placeholder password hashes
INSERT INTO users (email, full_name, password_hash, is_active, is_verified) VALUES
('admin@skope.ai', 'Admin User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE),
('manager@skope.ai', 'Manager User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE),
('analyst@skope.ai', 'Analyst User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE),
('viewer@skope.ai', 'Viewer User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE),
('john.doe@skope.ai', 'John Doe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEAUem', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Assign roles to seeded users
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
-- Migrations (apply in order)
-- ============================================================================

-- 1) Add menu groups
-- (contents from add_menu_groups.sql)
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS group_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS group_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_icon VARCHAR(100);

UPDATE menu_items SET 
    group_name = 'SOW', 
    group_order = 1,
    group_icon = 'DescriptionIcon',
    display_order = 1
WHERE key = 'dashboard';

UPDATE menu_items SET 
    group_name = 'SOW', 
    group_order = 1,
    group_icon = 'DescriptionIcon',
    display_order = 2
WHERE key = 'analyze-doc';

UPDATE menu_items SET 
    group_name = 'SOW', 
    group_order = 1,
    group_icon = 'DescriptionIcon',
    display_order = 3
WHERE key = 'analysis-history';

UPDATE menu_items SET 
    group_name = 'LLM Configs', 
    group_order = 2,
    group_icon = 'SettingsIcon',
    display_order = 1
WHERE key = 'prompts';

UPDATE menu_items SET 
    group_name = 'User Management', 
    group_order = 3,
    group_icon = 'PeopleIcon',
    display_order = 1
WHERE key = 'users';

UPDATE menu_items SET 
    group_name = 'User Management', 
    group_order = 3,
    group_icon = 'PeopleIcon',
    display_order = 2
WHERE key IN (
    SELECT key FROM menu_items 
    WHERE key LIKE '%role%' OR key LIKE '%permission%'
);

UPDATE menu_items SET 
    group_name = NULL, 
    group_order = 99,
    display_order = 1
WHERE key = 'settings';

UPDATE menu_items SET 
    group_name = NULL, 
    group_order = 99,
    display_order = 2
WHERE key = 'profile';

DROP FUNCTION IF EXISTS get_user_menu(INTEGER);

CREATE OR REPLACE FUNCTION get_user_menu(p_user_id INTEGER)
RETURNS TABLE (
    menu_id INTEGER,
    menu_key VARCHAR,
    label VARCHAR,
    icon VARCHAR,
    path VARCHAR,
    parent_id INTEGER,
    display_order INTEGER,
    group_name VARCHAR,
    group_order INTEGER,
    group_icon VARCHAR
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
        mi.display_order,
        mi.group_name,
        mi.group_order,
        mi.group_icon
    FROM menu_items mi
    WHERE mi.is_active = TRUE
      AND (
          mi.required_permission IS NULL
          OR user_has_permission(p_user_id, mi.required_permission)
      )
    ORDER BY mi.group_order, mi.display_order;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_menu_items_group ON menu_items(group_name, group_order);

COMMENT ON COLUMN menu_items.group_name IS 'Menu group name for organizing items (SOW, User Management, LLM Configs)';
COMMENT ON COLUMN menu_items.group_order IS 'Display order of groups (lower numbers appear first)';
COMMENT ON COLUMN menu_items.group_icon IS 'Icon for the group header';

-- 2) Add user profile fields and seed profiles
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

UPDATE users 
SET 
    full_name = 'Sushas',
    job_title = 'Subject Matter Expert',
    department = 'Business Operations',
    years_of_experience = 20,
    bio = 'Seasoned SME with over 20 years of expertise in business process optimization and SOW analysis. Specializes in compliance, risk assessment, and strategic vendor management.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Sushas&background=2065D1&color=fff&size=128'
WHERE email = 'admin@skope.ai';

UPDATE users 
SET 
    full_name = 'Susmita',
    job_title = 'Business Analyst & Project Manager',
    department = 'Project Management',
    years_of_experience = 22,
    bio = 'Experienced BA and PM with 22+ years leading complex procurement projects. Expert in requirements gathering, stakeholder management, and agile methodologies.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Susmita&background=7635DC&color=fff&size=128'
WHERE email = 'manager@skope.ai';

UPDATE users 
SET 
    full_name = 'Shishir',
    job_title = 'Technical Lead',
    department = 'Engineering',
    years_of_experience = 20,
    bio = 'Technical leader with 20 years of experience in software architecture, AI/ML integration, and cloud solutions. Leads the development of intelligent document analysis systems.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Shishir&background=0C7C59&color=fff&size=128'
WHERE email = 'analyst@skope.ai';

UPDATE users 
SET 
    full_name = 'Shilpa',
    job_title = 'Technical Lead',
    department = 'Engineering',
    years_of_experience = 21,
    bio = 'Senior technical architect with 21 years of experience in enterprise systems, database design, and API development. Focuses on scalable backend solutions.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Shilpa&background=D84315&color=fff&size=128'
WHERE email = 'viewer@skope.ai';

UPDATE users 
SET 
    full_name = 'Malleha',
    job_title = 'Data Scientist',
    department = 'Data Science & AI',
    years_of_experience = 20,
    bio = 'Data science expert with 20 years in ML, NLP, and AI-powered analytics. Specializes in building intelligent document processing and compliance detection models.',
    location = 'India',
    avatar_url = 'https://ui-avatars.com/api/?name=Malleha&background=FF6F00&color=fff&size=128'
WHERE email = 'john.doe@skope.ai';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE r.name = 'admin'
  AND u.email IN (
    'admin@skope.ai',
    'manager@skope.ai',
    'analyst@skope.ai',
    'viewer@skope.ai',
    'john.doe@skope.ai'
  )
ON CONFLICT (user_id, role_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_job_title ON users(job_title);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

COMMENT ON COLUMN users.job_title IS 'User job title/position';
COMMENT ON COLUMN users.department IS 'User department/team';
COMMENT ON COLUMN users.years_of_experience IS 'Years of professional experience';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.phone IS 'Contact phone number';
COMMENT ON COLUMN users.location IS 'User location/office';

-- 3) Update user emails to name-based
UPDATE users SET email = 'sushas@skope.ai' WHERE email = 'admin@skope.ai';
UPDATE users SET email = 'susmita@skope.ai' WHERE email = 'manager@skope.ai';
UPDATE users SET email = 'shishir@skope.ai' WHERE email = 'analyst@skope.ai';
UPDATE users SET email = 'shilpa@skope.ai' WHERE email = 'viewer@skope.ai';
UPDATE users SET email = 'malleha@skope.ai' WHERE email = 'john.doe@skope.ai';

-- 4) Rebrand domain to skope360.ai
UPDATE users 
SET email = REPLACE(email, '@skope.ai', '@skope360.ai')
WHERE email LIKE '%@skope.ai';

-- 5) Add Rahul user
INSERT INTO users (
    email, 
    password_hash, 
    full_name, 
    job_title, 
    department, 
    years_of_experience, 
    bio, 
    phone, 
    location, 
    avatar_url, 
    is_active
) VALUES (
    'rahul@skope360.ai',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN.dhe2gvKGOinZG8lFsC',
    'Rahul Kumar',
    'AI Manager',
    'Artificial Intelligence',
    25,
    'Seasoned AI Manager with 25 years of experience in artificial intelligence, machine learning, and data science. Expert in leading AI initiatives, developing intelligent systems, and driving innovation through advanced analytics and automation.',
    '+91 98765 43210',
    'Bangalore, India',
    'https://ui-avatars.com/api/?name=Rahul+Kumar&background=2065D1&color=fff&size=200',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    job_title = EXCLUDED.job_title,
    department = EXCLUDED.department,
    years_of_experience = EXCLUDED.years_of_experience,
    bio = EXCLUDED.bio,
    phone = EXCLUDED.phone,
    location = EXCLUDED.location,
    avatar_url = EXCLUDED.avatar_url,
    is_active = EXCLUDED.is_active;

-- Assign admin role to Rahul (use 'admin' role name present in seed)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'rahul@skope360.ai'
  AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 6) Add admin permissions & admin menu items
INSERT INTO permissions (code, name, description, category, created_at)
VALUES ('role.assign', 'Assign Roles to Users', 'Assign and remove roles from user accounts', 'admin', CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, name, description, category, created_at)
VALUES ('audit.view', 'View Audit Logs', 'View system audit logs and user activity', 'admin', CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.code IN ('role.assign', 'audit.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.code IN ('role.assign', 'audit.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO menu_items (key, label, icon, path, display_order, is_active, required_permission, created_at)
VALUES 
    ('admin-users', 'Users', 'people', '/admin/users', 60, TRUE, 'user.view', CURRENT_TIMESTAMP),
    ('admin-roles', 'Roles', 'security', '/admin/roles', 61, TRUE, 'role.view', CURRENT_TIMESTAMP),
    ('admin-audit', 'Audit Logs', 'history', '/admin/audit-logs', 62, TRUE, 'audit.view', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Views, functions and comments (from original schema file)
-- ============================================================================

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

-- Comments
COMMENT ON TABLE users IS 'User accounts in the system';
COMMENT ON TABLE roles IS 'Role definitions for RBAC';
COMMENT ON TABLE permissions IS 'Granular permissions for actions and resources';
COMMENT ON TABLE menu_items IS 'Dynamic menu configuration based on permissions';
COMMENT ON TABLE ui_components IS 'UI component visibility control based on permissions';
COMMENT ON TABLE audit_log IS 'Audit trail of user actions';

-- ============================================================================
-- Prompts / Prompt Templates (support for prompts management UI)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompt_templates (
    id SERIAL PRIMARY KEY,
    clause_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    prompt_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prompt_variables (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER REFERENCES prompt_templates(id) ON DELETE CASCADE,
    variable_name VARCHAR(100) NOT NULL,
    variable_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prompt_id, variable_name)
);

CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prompt_text TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Other',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_clause_id ON prompt_templates(clause_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_variables_prompt_id ON prompt_variables(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_active ON prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_prompts_created_by ON prompts(created_by);

COMMENT ON TABLE prompt_templates IS 'Repository of reusable prompt templates used by the AI services';
COMMENT ON TABLE prompt_variables IS 'Variables for prompt templates used for substitution in prompts';
COMMENT ON TABLE prompts IS 'Prompt management table (ad-hoc prompts, admin-created)';

-- ============================================================================
-- Users screen view (support admin UI listing)
-- Aggregates roles and user metadata to simplify queries for the frontend
-- ============================================================================

CREATE OR REPLACE VIEW users_screen_view AS
SELECT
    u.id,
    u.email,
    u.full_name,
    u.job_title,
    u.department,
    u.years_of_experience,
    u.is_active,
    u.is_verified,
    u.avatar_url,
    u.phone,
    u.location,
    u.created_at,
    u.updated_at,
    u.last_login_at AS last_login,
    COALESCE(string_agg(r.name, ',') FILTER (WHERE r.name IS NOT NULL), '') AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
GROUP BY
    u.id, u.email, u.full_name, u.job_title, u.department, u.years_of_experience,
    u.is_active, u.is_verified, u.avatar_url, u.phone, u.location, u.created_at, u.updated_at, u.last_login_at;

COMMENT ON VIEW users_screen_view IS 'View exposing users and their roles for the admin/users screen';

-- Convenience function: get user with roles as JSON
CREATE OR REPLACE FUNCTION get_user_with_roles(p_user_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    usr RECORD;
    roles_json JSONB;
BEGIN
    SELECT u.id, u.email, u.full_name, u.job_title, u.department, u.years_of_experience,
           u.is_active, u.is_verified, u.avatar_url, u.phone, u.location, u.created_at, u.updated_at, u.last_login_at
    INTO usr
    FROM users u
    WHERE u.id = p_user_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'display_name', r.display_name))
    INTO roles_json
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id;

    RETURN jsonb_build_object(
        'user', to_jsonb(usr),
        'roles', COALESCE(roles_json, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- End of combined setup script
