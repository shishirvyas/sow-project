# RBAC Implementation Guide for SKOPE Platform

## 🎯 Overview

This guide walks you through implementing a complete Role-Based Access Control (RBAC) system with:
- Dynamic menu configuration from backend
- User roles and permissions
- UI component visibility control
- PostgreSQL database integration

## 📁 Files Created

1. **`src/app/db/rbac_schema.sql`** - Complete RBAC database schema
2. **`src/app/db/init_db.py`** - Database initialization script

## 🚀 Quick Start

### Step 1: Set Up Database Connection

Add to your `.env` file or set environment variable:

```bash
# Option 1: Single connection string
DATABASE_URL=postgresql://username:password@host:port/database_name

# Option 2: Individual parameters
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=sow_analysis
```

### Step 2: Install Required Package

```bash
pip install psycopg2-binary
```

Add to `requirements.txt`:
```
psycopg2-binary
```

### Step 3: Run Database Initialization

```bash
cd sow-backend
python src/app/db/init_db.py
```

This will:
- Create all RBAC tables
- Seed 5 roles (Super Admin, Admin, Manager, Analyst, Viewer)
- Seed 30+ permissions
- Seed 7 menu items
- Create 5 test users with different roles
- Create helper functions and views

## 📊 Database Schema Overview

### Core Tables

1. **users** - User accounts
2. **roles** - Role definitions (Admin, Manager, Analyst, Viewer)
3. **permissions** - Granular permissions (document.upload, analysis.view, etc.)
4. **user_roles** - User-to-role assignments (many-to-many)
5. **role_permissions** - Role-to-permission mappings (many-to-many)
6. **menu_items** - Dynamic menu configuration
7. **ui_components** - UI component visibility control
8. **audit_log** - Audit trail of user actions

### Helper Views & Functions

- **user_permissions_view** - Aggregated permissions per user
- **user_menu_items_view** - Menu items available to each user
- **user_has_permission(user_id, permission_code)** - Check permission
- **get_user_menu(user_id)** - Get user's menu items

## 🔑 Test Credentials

All test users have password: **`password123`**

| Email | Role | Permissions |
|-------|------|-------------|
| admin@skope.ai | Administrator | Almost all permissions |
| manager@skope.ai | Manager | View all analyses, manage documents |
| analyst@skope.ai | Analyst | Upload & analyze documents |
| viewer@skope.ai | Viewer | Read-only access |
| john.doe@skope.ai | Analyst | Upload & analyze documents |

## 🔐 Permission Categories

### Document Permissions
- `document.upload` - Upload SOW documents
- `document.view` - View documents
- `document.delete` - Delete documents
- `document.download` - Download documents

### Analysis Permissions
- `analysis.create` - Create analysis
- `analysis.view` - View own analyses
- `analysis.view_all` - View all users' analyses
- `analysis.delete` - Delete analyses
- `analysis.export` - Export as PDF

### Prompt Permissions
- `prompt.view` - View prompts
- `prompt.create` - Create prompts
- `prompt.edit` - Edit prompts
- `prompt.delete` - Delete prompts

### Admin Permissions
- `user.view` - View users
- `user.create` - Create users
- `user.edit` - Edit users
- `user.delete` - Delete users
- `user.assign_roles` - Assign roles
- `role.*` - Role management

### System Permissions
- `system.dashboard` - Access dashboard
- `system.settings` - System configuration
- `system.audit_log` - View audit logs

## 📋 Next Steps - Implementation Roadmap

### Phase 1: Backend Authentication (Priority: HIGH)

1. **Create authentication endpoints** (`src/app/api/v1/auth.py`):
   ```python
   POST /api/v1/auth/login
   POST /api/v1/auth/logout
   POST /api/v1/auth/refresh
   GET /api/v1/auth/me
   ```

2. **Implement JWT token generation**
3. **Add password hashing with bcrypt**
4. **Create middleware for token validation**

### Phase 2: User & Permission Endpoints (Priority: HIGH)

