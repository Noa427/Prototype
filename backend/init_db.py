from sqlmodel import Session, select
from backend.database import engine, create_db_and_tables
from backend.models import User
from backend.auth import get_password_hash

def init_db():
    create_db_and_tables()

    with Session(engine) as session:
        statement = select(User).where(User.username == "admin")
        admin = session.exec(statement).first()

        if not admin:
            print("Creating default admin user...")
            admin = User(
                username="admin",
                full_name="Administrateur Système",
                email="admin@aevum.io",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            session.add(admin)

        session.commit()
        print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
