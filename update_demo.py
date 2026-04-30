"""
Update the existing demo user to admin role,
and add mandates + CalendarConfig + signature fields.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from datetime import datetime, timedelta

import psycopg2
conn = psycopg2.connect(
    host='localhost', port=5432,
    user='postgres', password='admin123', dbname='antigravity'
)
cur = conn.cursor()

# 1. Update demo user role to admin
cur.execute("UPDATE \"user\" SET role = 'admin' WHERE email = 'agent@demo-aevum.fr'")
cur.execute("SELECT id, role FROM \"user\" WHERE email = 'agent@demo-aevum.fr'")
row = cur.fetchone()
print(f"User updated: id={row[0]}, role={row[1]}")
user_id = row[0]

# 2. Get demo agency id
cur.execute("SELECT id FROM agency WHERE name = 'Agence Dupont Immobilier'")
agency_row = cur.fetchone()
if not agency_row:
    print("ERROR: demo agency not found!")
    conn.close()
    sys.exit(1)
agency_id = agency_row[0]
print(f"Agency id: {agency_id}")

# 3. Check if mandates already exist for this agency
cur.execute("SELECT COUNT(*) FROM mandate WHERE agency_id = %s", (agency_id,))
n_mandates = cur.fetchone()[0]
print(f"Existing mandates: {n_mandates}")

if n_mandates == 0:
    now = datetime.utcnow()

    def ago(days):
        return now - timedelta(days=days)

    mandates = [
        (agency_id, 1, 'vente', '12 rue de la Paix, 69003 Lyon', 'Bernard Lefranc',
         'bernard.lefranc@gmail.com', '06 10 20 30 40',
         ago(60), ago(60) + timedelta(days=90), True, 3.5, 'actif', now),
        (agency_id, 2, 'vente', '8 avenue Foch, 69006 Lyon', 'Martine Dubois',
         'martine.dubois@outlook.fr', '07 20 30 40 50',
         ago(45), ago(45) + timedelta(days=90), False, 3.0, 'actif', now),
        (agency_id, 3, 'recherche', '23 cours Gambetta, 69003 Lyon', 'Jean-Marc Aubert',
         'jm.aubert@gmail.com', '06 30 40 50 60',
         ago(30), ago(30) + timedelta(days=90), True, 2.5, 'actif', now),
        (agency_id, 4, 'vente', '5 rue de la Republique, 69100 Villeurbanne', 'Sylvie Moreau',
         'sylvie.moreau@gmail.com', '07 40 50 60 70',
         ago(100), ago(100) + timedelta(days=90), False, 3.0, 'expire', now),
        (agency_id, 5, 'vente', '17 rue Pierre Corneille, 69006 Lyon', 'Robert Sanchez',
         'r.sanchez@outlook.fr', '06 50 60 70 80',
         ago(15), ago(15) + timedelta(days=90), True, 4.0, 'actif', now),
    ]

    for m in mandates:
        cur.execute("""
            INSERT INTO mandate (agency_id, mandate_number, mandate_type, property_address,
                owner_name, owner_email, owner_phone, start_date, end_date,
                exclusive, commission_rate, status, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, m)
    print(f"Inserted {len(mandates)} mandates")
else:
    print("Mandates already exist, skipping")

# 4. Add CalendarConfig if not exists
cur.execute("SELECT COUNT(*) FROM calendarconfig WHERE user_id = %s", (user_id,))
has_cal = cur.fetchone()[0]
if not has_cal:
    cur.execute("""
        INSERT INTO calendarconfig (user_id, work_days, start_time, end_time,
            slot_duration, lunch_start, lunch_end, excluded_dates, calendar_url)
        VALUES (%s, '1,2,3,4,5', '09:00', '18:00', 30, '12:00', '13:00', '', NULL)
    """, (user_id,))
    print("Inserted CalendarConfig")
else:
    print("CalendarConfig already exists, skipping")

# 5. Add signature fields to some leads
cur.execute("SELECT id FROM lead WHERE assigned_to = %s ORDER BY id LIMIT 5", (user_id,))
lead_ids = [r[0] for r in cur.fetchall()]
print(f"Lead ids to update: {lead_ids}")

if lead_ids:
    signatures = [
        (lead_ids[2] if len(lead_ids) > 2 else lead_ids[0], 'sim-demo-001', 'signed'),
        (lead_ids[0], 'sim-demo-002', 'pending'),
        (lead_ids[3] if len(lead_ids) > 3 else lead_ids[0], 'sim-demo-003', 'pending'),
    ]
    for lid, req_id, status in signatures:
        cur.execute("""
            UPDATE lead SET signature_request_id = %s, signature_status = %s WHERE id = %s
        """, (req_id, status, lid))
    print(f"Updated {len(signatures)} leads with signature data")

conn.commit()
print("All done!")
conn.close()
