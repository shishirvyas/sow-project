#!/usr/bin/env python3
"""
Verify all users have Admin role
"""
import os
import sys
import psycopg2
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Load environment
try:
    from dotenv import load_dotenv
    env_file = project_root / '.env'
    if env_file.exists():
        load_dotenv(env_file)
except ImportError:
    pass

db_url = os.getenv('DATABASE_URL')

if not db_url:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

print("🔍 Verifying user roles...\n")

conn = psycopg2.connect(db_url)
cursor = conn.cursor()

# Check user roles
cursor.execute("""
    SELECT 
        u.email,
        u.full_name,
        u.job_title,
        r.display_name as role_name
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.email IN (
        'admin@skope.ai',
        'manager@skope.ai',
        'analyst@skope.ai',
        'viewer@skope.ai',
        'john.doe@skope.ai'
    )
    ORDER BY u.email, r.display_name
""")

users = cursor.fetchall()

current_user = None
for email, name, title, role in users:
    if email != current_user:
        if current_user is not None:
            print()
        current_user = email
        print(f"👤 {name} ({email})")
        print(f"   Job Title: {title}")
        print(f"   Roles:", end='')
    print(f" {role}", end='')

print("\n")

# Count admins
cursor.execute("""
    SELECT COUNT(DISTINCT u.id)
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name = 'admin'
      AND u.email IN (
        'admin@skope.ai',
        'manager@skope.ai',
        'analyst@skope.ai',
        'viewer@skope.ai',
        'john.doe@skope.ai'
    )
""")

admin_count = cursor.fetchone()[0]

cursor.close()
conn.close()

print(f"✅ Total users with Admin role: {admin_count}/5")

if admin_count == 5:
    print("✅ All users are Admins!")
else:
    print(f"⚠️  Only {admin_count} users have Admin role")
