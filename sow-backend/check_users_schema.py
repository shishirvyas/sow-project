import os
import psycopg2
from dotenv import load_dotenv
import re

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
    
    # Check users table structure
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    
    print("📋 Users table structure:")
    print("-" * 60)
    for col_name, data_type, is_nullable in columns:
        nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
        print(f"  {col_name:<20} {data_type:<20} {nullable}")
    
    # Check roles table structure
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'roles'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    
    print("\n📋 Roles table structure:")
    print("-" * 60)
    for col_name, data_type, is_nullable in columns:
        nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
        print(f"  {col_name:<20} {data_type:<20} {nullable}")
    
    # Check user_roles table structure
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_roles'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    
    print("\n📋 User_roles table structure:")
    print("-" * 60)
    for col_name, data_type, is_nullable in columns:
        nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
        print(f"  {col_name:<20} {data_type:<20} {nullable}")
    
    # Check permissions table structure
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'permissions'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    
    print("\n📋 Permissions table structure:")
    print("-" * 60)
    for col_name, data_type, is_nullable in columns:
        nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
        print(f"  {col_name:<20} {data_type:<20} {nullable}")
    
    # Check role_permissions table structure
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'role_permissions'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    
    print("\n📋 Role_permissions table structure:")
    print("-" * 60)
    for col_name, data_type, is_nullable in columns:
        nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
        print(f"  {col_name:<20} {data_type:<20} {nullable}")
    
    # Check menu_items table structure
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'menu_items'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    
    print("\n📋 Menu_items table structure:")
    print("-" * 60)
    for col_name, data_type, is_nullable in columns:
        nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
        print(f"  {col_name:<20} {data_type:<20} {nullable}")
    
    print("\n✅ Schema check complete!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
