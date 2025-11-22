# Aiven Connection Troubleshooting

## Issue: Connection Timeout

Your Python app cannot connect to Aiven PostgreSQL, but VS Code can. This is typically due to:

### 1. IP Whitelisting Required

**Solution:** Add your IP address to Aiven's allowed IP list

1. Go to your Aiven Console: https://console.aiven.io/
2. Select your `sow-service-sow` service
3. Go to "Overview" tab
4. Under "Allowed IP Addresses", click "Change"
5. Add your current IP address (find it at https://whatismyip.com/)
6. Click "Save changes"

### 2. SSL/TLS Certificate Issue

**Alternative Solution:** Use connection URI format

Update your `.env`:

```env
# Instead of individual parameters, use a connection URI
DATABASE_URL=postgres://avnadmin:<your-password>@sow-service-sow.f.aivencloud.com:15467/defaultdb?sslmode=require
```

Then update `prompt_db_service.py`:

```python
def get_connection(self):
    """Create database connection"""
    try:
        database_url = os.getenv('DATABASE_URL')
        if database_url:
            conn = psycopg2.connect(database_url)
        else:
            # Fall back to individual parameters
            conn = psycopg2.connect(**self.db_config)
        return conn
    except Exception as e:
        logging.error(f"Database connection failed: {e}")
        raise
```

### 3. Network/Firewall Issue

**Check connectivity:**

```bash
# Test if you can reach the server
telnet sow-service-sow.f.aivencloud.com 15467

# Or use nc (netcat)
nc -zv sow-service-sow.f.aivencloud.com 15467
```

If this fails, your network is blocking the connection.

### 4. Temporary Workaround: Use File-Based Prompts

While you resolve the connection issue, disable database prompts:

In `.env`:
```env
USE_PROMPT_DATABASE=false
```

The system will fall back to loading from `resources/clause-lib/*.txt`

### 5. Alternative: Use pgBouncer or Connection Pooler

Aiven provides a connection pooler that might work better:

1. In Aiven Console, go to your service
2. Look for "Connection pooler" or "PgBouncer"
3. Enable it and use those connection details instead

## Testing the Fix

After whitelisting your IP or updating the connection method:

```bash
# Test with psql
PGPASSWORD=<your-password> psql -h sow-service-sow.f.aivencloud.com -p 15467 -U avnadmin -d defaultdb

# If this works, your Python app should work too
```

Then restart your server and try:
```bash
curl http://localhost:8000/api/v1/prompts
```

## Quick Fix: Export Data and Use Local PostgreSQL

If you need immediate access:

```sql
-- In VS Code (which CAN connect), export the data
SELECT * FROM prompt_templates;
SELECT * FROM prompt_variables;
```

Then:
1. Install local PostgreSQL: `brew install postgresql`
2. Create local database: `createdb sow_prompts`
3. Import the schema
4. Update `.env` to use localhost

This gives you a local copy while you resolve the Aiven connection issue.
