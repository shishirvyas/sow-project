# Azure PostgreSQL Database Migration Status

**Target Database**: `sow-db-server.postgres.database.azure.com/sowdb`  
**Date**: December 3, 2025  
**Status**: ⚠️ Partially Complete - Manual Action Required

---

## ✅ Current State (What's Already in Azure)

The following tables/objects are **already present** in the Azure database:

### RBAC System (Complete)
- ✅ `users` - User accounts with profile fields
- ✅ `roles` - Role definitions
- ✅ `permissions` - Granular permissions
- ✅ `user_roles` - User-to-role assignments
- ✅ `role_permissions` - Role-to-permission assignments
- ✅ `menu_items` - Dynamic menu with group support
- ✅ `ui_components` - UI component visibility control
- ✅ `audit_log` - Audit trail of user actions

### Views (Complete)
- ✅ `user_permissions_view` - Flattened user permissions
- ✅ `user_menu_items_view` - User-accessible menu items

### Functions (Complete)
- ✅ `get_user_menu(user_id)` - Returns filtered menu items
- ✅ `user_has_permission(user_id, permission_code)` - Permission check

### Prompt Management (Complete)
- ✅ `prompt_templates` - Clause-based prompt templates
- ✅ `prompt_variables` - Template variables
- ✅ `prompts` - General purpose prompts

### Indexes (Complete)
- ✅ All performance indexes on RBAC tables
- ✅ All FK indexes for joins
- ✅ All unique constraints

### Sequences (Complete)
- ✅ All 11 sequences for auto-increment columns
- ✅ `prompt_embeddings_id_seq` (added)
- ✅ `sow_embeddings_id_seq` (added)

---

## ⚠️ Missing Components (Require Manual Setup)

### 1. **pgvector Extension** (BLOCKED - Admin Action Required)

**Status**: ❌ Not installed (extension not allow-listed)

**Error Message**:
```
extension "vector" is not allow-listed for "azure_pg_admin" users
```

**Required Action** (Must be done by Azure admin):
1. Go to Azure Portal → PostgreSQL Server → **Server parameters**
2. Find parameter: `azure.extensions`
3. Add `VECTOR` to the allow list
4. **Save** and restart server if prompted
5. Then connect and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

**Reference**: https://go.microsoft.com/fwlink/?linkid=2301063

---

### 2. **Embedding Tables** (Ready to Deploy - Pending pgvector)

Once pgvector is enabled, run the script opened in the editor to create:

#### `prompt_embeddings` Table
- Stores vector embeddings of prompt templates
- 384-dimensional vectors (all-MiniLM-L6-v2 model)
- HNSW index for fast cosine similarity search
- Foreign key to `prompt_templates.clause_id`

#### `sow_embeddings` Table
- Caches embeddings of SOW documents
- Tracks access count and last accessed time
- SHA256 file hash for cache invalidation
- Azure blob name as unique identifier

**Fields**:
```sql
prompt_embeddings:
  - id (PK)
  - clause_id (FK → prompt_templates, UNIQUE)
  - embedding_vector (vector(384))
  - text_hash, model_name
  - created_at, updated_at

sow_embeddings:
  - id (PK)
  - blob_name (UNIQUE)
  - file_hash (SHA256)
  - embedding_vector (vector(384))
  - text_length, model_name
  - created_at, last_accessed, access_count
```

---

### 3. **Clause Library Tables** (Not in Azure - Aiven Only)

The following tables exist in **Aiven** but are **NOT present in Azure**:

#### Core Clause Tables
- `scope_type` - Enum for scope levels (global, country, region, company)
- `language` - Language codes (en, fr, de, etc.)
- `country` - Countries with ISO codes
- `region` - Sub-country regions
- `company` - Company definitions
- `category_l1`, `category_l1_text` - Level 1 categories
- `category_l2`, `category_l2_text` - Level 2 categories
- `clause` - Core clause definitions
- `clause_text` - Multi-language clause content
- `clause_scope` - Geo/company-specific clause variants
- `clause_scope_text` - Multi-language scope overrides

#### Supporting Tables
- `benchmark` - Performance benchmarks
- `risk_register` - Risk assessments
- `redline` - Clause change tracking
- `document` - File attachments
- `app_user` - Alternative user table (UUID-based)

