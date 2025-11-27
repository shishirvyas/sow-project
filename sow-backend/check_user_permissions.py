import os
import psycopg2
from dotenv import load_dotenv
import re

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
    
    # Check all users and their roles
    cursor.execute("""
        SELECT 
            u.id,
            u.email,
            u.full_name,
            r.name as role_name,
            r.display_name as role_display_name
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        ORDER BY u.id;
    """)
    
    users = cursor.fetchall()
    
    print("📋 Users and their roles:")
    print("-" * 80)
    current_user_id = None
    for user_id, email, full_name, role_name, role_display in users:
        if user_id != current_user_id:
            print(f"\n👤 {email} ({full_name}) [ID: {user_id}]")
            current_user_id = user_id
        if role_name:
            print(f"   └─ Role: {role_display} ({role_name})")
        else:
            print(f"   └─ ⚠️  No roles assigned!")
    
    # Check permissions for manager role
    print("\n\n📋 Permissions for 'manager' role:")
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
    if perms:
        current_category = None
        for code, name, category in perms:
            if category != current_category:
                print(f"\n🔐 {category}:")
                current_category = category
            print(f"   ✓ {code:<30} {name}")
    else:
        print("   ⚠️  No permissions assigned to manager role!")
    
    # Check all available permissions
    print("\n\n📋 All available permissions:")
    print("-" * 80)
    cursor.execute("""
        SELECT code, name, category
        FROM permissions
        ORDER BY category, code;
    """)
    
    all_perms = cursor.fetchall()
    current_category = None
    for code, name, category in all_perms:
        if category != current_category:
            print(f"\n📂 {category}:")
            current_category = category
        print(f"   • {code:<30} {name}")
    
    print("\n✅ Check complete!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
