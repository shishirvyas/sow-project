#!/usr/bin/env python3
"""
Run user profile migration
"""
import os
import sys
import psycopg2
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def run_migration():
    """Execute the user profile migration"""
    
    # Get database URL from environment
    db_url = os.getenv('DATABASE_URL')
    
    if not db_url:
        print("❌ DATABASE_URL environment variable not set")
        print("Please set DATABASE_URL in your .env file")
        return False
    
    migration_file = Path(__file__).parent / 'src' / 'app' / 'db' / 'migrations' / 'add_user_profiles.sql'
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print("🔄 Running user profile migration...")
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
        print("\n👥 Verifying user profiles...")
        cursor.execute("""
            SELECT email, full_name, job_title, department, years_of_experience
            FROM users 
            WHERE email IN (
                'admin@skope.ai', 
                'manager@skope.ai', 
                'analyst@skope.ai', 
                'viewer@skope.ai', 
                'john.doe@skope.ai'
            )
            ORDER BY email
        """)
        
        users = cursor.fetchall()
        print(f"\n✓ Updated {len(users)} user profiles:")
        for user in users:
            print(f"\n  📧 {user[0]}")
            print(f"     Name: {user[1]}")
            print(f"     Title: {user[2]}")
            print(f"     Department: {user[3]}")
            print(f"     Experience: {user[4]} years")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 User profile migration completed successfully!")
        print("\n📝 Next steps:")
        print("  1. Restart your backend server to pick up changes")
        print("  2. Login to see updated profile information")
        print("  3. Test profile API endpoint: /api/v1/auth/me")
        
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
