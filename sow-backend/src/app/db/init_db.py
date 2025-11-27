"""
Database initialization script for RBAC system
Run this to create tables and seed initial data
"""
import os
import sys
from pathlib import Path
import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.app.core.config import settings

def get_connection_params():
    """Get database connection parameters from settings"""
    # Parse DATABASE_URL if it exists
    db_url = os.getenv('DATABASE_URL', settings.DATABASE_URL)
    
    if db_url:
        # Parse postgres://user:password@host:port/dbname?params
        import re
        # Remove query parameters first
        db_url_clean = db_url.split('?')[0]
        pattern = r'postgres(?:ql)?://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)'
        match = re.match(pattern, db_url_clean)
        
        if match:
            user, password, host, port, dbname = match.groups()
            params = {
                'host': host,
                'port': int(port),
                'user': user,
                'password': password,
                'dbname': dbname
            }
            
            # Add SSL mode if present in URL
            if 'sslmode=require' in db_url:
                params['sslmode'] = 'require'
            
            return params
    
    # Fallback to individual settings
    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
        'dbname': os.getenv('DB_NAME', 'sow_analysis')
    }

def init_database():
    """Initialize database with RBAC schema and seed data"""
    
    params = get_connection_params()
    
    print(f"Connecting to database: {params['host']}:{params['port']}/{params['dbname']}")
    print(f"User: {params['user']}")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("✓ Connected to database successfully")
        
        # Check if RBAC tables already exist
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            )
        """)
        rbac_exists = cursor.fetchone()[0]
        
        if rbac_exists:
            print("\n⚠ RBAC tables already exist. Skipping initialization.")
            print("To reinitialize, drop the RBAC tables first.")
            return False
        
        print("\n📝 Initializing RBAC tables...")
        
        # Read and execute RBAC schema
        rbac_schema_path = Path(__file__).parent / 'rbac_schema.sql'
        if rbac_schema_path.exists():
            print("\n📝 Executing RBAC schema...")
            with open(rbac_schema_path, 'r', encoding='utf-8') as f:
                rbac_sql = f.read()
                cursor.execute(rbac_sql)
            print("✓ RBAC schema executed successfully")
        else:
            print("⚠ RBAC schema file not found")
            return False
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\n✓ Created {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Verify test users
        cursor.execute("SELECT email, full_name FROM users ORDER BY email")
        users = cursor.fetchall()
        print(f"\n✓ Created {len(users)} test users:")
        for user in users:
            print(f"  - {user[0]} ({user[1]})")
        
        # Verify roles
        cursor.execute("SELECT name, display_name FROM roles ORDER BY name")
        roles = cursor.fetchall()
        print(f"\n✓ Created {len(roles)} roles:")
        for role in roles:
            print(f"  - {role[0]} ({role[1]})")
        
        # Verify permissions
        cursor.execute("SELECT COUNT(*) FROM permissions")
        perm_count = cursor.fetchone()[0]
        print(f"\n✓ Created {perm_count} permissions")
        
        # Verify menu items
        cursor.execute("SELECT key, label FROM menu_items ORDER BY display_order")
        menu_items = cursor.fetchall()
        print(f"\n✓ Created {len(menu_items)} menu items:")
        for item in menu_items:
            print(f"  - {item[0]} ({item[1]})")
        
        # Test helper function
        cursor.execute("SELECT get_user_menu(1)")
        user_menu = cursor.fetchall()
        print(f"\n✓ Test user (admin) has access to {len(user_menu)} menu items")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*60)
        print("🎉 Database initialization completed successfully!")
        print("="*60)
        print("\n📋 Test Credentials (password: password123):")
        print("  - admin@skope.ai (Administrator)")
        print("  - manager@skope.ai (Manager)")
        print("  - analyst@skope.ai (Analyst)")
        print("  - viewer@skope.ai (Viewer)")
        print("  - john.doe@skope.ai (Analyst)")
        print("\n💡 Next steps:")
        print("  1. Update your .env file with DATABASE_URL")
        print("  2. Implement authentication endpoints")
        print("  3. Update frontend to fetch menu from backend")
        print("  4. Add permission checks to API endpoints")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("="*60)
    print("SKOPE Platform - Database Initialization")
    print("="*60)
    print()
    
    success = init_database()
    sys.exit(0 if success else 1)
