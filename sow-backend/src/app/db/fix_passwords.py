"""
Fix user passwords - Regenerate password hashes with proper bcrypt limits
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

# Load .env from sow-backend root
env_path = Path(__file__).resolve().parents[3] / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"✅ Loaded .env from {env_path}\n")

from src.app.db.client import get_db_connection
from src.app.services.auth_service import get_password_hash


def fix_passwords():
    """Regenerate password hashes for test users"""
    print("=" * 70)
    print("Fixing User Passwords")
    print("=" * 70)
    
    # Test users with their emails and passwords
    test_users = [
        ('admin@skope.ai', 'password123'),
        ('manager@skope.ai', 'password123'),
        ('analyst@skope.ai', 'password123'),
        ('viewer@skope.ai', 'password123'),
    ]
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        for email, password in test_users:
            print(f"\n📝 Updating password for {email}...")
            
            # Generate new hash with truncation
            new_hash = get_password_hash(password)
            print(f"   Generated hash: {new_hash[:20]}...")
            
            # Update in database
            cursor.execute(
                "UPDATE users SET password_hash = %s WHERE email = %s",
                (new_hash, email)
            )
            
            if cursor.rowcount > 0:
                print(f"   ✅ Updated successfully")
            else:
                print(f"   ⚠️  User not found")
        
        conn.commit()
        
        print("\n" + "=" * 70)
        print("Password Fix Complete!")
        print("=" * 70)
        print("\n✅ All test user passwords have been regenerated")
        print("   Password: password123")
        print("\nYou can now login with:")
        for email, _ in test_users:
            print(f"   - {email}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = fix_passwords()
    sys.exit(0 if success else 1)