Create `src/app/api/v1/users.py`:
```python
GET /api/v1/users/me/permissions
GET /api/v1/users/me/menu
GET /api/v1/users
POST /api/v1/users
PUT /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

### Phase 3: Frontend Integration (Priority: HIGH)

1. **Update authentication context** (`frontend/src/contexts/AuthContext.jsx`):
   - Store user, permissions, and menu in state
   - Fetch permissions on login
   - Implement permission checking hooks

2. **Create permission utilities** (`frontend/src/utils/permissions.js`):
   ```javascript
   hasPermission(permission)
   hasAnyPermission([permissions])
   hasAllPermissions([permissions])
   ```

3. **Update MainLayout**:
   - Fetch menu from backend: `GET /api/v1/users/me/menu`
   - Render menu dynamically based on response
   - Filter menu items by permissions

4. **Create permission components**:
   ```jsx
   <CanView permission="analysis.export">
     <Button>Download PDF</Button>
   </CanView>
   ```

### Phase 4: Protect API Endpoints (Priority: MEDIUM)

Add permission decorators:
```python
@require_permission("analysis.create")
def create_analysis():
    ...
```

### Phase 5: Admin UI (Priority: LOW)

1. User management page
2. Role management page
3. Permission assignment UI
4. Audit log viewer

## 🔧 Configuration Examples

### Update config.py

```python
# src/app/core/config.py
class Settings(BaseSettings):
    # ... existing settings ...
    
    DATABASE_URL: str = None
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
```

### Sample Auth Endpoint

```python
# src/app/api/v1/auth.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # 1. Query user from database
    # 2. Verify password
    # 3. Generate JWT token
    # 4. Return token + user info
    pass

@router.get("/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    # 1. Decode JWT token
    # 2. Query user from database
    # 3. Return user + permissions
    pass
```

## 📚 Resources & Examples

### Query User Permissions

```python
from src.app.db.client import get_db_connection

def get_user_permissions(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT permission_code, permission_name, permission_category
        FROM user_permissions_view
        WHERE user_id = %s
    """, (user_id,))
    
    permissions = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return [
        {
            "code": p[0],
            "name": p[1],
            "category": p[2]
        }
        for p in permissions
    ]
```

### Query User Menu

```python
def get_user_menu(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM get_user_menu(%s)", (user_id,))
    menu_items = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return [
        {
            "id": item[0],
            "key": item[1],
            "label": item[2],
            "icon": item[3],
            "path": item[4],
            "parent_id": item[5],
            "display_order": item[6]
        }
        for item in menu_items
    ]
```

## 🎨 Frontend Permission Component Example

```jsx
// src/components/CanView.jsx
import { useAuth } from '../contexts/AuthContext'

export function CanView({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth()
  
  if (!hasPermission(permission)) {
    return fallback
  }
  
  return children
}

// Usage:
<CanView permission="analysis.export">
  <Button onClick={handleDownloadPDF}>
    Download PDF
  </Button>
</CanView>
```

## ⚠️ Important Security Notes

1. **Change default passwords** in production
2. **Use environment variables** for sensitive data
3. **Implement rate limiting** on auth endpoints
4. **Use HTTPS** in production
5. **Rotate JWT secret keys** periodically
6. **Hash passwords** with bcrypt (never store plain text)
7. **Validate all inputs** on backend
8. **Log security events** in audit_log table

## 🧪 Testing

```python
# Test permission check
def test_user_permission():
    from src.app.db.client import get_db_connection
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Test: Does analyst have document.upload permission?
    cursor.execute("""
        SELECT user_has_permission(
            (SELECT id FROM users WHERE email = 'analyst@skope.ai'),
            'document.upload'
        )
    """)
    
    result = cursor.fetchone()[0]
    assert result == True  # Analyst should have upload permission
    
    # Test: Does viewer have document.delete permission?
    cursor.execute("""
        SELECT user_has_permission(
            (SELECT id FROM users WHERE email = 'viewer@skope.ai'),
            'document.delete'
        )
    """)
    
    result = cursor.fetchone()[0]
    assert result == False  # Viewer should NOT have delete permission
```

## 📞 Support

Questions or issues? Check:
1. Database connection in `.env`
2. PostgreSQL service is running
3. User has proper database permissions
4. Review `init_db.py` output for errors

Happy coding! 🚀
