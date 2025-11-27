"""
Fix duplicate Users menu items by renaming admin one
"""
import os
from dotenv import load_dotenv
from src.app.db.client import execute_update

# Load environment variables
load_dotenv()

print("🔧 Fixing duplicate 'Users' menu items...")

# Update the admin users menu item to have a distinct label
result = execute_update("""
    UPDATE menu_items 
    SET label = 'User Management', key = 'user-management'
    WHERE path = '/admin/users'
    RETURNING id, label, path
""")

if result:
    print(f"✅ Updated admin users menu:")
    print(f"   - New label: 'User Management'")
    print(f"   - Path: '/admin/users'")
else:
    print("❌ Failed to update menu item")

# Also check if there's a /users route that needs to be removed or updated
print("\n🔍 Checking for '/users' menu item...")
from src.app.db.client import execute_query
user_menu = execute_query("""
    SELECT id, label, path, required_permission
    FROM menu_items
    WHERE path = '/users'
""")

if user_menu:
    print(f"⚠️  Found '/users' menu item:")
    for item in user_menu:
        print(f"   - ID: {item['id']}, Label: {item['label']}, Permission: {item['required_permission']}")
    print("\n💡 Consider removing this if it's not needed:")
    print("   DELETE FROM menu_items WHERE path = '/users';")
else:
    print("✅ No '/users' menu item found")

print("\n✨ Done! The menu should now show:")
print("   - 'User Management' for admin users page (/admin/users)")
