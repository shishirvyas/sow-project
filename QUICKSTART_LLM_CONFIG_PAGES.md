# 🚀 Quick Start Guide - LLM Config Management Pages

## ✅ Implementation Complete!

All three management pages (Countries, Categories, Sub-Categories) have been created with full CRUD functionality.

---

## 📋 Step-by-Step Setup

### 1. Run Database Migration
Execute the menu migration SQL script to add the three new menu items:

```sql
-- File: Open the script in Azure Data Studio (Untitled-2 tab)
-- Execute all commands in the script
-- Verify the LLM Configs menu items
```

**Expected Output:**
```
id | key             | label          | icon              | display_order
4  | prompts         | Prompts        | EditNoteIcon      | 1
X  | countries       | Countries      | CountryIcon       | 2
Y  | categories      | Categories     | CategoryIcon      | 3
Z  | sub-categories  | Sub-Categories | SubCategoryIcon   | 4
```

---

### 2. Restart Backend Server

```bash
cd C:\projects\sow-project\sow-backend
python -m uvicorn src.app.main:app --host 127.0.0.1 --port 8000
```

**Verify Startup:**
- Check terminal output for no errors
- Look for `Application startup complete`
- Endpoints should load without errors

---

### 3. Test Frontend

1. **Clear Browser Cache**
   ```
   Chrome: Ctrl+Shift+Delete → Clear browsing data → Cached images and files
   Edge: Ctrl+Shift+Delete → Select "Cached images and files"
   ```

2. **Login as Super Admin**
   - Navigate to: `http://localhost:5173` (or your frontend URL)
   - Login with super admin credentials

3. **Verify Menu**
   - Expand sidebar menu
   - Look for **"LLM CONFIGS"** group
   - Should show 4 items:
     - ✅ Prompts
     - ✅ Countries (NEW)
     - ✅ Categories (NEW)
     - ✅ Sub-Categories (NEW)

---

## 🧪 Testing Each Page

### Countries Management

**URL:** `/countries`

**Test Add:**
1. Click "Add Country" button
2. Fill in:
   - Country Name: `Test Country`
   - ISO Code 2: `TC`
   - ISO Code 3: `TST`
   - Numeric Code: `999`
   - Region: Select from dropdown
   - Active: Toggle on/off
3. Click "Create"
4. Should see success snackbar
5. New country appears in table

**Test Edit:**
1. Click edit icon (pencil) on any country
2. Modify fields
3. Click "Update"
4. Changes reflected in table

**Test Delete:**
1. Click delete icon (trash) on test country
2. Confirm deletion
3. Country removed from table

**Test Search:**
1. Type in search box
2. Table filters instantly
3. Try searching by: name, ISO code, region

---

### Categories Management

**URL:** `/categories`

**Test Add:**
1. Click "Add Category"
2. Fill in:
   - Category Name: `Test Category`
   - Category Code: `TEST`
   - Description: `Test description`
   - Display Order: `99`
   - Active: On
3. Click "Create"
4. Verify sub-category count shows `0`

**Test Edit:**
1. Edit an existing category
2. Change display order
3. Verify position changes in table

**Test Delete:**
1. Try deleting category with sub-categories
2. Should see warning about CASCADE delete
3. Confirm deletion
4. Verify sub-categories also deleted

**Test Search:**
1. Search by category name, code, or description
2. Verify filtering works

---

### Sub-Categories Management

**URL:** `/sub-categories`

**Test Add:**
1. Click "Add Sub-Category"
2. Fill in:
   - Parent Category: Select from dropdown
   - Sub-Category Name: `Test Sub`
   - Sub-Category Code: `TEST-SUB`
   - Description: `Test`
   - Display Order: `99`
   - Active: On
3. Click "Create"
4. Verify parent category code displays correctly

**Test Edit:**
1. Edit sub-category
2. Change parent category
3. Verify change reflected

**Test Delete:**
1. Delete test sub-category
2. Verify removal

**Test Filter:**
1. Use "Filter by Category" dropdown
2. Select a category
3. Only that category's sub-categories show
4. Select "All Categories" to clear filter

**Test Search:**
1. Search by sub-category name, code, or parent category
2. Verify combined with category filter

---

## 🔍 Troubleshooting

### Menu Items Not Showing
- ✅ Check: Database migration executed?
- ✅ Check: Backend server restarted?
- ✅ Check: Browser cache cleared?
- ✅ Check: Logged in as super admin?

### API Errors (404 Not Found)
- ✅ Check: Backend server running?
- ✅ Check: Endpoints.py updated with new routes?
- ✅ Check: No syntax errors in terminal?

### Permission Denied (403)
- ✅ Check: User has `prompt.view` permission?
- ✅ Check: Super admin role assigned?

### Data Not Saving
- ✅ Check: Database tables exist (countries, categories, sub_categories)?
- ✅ Check: No database errors in backend logs?
- ✅ Check: execute_query() commit fix is in place?

---

## 📡 API Endpoints (For Reference)

### Countries
```
GET    /api/v1/countries         - List all
POST   /api/v1/countries         - Create
PUT    /api/v1/countries/{id}    - Update
DELETE /api/v1/countries/{id}    - Delete
```

### Categories
```
GET    /api/v1/categories        - List all (with sub-category count)
POST   /api/v1/categories        - Create
PUT    /api/v1/categories/{id}   - Update
DELETE /api/v1/categories/{id}   - Delete (CASCADE)
```

### Sub-Categories
```
GET    /api/v1/sub-categories        - List all (with parent info)
POST   /api/v1/sub-categories        - Create
PUT    /api/v1/sub-categories/{id}   - Update
DELETE /api/v1/sub-categories/{id}   - Delete
```

---

## ✅ Success Checklist

- [ ] Database migration executed successfully
- [ ] Backend server restarted without errors
- [ ] Browser cache cleared
- [ ] Logged in as super admin
- [ ] Menu shows 4 items under "LLM CONFIGS"
- [ ] Countries page loads
- [ ] Categories page loads
- [ ] Sub-Categories page loads
- [ ] Can create new records
- [ ] Can edit existing records
- [ ] Can delete records
- [ ] Search/filter works
- [ ] No console errors

---

## 🎯 Expected Behavior

### Menu Structure
```
LLM CONFIGS
  ├─ 📝 Prompts
  ├─ 🌍 Countries         ← NEW
  ├─ 📁 Categories        ← NEW
  └─ 🌳 Sub-Categories    ← NEW
```

### Data Flow
```
1. User clicks menu item → Route loads
2. Component fetchesdata → API call
3. Backend checks permission → Execute query
4. Database returns data → Frontend displays
5. User performs CRUD → API updates database
6. Success/Error notification shown
```

---

## 📞 Support

If issues persist:
1. Check backend terminal for error logs
2. Check browser console for JavaScript errors
3. Verify database tables exist and have data
4. Test API endpoints directly using curl/Postman
5. Check network tab for failed requests

---

## 🎉 Ready to Use!

Once all steps complete, you'll have three fully functional management pages with:
- ✅ Full CRUD operations
- ✅ Search and filtering
- ✅ Permission-based access
- ✅ Proper validation
- ✅ Success/error notifications
- ✅ Responsive UI
- ✅ Audit trail (created_by, modified_by)

Enjoy managing your Countries, Categories, and Sub-Categories! 🚀
