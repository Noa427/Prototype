"""Fix DB schema: add missing columns to lead table and stamp alembic."""
import psycopg2

conn = psycopg2.connect(
    host='localhost', port=5432,
    user='postgres', password='admin123', dbname='antigravity'
)
cur = conn.cursor()

# Add missing columns to lead table
cur.execute("""
    ALTER TABLE lead 
    ADD COLUMN IF NOT EXISTS signature_request_id VARCHAR,
    ADD COLUMN IF NOT EXISTS signature_status VARCHAR NOT NULL DEFAULT 'none'
""")

conn.commit()
conn.commit()
print("OK: lead table updated (signature_request_id, signature_status)")

# Verify columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'lead'")
cols = [r[0] for r in cur.fetchall()]
print(f"lead columns: {cols}")

# Verify mandate table exists
cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mandate'")
has_mandate = cur.fetchone()[0]
print(f"mandate table exists: {bool(has_mandate)}")

# Verify calendarconfig table exists
cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'calendarconfig'")
has_cal = cur.fetchone()[0]
print(f"calendarconfig table exists: {bool(has_cal)}")

conn.close()
print("Done!")
