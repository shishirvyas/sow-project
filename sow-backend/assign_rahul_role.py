#!/usr/bin/env python3
"""Assign Administrator role to Rahul"""

import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

async def assign_role():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Check available roles
    roles = await conn.fetch("SELECT id, name FROM roles")
    print("Available roles:")
    for role in roles:
        print(f"  - {role['name']} (id: {role['id']})")
    
    # Check user
    user = await conn.fetchrow("SELECT id, email, full_name FROM users WHERE email = 'rahul@skope360.ai'")
    if user:
        print(f"\n✅ User found: {user['full_name']} (id: {user['id']})")
    else:
        print("\n❌ User not found")
        await conn.close()
        return
    
    # Try to assign Admin role (check both 'Administrator' and 'admin')
    admin_role = await conn.fetchrow("SELECT id FROM roles WHERE name IN ('Administrator', 'Admin', 'admin') LIMIT 1")
    
    if admin_role:
        print(f"Assigning role id {admin_role['id']}...")
        await conn.execute("""
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
        """, user['id'], admin_role['id'])
        
        # Verify
        result = await conn.fetchrow("""
            SELECT u.full_name, r.name as role
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.email = 'rahul@skope360.ai'
        """)
        
        if result:
            print(f"✅ {result['full_name']} assigned {result['role']} role")
        else:
            print("❌ Role assignment failed")
    else:
        print("❌ No Admin/Administrator role found")
    
    await conn.close()

asyncio.run(assign_role())
