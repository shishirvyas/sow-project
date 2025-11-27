"""
Remove unused /users menu item
"""
import os
from dotenv import load_dotenv
from src.app.db.client import execute_update

load_dotenv()

print("🗑️  Removing unused '/users' menu item...")

result = execute_update("""
    DELETE FROM menu_items 
    WHERE path = '/users'
""")

print(f"✅ Deleted {result} menu item(s)")
print("\n✨ Menu cleanup complete!")
