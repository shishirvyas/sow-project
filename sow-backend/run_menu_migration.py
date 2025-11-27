#!/usr/bin/env python3
"""
Run menu grouping migration
"""
import os
import sys
import psycopg2
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def run_migration():
    """Execute the menu grouping migration"""
    
    # Get database URL from environment
    db_url = os.getenv('DATABASE_URL')
    
    if not db_url:
        print("❌ DATABASE_URL environment variable not set")
        print("Please set DATABASE_URL in your .env file")
        return False
    
    migration_file = Path(__file__).parent / 'src' / 'app' / 'db' / 'migrations' / 'add_menu_groups.sql'
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print("🔄 Running menu grouping migration...")
    print(f"📄 Migration file: {migration_file}")
    
    try:
        # Read migration SQL
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Connect to database
        print(f"🔌 Connecting to database...")
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Execute migration
        print("⚙️  Executing migration...")
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration completed successfully!")
        
        # Verify the changes
        print("\n📋 Verifying menu groups...")
        cursor.execute("""
            SELECT DISTINCT group_name, group_order, COUNT(*) as item_count
            FROM menu_items 
            WHERE group_name IS NOT NULL
            GROUP BY group_name, group_order
            ORDER BY group_order
        """)
        
        groups = cursor.fetchall()
        print(f"\n✓ Created {len(groups)} menu groups:")
        for group in groups:
            print(f"  - {group[0]} (order: {group[1]}, items: {group[2]})")
        
        # Test the function
        print("\n🧪 Testing get_user_menu function...")
        cursor.execute("SELECT get_user_menu(1)")
        menu_items = cursor.fetchall()
        print(f"✓ Function returns {len(menu_items)} menu items for test user")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Menu grouping migration completed successfully!")
        print("\n📝 Next steps:")
        print("  1. Restart your backend server to pick up changes")
        print("  2. Clear browser cache and reload frontend")
        print("  3. Verify grouped menus appear in the UI")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == '__main__':
    # Load environment variables
    try:
        from dotenv import load_dotenv
        env_file = project_root / '.env'
        if env_file.exists():
            load_dotenv(env_file)
            print(f"✓ Loaded environment from {env_file}")
        else:
            print(f"⚠️  No .env file found at {env_file}")
    except ImportError:
        print("⚠️  python-dotenv not installed, using system environment variables")
    
    success = run_migration()
    sys.exit(0 if success else 1)
