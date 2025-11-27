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
    
    print("🔧 Adding Permissions Graph menu item")
    print("=" * 80)
    
    # Check if menu item already exists
    cursor.execute("""
        SELECT id FROM menu_items 
        WHERE path = '/admin/permissions-graph'
    """)
    
    if cursor.fetchone():
        print("\n⚠️  Menu item for Permissions Graph already exists")
    else:
        # Get the highest display order in admin section
        cursor.execute("""
            SELECT COALESCE(MAX(display_order), 0) + 1
            FROM menu_items
            WHERE path LIKE '/admin/%'
        """)
        next_order = cursor.fetchone()[0]
        
        # Insert menu item
        cursor.execute("""
            INSERT INTO menu_items (
                key, label, path, icon, parent_id, 
                display_order, required_permission, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            'permissions-graph',
            'Permissions Graph',
            '/admin/permissions-graph',
            'chart-bar',
            None,
            next_order,
            'role.view',
            datetime.utcnow()
        ))
        
        conn.commit()
        print(f"\n✅ Successfully added 'Permissions Graph' menu item (order: {next_order})")
    
    # Show all admin menu items
    print("\n📋 All admin menu items:")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            mi.display_order,
            mi.label,
            mi.path,
            mi.key,
            mi.required_permission
        FROM menu_items mi
        WHERE mi.path LIKE '/admin/%'
        ORDER BY mi.display_order;
    """)
    
    items = cursor.fetchall()
    for order, label, path, key, perm in items:
        perm_str = f"({perm})" if perm else ""
        print(f"  {order:2}. {label:<25} → {path:<35} [{key}] {perm_str}")
    
    print("\n✅ Done!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
