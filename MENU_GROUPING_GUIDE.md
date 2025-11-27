# Menu Grouping Implementation Guide

## Overview

This implementation adds **grouped menu items** with **permission-based visibility** to the SOW application. Menu items are now organized into logical groups:

- **SOW** - Dashboard, Analyze Doc, Analysis History
- **LLM Configs** - Prompts
- **User Management** - Users, Roles, Permissions

Groups are automatically hidden if the user has no permissions for any items within that group.

## Architecture

### Database Schema Changes

**New Columns in `menu_items` Table:**
```sql
group_name VARCHAR(100)     -- Group name (e.g., 'SOW', 'User Management')
group_order INTEGER         -- Display order of groups
group_icon VARCHAR(100)     -- Icon for group header
```

**Updated Function:**
```sql
get_user_menu(user_id) -- Now returns group information
```

### Backend Changes

**File:** `sow-backend/src/app/services/auth_service.py`

The `get_user_menu()` function now:
1. Fetches menu items with group information
2. Groups items by `group_name`
3. Filters out empty groups (permission-based)
4. Returns grouped structure with ungrouped items at the end

**Response Format:**
```json
[
  {
    "group_name": "SOW",
    "group_order": 1,
    "group_icon": "DescriptionIcon",
    "items": [
      {"id": 1, "key": "dashboard", "label": "Dashboard", "icon": "DashboardIcon", "path": "/dashboard"},
      {"id": 2, "key": "analyze-doc", "label": "Analyze Doc", "icon": "DescriptionIcon", "path": "/analyze-doc"}
    ]
  },
  {
    "group_name": "User Management",
    "group_order": 3,
    "group_icon": "PeopleIcon",
    "items": [
      {"id": 5, "key": "users", "label": "Users", "icon": "PeopleIcon", "path": "/users"}
    ]
  },
  // Ungrouped items
  {"id": 7, "key": "profile", "label": "Profile", "icon": "ProfileIcon", "path": "/profile"}
]
```

### Frontend Changes

**File:** `frontend/src/components/Menu/DynamicMenu.jsx`

Features:
- Renders group headers with visual separation
- Automatically hides groups with no items
- Supports collapsed sidebar (hides group headers when collapsed)
- Indents grouped items for visual hierarchy
- Material-UI styling with smooth transitions

## Installation & Setup

### Step 1: Run Database Migration

```bash
cd sow-backend
python run_menu_migration.py
```

This will:
- Add `group_name`, `group_order`, `group_icon` columns
- Update existing menu items with group assignments
- Update the `get_user_menu()` function
- Create indexes for performance

### Step 2: Restart Backend

```bash
# Stop current backend (Ctrl+C)
python -m uvicorn src.app.main:app --host 127.0.0.1 --port 8000
```

### Step 3: Clear Browser Cache & Reload

```
1. Open DevTools (F12)
2. Right-click Refresh button → "Empty Cache and Hard Reload"
3. Or press Ctrl+Shift+Delete → Clear cache
```

## Configuration

### Adding New Menu Items

To add a new menu item to an existing group:

```sql
INSERT INTO menu_items (
    key, label, icon, path, 
    group_name, group_order, display_order, 
    required_permission
) VALUES (
    'new-feature',           -- Unique key
    'New Feature',           -- Display label
    'SettingsIcon',          -- Material-UI icon name
    '/new-feature',          -- Route path
    'SOW',                   -- Group name
    1,                       -- Group order (1=SOW, 2=LLM, 3=User Mgmt)
    4,                       -- Display order within group
    'feature.view'           -- Required permission code
);
```

### Creating New Group

To create a new menu group:

```sql
-- Add items with new group_name
INSERT INTO menu_items (...) VALUES
(..., 'Reports', 4, ...),  -- New group with order 4
(..., 'Reports', 4, ...);
```

### Ungrouped Items

To keep an item ungrouped (like Settings, Profile):

```sql
UPDATE menu_items 
SET group_name = NULL, group_order = 99
WHERE key = 'settings';
```

## Permission Logic

**Group Visibility Rule:**
> A group is visible if the user has permission for **at least one item** in that group.

**Example:**

User has permissions: `['analysis.view', 'prompt.view']`

Menu items:
- SOW group requires: `analysis.create`, `analysis.view`, `analysis.history`
- LLM Configs group requires: `prompt.view`
- User Management group requires: `user.view`, `role.view`

