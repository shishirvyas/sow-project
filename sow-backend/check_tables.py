import psycopg2

conn = psycopg2.connect(
    host='sow-service-sow.f.aivencloud.com',
    port=21832,
    user='avnadmin',
    password='AVNS_qn2gZKOT3iF-wTMQV9j',
    dbname='defaultdb',
    sslmode='require'
)

cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
tables = cur.fetchall()

print("\nExisting tables:")
for t in tables:
    print(f"  - {t[0]}")

conn.close()
