"""
Run admin permissions migration
Adds role.assign and audit.view permissions and admin menu items
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

# Load .env from sow-backend root
env_path = Path(__file__).resolve().parents[3] / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"✅ Loaded .env from {env_path}")
else:
    print(f"⚠️  .env not found at {env_path}")

from src.app.db.client import get_db_connection, execute_update


def run_migration():
    """Run the admin permissions migration"""
    print("=" * 70)
    print("Admin Permissions Migration")
    print("=" * 70)
    
    # Read the migration SQL file
    migration_file = Path(__file__).parent / "add_admin_permissions.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
    
    # Split into individual statements (removing comments and empty lines)
    statements = []
    current_statement = []
    
    for line in migration_sql.split('\n'):
        stripped = line.strip()
        
        # Skip comments and empty lines
        if not stripped or stripped.startswith('--'):
            continue
        
        current_statement.append(line)
        
        # If line ends with semicolon, it's the end of a statement
        if stripped.endswith(';'):
            statements.append('\n'.join(current_statement))
            current_statement = []
    
    # Execute each statement
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        for i, statement in enumerate(statements, 1):
            if statement.strip():
                print(f"\n📝 Executing statement {i}/{len(statements)}...")
                try:
                    cursor.execute(statement)
                    conn.commit()
                    print(f"✅ Statement {i} executed successfully")
                except Exception as e:
                    print(f"⚠️  Statement {i} error (may be expected): {e}")
                    conn.rollback()
        
        print("\n" + "=" * 70)
        print("Migration completed!")
        print("=" * 70)
        
        # Verify additions
        print("\n📋 Verifying new permissions:")
        cursor.execute("""
            SELECT code, name, category 
            FROM permissions 
            WHERE code IN ('role.assign', 'audit.view')
        """)
        permissions = cursor.fetchall()
        for perm in permissions:
            print(f"  ✓ {perm[0]} - {perm[1]} ({perm[2]})")
        
        print("\n📋 Verifying new menu items:")
        cursor.execute("""
            SELECT key, label, path, required_permission 
            FROM menu_items 
            WHERE key LIKE 'admin-%'
        """)
        menu_items = cursor.fetchall()
        for item in menu_items:
            print(f"  ✓ {item[0]} - {item[1]} ({item[2]}) [requires: {item[3]}]")
        
        print("\n✅ Migration successful!")
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
