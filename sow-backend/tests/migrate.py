import os, psycopg2
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
with open('../src/app/db/rbac_schema.sql','r',encoding='utf-8') as f:
    cur.execute(f.read())
# Apply any migration files in order:
migrations = [
  '../src/app/db/migrations/add_menu_groups.sql',
  '../src/app/db/migrations/add_user_profiles.sql',
  '../src/app/db/migrations/update_user_emails.sql',
  '../src/app/db/migrations/rebrand_to_skope360.sql',
  '../src/app/db/migrations/add_rahul_user.sql'
]
for m in migrations:
    try:
        with open(m,'r',encoding='utf-8') as f:
            cur.execute(f.read())
        print('Applied',m)
    except Exception as e:
        print('Skip/Fail',m,e)
conn.commit()
cur.close()
conn.close()
print('DB migration complete')