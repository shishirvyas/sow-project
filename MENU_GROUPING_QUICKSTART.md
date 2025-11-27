# Menu Grouping - Quick Start

## What Changed

Menu items are now organized into groups:
- **SOW** → Dashboard, Analyze Doc, Analysis History
- **LLM Configs** → Prompts  
- **User Management** → Users, Roles, Permissions

Groups automatically hide if user has no permissions for items inside.

## Run Migration

```bash
cd sow-backend
python run_menu_migration.py
```

## Restart Services

```bash
# Backend
python -m uvicorn src.app.main:app --host 127.0.0.1 --port 8000

# Frontend (separate terminal)
cd ../frontend
npm run dev
```

## Verify

1. Clear browser cache (Ctrl+Shift+Delete)
2. Login to app
3. Check sidebar menu - should show grouped items with headers

## Files Changed

**Backend:**
- ✅ `sow-backend/src/app/db/migrations/add_menu_groups.sql` (new)
- ✅ `sow-backend/src/app/services/auth_service.py` (modified)
- ✅ `sow-backend/run_menu_migration.py` (new)

**Frontend:**
- ✅ `frontend/src/components/Menu/DynamicMenu.jsx` (modified)

**Docs:**
- ✅ `MENU_GROUPING_GUIDE.md` (new)

## Visual Changes

**Before:**
```
☰ Dashboard
☰ Analyze Doc
☰ Analysis History
☰ Prompts
☰ Users
☰ Settings
☰ Profile
```

**After:**
```
SOW
  ☰ Dashboard
  ☰ Analyze Doc
  ☰ Analysis History

LLM CONFIGS
  ☰ Prompts

USER MANAGEMENT
  ☰ Users
  ☰ Roles
  ☰ Permissions

☰ Settings
☰ Profile
```

## Troubleshooting

**Groups not showing?**
- Run migration: `python run_menu_migration.py`
- Restart backend
- Clear browser cache

**Empty groups appearing?**
- Check user permissions in database
- Backend filters empty groups automatically

**Icons missing?**
- Verify icon names in database match Material-UI icons
- Check `DynamicMenu.jsx` iconMap

## Need Help?

See full documentation: `MENU_GROUPING_GUIDE.md`
