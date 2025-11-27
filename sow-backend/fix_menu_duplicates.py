"""
Fix duplicate Users menu items
1. Delete the non-admin /users/ entry
2. Rename admin Users to "User Management"
"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

def fix_menu():
    db_url = os.getenv('DATABASE_URL')
    
    # Parse connection string
    import re
    pattern = r'postgres://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)\?'
    match = re.match(pattern, db_url)
    user, password, host, port, dbname = match.groups()
    
    conn = psycopg2.connect(
        host=host,
        port=int(port),
        user=user,
        password=password,
        dbname=dbname,
        sslmode='require'
    )
    
    cur = conn.cursor()
    
    # Delete the /users/ entry (non-admin)
    cur.execute("DELETE FROM menu_items WHERE path = '/users/' AND key = 'users'")
    deleted = cur.rowcount
    print(f"✅ Deleted {deleted} non-admin 'Users' menu item(s)")
    
    # Rename admin Users to "User Management"
    cur.execute("""
        UPDATE menu_items 
        SET label = 'User Management',
            key = 'user-management'
        WHERE path = '/admin/users' AND label = 'Users'
    """)
    updated = cur.rowcount
    print(f"✅ Renamed {updated} admin menu item(s) to 'User Management'")
    
    conn.commit()
    
    # Verify
    cur.execute("SELECT id, key, label, path FROM menu_items ORDER BY display_order")
    items = cur.fetchall()
    print("\n📋 Current menu items:")
    for item in items:
        print(f"  {item[0]:2d}. {item[2]:20s} → {item[3]}")
    
    cur.close()
    conn.close()
    print("\n✅ Menu fixed!")

if __name__ == '__main__':
    fix_menu()
