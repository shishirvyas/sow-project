"""
Test script for authentication endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_login():
    """Test login with admin credentials"""
    print("\n" + "="*60)
    print("Testing Login Endpoint")
    print("="*60)
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "admin@skope.ai",
            "password": "password123"
        }
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Login successful!")
        print(f"User: {data['user']['email']} ({data['user']['full_name']})")
        print(f"Access Token: {data['access_token'][:50]}...")
        return data['access_token']
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def test_get_profile(token):
    """Test getting user profile"""
    print("\n" + "="*60)
    print("Testing Get Profile Endpoint")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Profile retrieved successfully!")
        print(f"\nUser: {data['user']['email']}")
        print(f"\nRoles ({len(data['roles'])}):")
        for role in data['roles']:
            print(f"  - {role['display_name']}")
        
        print(f"\nPermissions ({len(data['permissions'])}):")
        for i, perm in enumerate(data['permissions'][:10]):
            print(f"  - {perm}")
        if len(data['permissions']) > 10:
            print(f"  ... and {len(data['permissions']) - 10} more")
        
        print(f"\nMenu Items ({len(data['menu'])}):")
        for item in data['menu']:
            print(f"  - {item['label']} ({item['path']})")
    else:
        print(f"❌ Failed: {response.text}")

def test_get_menu(token):
    """Test getting user menu"""
    print("\n" + "="*60)
    print("Testing Get Menu Endpoint")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/auth/menu",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Retrieved {len(data['menu'])} menu items")
        print("\nMenu Structure:")
        for item in data['menu']:
            indent = "  " * (1 if item.get('parent_id') else 0)
            print(f"{indent}- {item['label']} -> {item['path']}")
    else:
        print(f"❌ Failed: {response.text}")

def test_invalid_login():
    """Test login with invalid credentials"""
    print("\n" + "="*60)
    print("Testing Invalid Login")
    print("="*60)
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "admin@skope.ai",
            "password": "wrongpassword"
        }
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 401:
        print("✅ Correctly rejected invalid credentials")
    else:
        print(f"❌ Unexpected response: {response.text}")

def test_all_roles():
    """Test login with all test users"""
    print("\n" + "="*60)
    print("Testing All Test Users")
    print("="*60)
    
    test_users = [
        ("admin@skope.ai", "Administrator"),
        ("manager@skope.ai", "Manager"),
        ("analyst@skope.ai", "Analyst"),
        ("viewer@skope.ai", "Viewer")
    ]
    
    for email, expected_role in test_users:
        print(f"\n--- Testing {email} ---")
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": "password123"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {data['user']['full_name']} logged in successfully")
            
            # Get permissions
            token = data['access_token']
            perm_response = requests.get(
                f"{BASE_URL}/auth/permissions",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if perm_response.status_code == 200:
                perms = perm_response.json()['permissions']
                print(f"   {len(perms)} permissions assigned")
        else:
            print(f"❌ Login failed for {email}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("RBAC Authentication System Test Suite")
    print("="*60)
    
    try:
        # Test 1: Login
        token = test_login()
        
        if token:
            # Test 2: Get Profile
            test_get_profile(token)
            
            # Test 3: Get Menu
            test_get_menu(token)
        
        # Test 4: Invalid Login
        test_invalid_login()
        
        # Test 5: All Roles
        test_all_roles()
        
        print("\n" + "="*60)
        print("✅ All tests completed!")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to server at http://localhost:8000")
        print("   Make sure the backend server is running.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
