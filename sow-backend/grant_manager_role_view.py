import os
import psycopg2
from dotenv import load_dotenv
import re
from datetime import datetime

# Load environment variables
load_dotenv()

# Get DATABASE_URL
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("❌ DATABASE_URL not found in .env file")
    exit(1)

# Parse connection string
pattern = r'postgres(?:ql)?://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)'
match = re.match(pattern, database_url)
if not match:
    print("❌ Failed to parse DATABASE_URL")
    exit(1)

user, password, host, port, dbname = match.groups()

# Connect to database
try:
    conn = psycopg2.connect(
        host=host,
        port=int(port),
        user=user,
        password=password,
        dbname=dbname,
        sslmode='require'
    )
    
    cursor = conn.cursor()
    
    print("🔧 Grant role.view permission to manager role")
    print("=" * 80)
    
    # Get role.view permission ID
    cursor.execute("SELECT id FROM permissions WHERE code = 'role.view'")
    result = cursor.fetchone()
    if not result:
        print("❌ Permission 'role.view' not found!")
        exit(1)
    
    permission_id = result[0]
    print(f"✓ Found permission 'role.view' (ID: {permission_id})")
    
    # Get manager role ID
    cursor.execute("SELECT id FROM roles WHERE name = 'manager'")
    result = cursor.fetchone()
    if not result:
        print("❌ Role 'manager' not found!")
        exit(1)
    
    role_id = result[0]
    print(f"✓ Found role 'manager' (ID: {role_id})")
    
    # Check if permission already assigned
    cursor.execute("""
        SELECT id FROM role_permissions 
        WHERE role_id = %s AND permission_id = %s
    """, (role_id, permission_id))
    
    if cursor.fetchone():
        print("\n⚠️  Permission 'role.view' is already assigned to 'manager' role")
    else:
        # Grant permission
        cursor.execute("""
            INSERT INTO role_permissions (role_id, permission_id, granted_at)
            VALUES (%s, %s, %s)
        """, (role_id, permission_id, datetime.utcnow()))
        
        conn.commit()
        print("\n✅ Successfully granted 'role.view' permission to 'manager' role")
    
    # Show all manager permissions
    print("\n📋 All permissions for 'manager' role:")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            p.code,
            p.name,
            p.category
        FROM roles r
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE r.name = 'manager'
        ORDER BY p.category, p.code;
    """)
    
    perms = cursor.fetchall()
    current_category = None
    for code, name, category in perms:
        if category != current_category:
            print(f"\n🔐 {category}:")
            current_category = category
        print(f"   ✓ {code:<30} {name}")
    
    print("\n✅ Done!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