**Result:**
- ✅ **SOW** group shown (user has `analysis.view`)
- ✅ **LLM Configs** group shown (user has `prompt.view`)
- ❌ **User Management** group hidden (user has no permissions)

## Testing

### Test Different User Roles

```sql
-- Get menu for specific user
SELECT * FROM get_user_menu(1);  -- Admin user

-- Check what groups are visible
SELECT DISTINCT group_name, group_order
FROM get_user_menu(2)  -- Analyst user
WHERE group_name IS NOT NULL
ORDER BY group_order;
```

### Backend API Testing

```bash
# Login and get menu
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@skope.ai", "password": "password123"}'

# Get user profile with menu
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Testing

1. **Login as different users** to verify permission-based visibility
2. **Toggle sidebar collapse** to verify group headers hide/show correctly
3. **Check console** for any errors in menu rendering
4. **Verify visual styling** matches design requirements

## Styling Customization

The menu styling uses Material-UI's `sx` prop. To customize:

**Group Header Style:**
```jsx
<ListSubheader
  sx={{
    fontWeight: 700,           // Bold headers
    fontSize: '0.75rem',       // Small caps size
    textTransform: 'uppercase', // ALL CAPS
    color: 'text.secondary',   // Gray color
    letterSpacing: '0.5px',    // Spaced letters
  }}
>
```

**Grouped Item Indentation:**
```jsx
<ListItemButton
  sx={{
    pl: isGrouped ? 4 : 2,  // Extra left padding for grouped items
  }}
>
```

**Group Dividers:**
```jsx
<Divider sx={{ my: 1 }} />  // Margin vertical: 1 unit
```

## Troubleshooting

### Groups Not Showing

**Symptom:** All menu items appear flat, no groups

**Solutions:**
1. Verify migration ran successfully: `SELECT group_name FROM menu_items LIMIT 5;`
2. Check backend response format: Look at `/api/v1/auth/me` response
3. Clear browser cache completely
4. Restart backend server

### Empty Groups Appearing

**Symptom:** Group header shown but no items

**Solutions:**
1. Backend should filter empty groups - check `get_user_menu()` logic
2. Verify user has permissions: `SELECT * FROM user_permissions_view WHERE user_id = X;`
3. Check frontend conditional: `if (!group.items || group.items.length === 0) return null;`

### Icons Not Displaying

**Symptom:** Missing icons or wrong icons

**Solutions:**
1. Verify icon name matches Material-UI: `import { IconName } from '@mui/icons-material'`
2. Check icon mapping in `DynamicMenu.jsx`
3. Add missing icon to `iconMap` object

### Permissions Not Working

**Symptom:** User sees items they shouldn't

**Solutions:**
1. Check user's assigned roles: `SELECT * FROM user_roles WHERE user_id = X;`
2. Verify role permissions: `SELECT * FROM role_permissions WHERE role_id = Y;`
3. Confirm menu item's `required_permission` field is set
4. Test permission function: `SELECT user_has_permission(1, 'analysis.view');`

## Migration Rollback

If you need to rollback the changes:

```sql
-- Remove group columns
ALTER TABLE menu_items 
DROP COLUMN IF EXISTS group_name,
DROP COLUMN IF EXISTS group_order,
DROP COLUMN IF EXISTS group_icon;

-- Restore old function
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
```

Then update backend to return flat list and frontend to render flat menu.

## Performance Considerations

- **Database Indexes:** Added `idx_menu_items_group` for faster grouping queries
- **Frontend Rendering:** Groups are memoized, only re-render when menu changes
- **API Response Size:** Minimal increase (~20-30 bytes per item for group metadata)

## Future Enhancements

1. **Collapsible Groups:** Allow users to expand/collapse individual groups
2. **Group Icons:** Display icons next to group headers (currently hidden when collapsed)
3. **Nested Submenus:** Support multi-level menu hierarchies
4. **User Preferences:** Remember which groups user has collapsed
5. **Admin UI:** Visual menu builder to manage groups via UI instead of SQL

## Related Files

```
Backend:
├── sow-backend/src/app/db/migrations/add_menu_groups.sql
├── sow-backend/src/app/services/auth_service.py
├── sow-backend/run_menu_migration.py
└── sow-backend/src/app/db/rbac_schema.sql

Frontend:
├── frontend/src/components/Menu/DynamicMenu.jsx
└── frontend/src/contexts/AuthContext.jsx
```

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs for SQL errors
3. Verify database migration completed
4. Test with different user roles
5. Review this documentation

---

**Last Updated:** November 28, 2025
**Version:** 1.0.0
