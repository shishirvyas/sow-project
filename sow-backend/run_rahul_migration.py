#!/usr/bin/env python3
"""
Migration runner for adding Rahul user profile
Adds Rahul Kumar as AI Manager with 25 years experience
"""

import asyncio
import asyncpg
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

async def run_migration():
    """Execute the Rahul user migration"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ ERROR: DATABASE_URL not found in environment variables")
        return False
    
    print("🔗 Connecting to database...")
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        print("✅ Connected successfully")
        
        # Read migration file
        migration_file = 'src/app/db/migrations/add_rahul_user.sql'
        print(f"\n📄 Reading migration: {migration_file}")
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Execute migration
        print("🚀 Executing migration...")
        await conn.execute(migration_sql)
        print("✅ Migration executed successfully")
        
        # Verify the new user
        print("\n🔍 Verifying Rahul user...")
        user_data = await conn.fetchrow("""
            SELECT 
                u.id,
                u.email,
                u.full_name,
                u.job_title,
                u.department,
                u.years_of_experience,
                u.location,
                r.name as role
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.email = 'rahul@skope360.ai'
        """)
        
        if user_data:
            print("\n✅ Migration completed successfully!")
            print("\n📧 User Details:")
            print(f"   ✓ Name: {user_data['full_name']}")
            print(f"   ✓ Email: {user_data['email']}")
            print(f"   ✓ Job Title: {user_data['job_title']}")
            print(f"   ✓ Department: {user_data['department']}")
            print(f"   ✓ Experience: {user_data['years_of_experience']} years")
            print(f"   ✓ Location: {user_data['location']}")
            print(f"   ✓ Role: {user_data['role']}")
            print(f"\n🔑 Login Credentials:")
            print(f"   Email: rahul@skope360.ai")
            print(f"   Password: password123")
        else:
            print("❌ ERROR: User not found after migration")
            return False
        
        # Close connection
        await conn.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("🔧 SKOPE360 - Add Rahul User Migration")
    print("=" * 60)
    
    success = asyncio.run(run_migration())
    
    if success:
        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ MIGRATION FAILED")
        print("=" * 60)
        exit(1)
