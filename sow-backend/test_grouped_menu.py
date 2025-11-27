"""
Test the grouped menu API
"""
import requests
import json

# API base URL
BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_login_and_menu():
    """Test login and get grouped menu"""
    
    print("🔐 Testing login...")
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "admin@skope.ai",
            "password": "password123"
        }
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    login_data = login_response.json()
    access_token = login_data.get("access_token")
    print(f"✅ Login successful! Token: {access_token[:20]}...")
    
    # Get user profile with menu
    print("\n📋 Fetching user profile with menu...")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    profile_response = requests.get(
        f"{BASE_URL}/auth/me",
        headers=headers
    )
    
    if profile_response.status_code != 200:
        print(f"❌ Profile fetch failed: {profile_response.status_code}")
        print(profile_response.text)
        return
    
    profile_data = profile_response.json()
    menu = profile_data.get("menu", [])
    
    print(f"✅ Profile loaded!")
    print(f"\n👤 User: {profile_data['user']['full_name']} ({profile_data['user']['email']})")
    print(f"🔑 Permissions: {len(profile_data['permissions'])} permissions")
    print(f"👥 Roles: {len(profile_data['roles'])} roles")
    
    print(f"\n📋 Menu Structure ({len(menu)} top-level items):")
    print("=" * 80)
    
    for item in menu:
        if 'group_name' in item and item.get('items'):
            # This is a group
            print(f"\n🗂️  {item['group_name'].upper()} (Group Order: {item['group_order']})")
            print(f"   Icon: {item['group_icon']}")
            print(f"   Items: {len(item['items'])}")
            for sub_item in item['items']:
                print(f"      ├─ {sub_item['label']:20s} ({sub_item['icon']:15s}) → {sub_item['path']}")
        else:
            # Ungrouped item
            print(f"\n📄 {item['label']:20s} ({item['icon']:15s}) → {item['path']}")
    
    print("\n" + "=" * 80)
    print("✅ Menu grouping test completed successfully!")
    
    # Pretty print full JSON for inspection
    print("\n📦 Full Menu JSON:")
    print(json.dumps(menu, indent=2))

if __name__ == "__main__":
    try:
        test_login_and_menu()
    except requests.exceptions.ConnectionError:
        print("❌ Connection error! Is the backend running on http://127.0.0.1:8000?")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
