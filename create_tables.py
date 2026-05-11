import os
from sqlmodel import SQLModel, create_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set")

engine = create_engine(DATABASE_URL, echo=True)

# Importe tous les modèles pour qu'ils soient enregistrés dans SQLModel.metadata
import backend.models

SQLModel.metadata.create_all(engine)
print("Tables créées avec succès.")
