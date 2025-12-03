"""
Migration script to add file management tables and permissions
Run this to add document tracking with user ownership
"""
import os
import sys
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.app.core.config import settings


def get_connection_params():
    """Get database connection parameters from settings"""
    return {
        'host': settings.DB_HOST,
        'port': settings.DB_PORT,
        'dbname': settings.DB_NAME,
        'user': settings.DB_USER,
        'password': settings.DB_PASSWORD,
        'sslmode': 'require'
    }


def run_migration():
    """Run file management migration"""
    
    params = get_connection_params()
    
    print(f"Connecting to database: {params['host']}:{params['port']}/{params['dbname']}")
    print(f"User: {params['user']}")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("✓ Connected to database successfully")
        
        # Check if tables already exist
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'uploaded_documents'
            )
        """)
        tables_exist = cursor.fetchone()[0]
        
        if tables_exist:
            print("\n⚠ File management tables already exist.")
            response = input("Do you want to re-run the migration (y/N)? ")
            if response.lower() != 'y':
                print("Migration cancelled.")
                return False
        
        print("\n📝 Running file management migration...")
        
        # Read and execute migration SQL
        migration_path = Path(__file__).parent / 'file_management_schema.sql'
        
        if not migration_path.exists():
            print(f"❌ Migration file not found: {migration_path}")
            return False
        
        with open(migration_path, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
            cursor.execute(migration_sql)
        
        print("✓ Migration executed successfully")
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('uploaded_documents', 'document_access_log', 'analysis_results')
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\n✓ Created/Updated {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Verify permission was added
        cursor.execute("""
            SELECT code, name FROM permissions 
            WHERE code = 'file.view_all'
        """)
        
        permission = cursor.fetchone()
        if permission:
            print(f"\n✓ Permission added: {permission[0]} - {permission[1]}")
        else:
            print("\n⚠ Warning: file.view_all permission not found")
        
        # Verify role assignments
        cursor.execute("""
            SELECT r.name, COUNT(rp.id) as perm_count
            FROM roles r
            JOIN role_permissions rp ON r.id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE p.code = 'file.view_all'
            GROUP BY r.name
        """)
        
        role_assignments = cursor.fetchall()
        if role_assignments:
            print(f"\n✓ file.view_all assigned to roles:")
            for role_name, _ in role_assignments:
                print(f"  - {role_name}")
        else:
            print("\n⚠ Warning: file.view_all not assigned to any roles")
        
        # Verify functions were created
        cursor.execute("""
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_type = 'FUNCTION'
            AND routine_name IN ('user_can_view_document', 'get_user_documents')
            ORDER BY routine_name
        """)
        
        functions = cursor.fetchall()
        print(f"\n✓ Created {len(functions)} helper functions:")
        for func in functions:
            print(f"  - {func[0]}()")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*60)
        print("🎉 File management migration completed successfully!")
        print("="*60)
        print("\n📋 What's New:")
        print("  ✅ uploaded_documents table - tracks all uploaded files with user ownership")
        print("  ✅ document_access_log table - audit trail for file access")
        print("  ✅ analysis_results table - links documents to analysis outputs")
        print("  ✅ file.view_all permission - allows viewing all files")
        print("  ✅ Helper functions for permission checking")
        print("\n💡 Next steps:")
        print("  1. Restart your backend server")
        print("  2. Upload a document - it will now track the user")
        print("  3. Users will only see their own files in analysis history")
        print("  4. Users with 'admin', 'manager' roles can see all files")
        print("  5. Test with different user roles to verify permissions")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print("="*60)
    print("File Management Migration")
    print("="*60)
    print()
    
    success = run_migration()
    sys.exit(0 if success else 1)

