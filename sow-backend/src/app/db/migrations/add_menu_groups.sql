-- Migration: Add menu grouping support
-- Purpose: Group menu items into categories (SOW, User Management, LLM Configs)
-- Date: 2025-11-28

-- Add columns for menu grouping
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS group_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS group_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_icon VARCHAR(100);

-- Update existing menu items with groups

-- SOW Group (group_order = 1)
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

-- LLM Configs Group (group_order = 2)
UPDATE menu_items SET 
    group_name = 'LLM Configs', 
    group_order = 2,
    group_icon = 'SettingsIcon',
    display_order = 1
WHERE key = 'prompts';

-- User Management Group (group_order = 3)
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

-- Other/Ungrouped items (group_order = 99)
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

-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS get_user_menu(INTEGER);

-- Update the get_user_menu function to support groups
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

-- Create index for faster grouping queries
CREATE INDEX IF NOT EXISTS idx_menu_items_group ON menu_items(group_name, group_order);

COMMENT ON COLUMN menu_items.group_name IS 'Menu group name for organizing items (SOW, User Management, LLM Configs)';
COMMENT ON COLUMN menu_items.group_order IS 'Display order of groups (lower numbers appear first)';
COMMENT ON COLUMN menu_items.group_icon IS 'Icon for the group header';