**Decision Required**: Do you want to migrate these tables to Azure, or keep them Aiven-only?

---

## 🔄 Migration Script Execution

### Step 1: Enable pgvector (Azure Admin Only)
See "Required Action" in section 1 above.

### Step 2: Run Migration Script
After pgvector is enabled, execute the SQL script that was opened in the editor:
- File: `Untitled-7` (opened in VS Code)
- Contains: Table creation DDL + indexes + comments
- Connection: Already connected to Azure sowdb

### Step 3: Verify Installation
Run these verification queries:
```sql
-- Check extension
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('prompt_embeddings', 'sow_embeddings');

-- Check row counts (should be 0 initially)
SELECT 'prompt_embeddings' as table_name, COUNT(*) FROM prompt_embeddings
UNION ALL
SELECT 'sow_embeddings', COUNT(*) FROM sow_embeddings;
```

---

## 🎯 Backend Configuration

### Update `.env` File

Currently, `DATABASE_URL` is empty. You need to decide which database to use:

**Option 1: Use Azure Database**
```env
DATABASE_URL=postgresql://sowdb:Orai121212@sow-db-server.postgres.database.azure.com:5432/sowdb?sslmode=require
```

**Option 2: Use Aiven Database**
```env
DATABASE_URL=postgresql://avnadmin:AVNS_qn2gZKOT3iF-wTMQV9j@sow-service-sow.f.aivencloud.com:21832/defaultdb?sslmode=require
```

**Option 3: Use Both (Recommended for Development)**
```env
# Primary database (RBAC, users, prompts)
DATABASE_URL=postgresql://sowdb:Orai121212@sow-db-server.postgres.database.azure.com:5432/sowdb?sslmode=require

# Clause library database (optional - if you migrate clause tables)
CLAUSE_DATABASE_URL=postgresql://avnadmin:AVNS_qn2gZKOT3iF-wTMQV9j@sow-service-sow.f.aivencloud.com:21832/defaultdb?sslmode=require
```

---

## 📊 Comparison: Aiven vs Azure

| Feature | Aiven (defaultdb) | Azure (sowdb) | Status |
|---------|-------------------|---------------|--------|
| **Extensions** | ✅ pgvector, pgcrypto | ⚠️ plpgsql only | Need pgvector |
| **RBAC Tables** | ✅ Complete | ✅ Complete | **Synced** |
| **Embedding Tables** | ✅ With data | ❌ Not created | Pending |
| **Clause Library** | ✅ 20+ tables | ❌ None | Not migrated |
| **Functions** | ✅ get_user_menu, user_has_permission | ✅ Same | **Synced** |
| **Views** | ✅ 2 views | ✅ 2 views | **Synced** |
| **Indexes** | ✅ HNSW + BTree | ✅ BTree only | Need HNSW |
| **Version** | PostgreSQL 17.6 | PostgreSQL 17.6 | **Same** |

---

## 🚀 Next Steps

### Immediate (Required)
1. **Enable pgvector** on Azure (contact Azure admin or use Azure Portal)
2. **Run migration script** (already opened in editor)
3. **Update `.env`** with chosen DATABASE_URL
4. **Test connection** from backend application

### Short-term (Recommended)
1. Decide on clause library table migration strategy
2. Seed initial data (roles, permissions, menu items) if not present
3. Test JWT authentication flow
4. Verify menu generation for test users

### Long-term (Optional)
1. Set up automated schema sync between Aiven and Azure
2. Implement read replicas for high availability
3. Configure backup/restore procedures
4. Set up monitoring and alerting

---

## 📝 Notes

- Both databases are PostgreSQL 17.6 (same version)
- RBAC structure is **identical** in both databases
- Aiven has **more extensions** (pgcrypto, pgvector)
- Azure requires **manual extension approval** via Portal
- Clause library tables (20+ tables) exist **only in Aiven**

---

## 🔗 Useful Links

- Azure PostgreSQL Extensions: https://go.microsoft.com/fwlink/?linkid=2301063
- pgvector Documentation: https://github.com/pgvector/pgvector
- Azure Database for PostgreSQL: https://docs.microsoft.com/azure/postgresql/

---

**Last Updated**: December 3, 2025  
**Schema Source**: Aiven defaultdb  
**Migration Target**: Azure sowdb  
**Backend Config**: `sow-backend/.env`
