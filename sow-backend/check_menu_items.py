"""
Quick database query tool for checking menu items
"""
import os
from dotenv import load_dotenv
from src.app.db.client import execute_query

# Load environment variables
load_dotenv()

# Verify DATABASE_URL is loaded
db_url = os.getenv('DATABASE_URL')
if not db_url:
    print("❌ DATABASE_URL not found in environment variables")
    exit(1)

print(f"✅ Using database from environment variables")
print(f"🔗 Host: {db_url.split('@')[1].split(':')[0] if '@' in db_url else 'unknown'}\n")

# Query menu items
print("📋 Checking for duplicate menu items...")
duplicates = execute_query("""
    SELECT key, label, COUNT(*) as count
    FROM menu_items
    GROUP BY key, label
    HAVING COUNT(*) > 1
""")

if duplicates:
    print("⚠️  Found duplicates:")
    for dup in duplicates:
        print(f"   - {dup['key']}: {dup['label']} (appears {dup['count']} times)")
else:
    print("✅ No duplicates found")

print("\n📋 All menu items:")
items = execute_query("""
    SELECT 
        mi.id,
        mi.key,
        mi.label,
        mi.path,
        mi.icon,
        mi.parent_id,
        mi.display_order,
        mi.required_permission
    FROM menu_items mi
    ORDER BY mi.display_order
""")

for item in items:
    parent = f" (parent: {item['parent_id']})" if item['parent_id'] else ""
    perm = f" [requires: {item['required_permission']}]" if item['required_permission'] else ""
    print(f"{item['display_order']:2d}. {item['label']:20s} -> {item['path']:30s}{parent}{perm}")
