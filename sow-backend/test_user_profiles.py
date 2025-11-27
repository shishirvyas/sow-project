"""
Test user profiles API
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

test_users = [
    {"email": "admin@skope.ai", "password": "password123", "name": "Sushas"},
    {"email": "manager@skope.ai", "password": "password123", "name": "Susmita"},
    {"email": "analyst@skope.ai", "password": "password123", "name": "Shishir"},
    {"email": "viewer@skope.ai", "password": "password123", "name": "Shilpa"},
    {"email": "john.doe@skope.ai", "password": "password123", "name": "Malleha"},
]

print("🧪 Testing User Profiles API")
print("=" * 80)

for user_creds in test_users:
    print(f"\n👤 Testing {user_creds['name']} ({user_creds['email']})")
    print("-" * 80)
    
    # Login
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": user_creds["email"], "password": user_creds["password"]}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        continue
    
    token = login_response.json()["access_token"]
    
    # Get profile
    profile_response = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if profile_response.status_code != 200:
        print(f"❌ Profile fetch failed: {profile_response.status_code}")
        continue
    
    data = profile_response.json()
    user = data["user"]
    
    print(f"✅ Login successful!")
    print(f"\n📋 Profile Information:")
    print(f"   Name: {user.get('full_name', 'N/A')}")
    print(f"   Email: {user.get('email', 'N/A')}")
    print(f"   Job Title: {user.get('job_title', 'N/A')}")
    print(f"   Department: {user.get('department', 'N/A')}")
    print(f"   Experience: {user.get('years_of_experience', 'N/A')} years")
    print(f"   Location: {user.get('location', 'N/A')}")
    print(f"   Avatar URL: {user.get('avatar_url', 'N/A')}")
    if user.get('bio'):
        print(f"   Bio: {user['bio'][:80]}...")
    
    print(f"\n🔑 Permissions: {len(data.get('permissions', []))} permissions")
    print(f"👥 Roles: {len(data.get('roles', []))} roles")
    print(f"📋 Menu Groups: {len([m for m in data.get('menu', []) if 'group_name' in m and m.get('items')])} groups")

print("\n" + "=" * 80)
print("✅ All user profile tests completed!")
