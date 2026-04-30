import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("DATABASE_URL")
print(f"URL chargée depuis .env : {url}")

try:
    conn = psycopg2.connect(url)
    print("✅ Connexion réussie !")
except Exception as e:
    print("❌ Erreur brute de PostgreSQL :")
    print(repr(e))