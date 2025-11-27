import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use DATABASE_URL from environment
database_url = os.getenv('DATABASE_URL')
if not database_url:
    raise ValueError("DATABASE_URL not found in environment variables")

# Parse the DATABASE_URL
import re
pattern = r'postgres(?:ql)?://([^:]+):([^@]+)@([^:]+):(\d+)/(.+?)(?:\?|$)'
match = re.match(pattern, database_url)
if not match:
    raise ValueError("Invalid DATABASE_URL format")

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
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
tables = cur.fetchall()

print("\nExisting tables:")
for t in tables:
    print(f"  - {t[0]}")

conn.close()
