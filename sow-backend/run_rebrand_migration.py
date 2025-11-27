#!/usr/bin/env python3
"""
Run SKOPE360 rebranding migration
"""
import os
import sys
import psycopg2
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def run_migration():
    db_url = os.getenv('DATABASE_URL')
    
    if not db_url:
        print("❌ DATABASE_URL environment variable not set")
        return False
    
    migration_file = Path(__file__).parent / 'src' / 'app' / 'db' / 'migrations' / 'rebrand_to_skope360.sql'
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print("🔄 Rebranding from SKOPE to SKOPE360...")
    
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        print("⚙️  Updating email domain from @skope.ai to @skope360.ai...")
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration completed successfully!")
        
        # Verify the changes
        print("\n📧 Updated email addresses:")
        cursor.execute("""
            SELECT email, full_name, job_title
            FROM users 
            WHERE email LIKE '%@skope360.ai'
            ORDER BY email
        """)
        
        users = cursor.fetchall()
        for email, name, title in users:
            print(f"  ✓ {name:20s} → {email}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 SKOPE360 rebranding completed!")
        print("\n📝 Updated login credentials:")
        print("  • sushas@skope360.ai   / password123")
        print("  • susmita@skope360.ai  / password123")
        print("  • shishir@skope360.ai  / password123")
        print("  • shilpa@skope360.ai   / password123")
        print("  • malleha@skope360.ai  / password123")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == '__main__':
    try:
        from dotenv import load_dotenv
        env_file = project_root / '.env'
        if env_file.exists():
            load_dotenv(env_file)
    except ImportError:
        pass
    
    success = run_migration()
    sys.exit(0 if success else 1)
