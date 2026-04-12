import yaml
import asyncio
from sqlmodel import Session, create_engine
from scrapers.pap_scraper import PapScraper
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

async def main():
    # Chemin correct : on est dans backend/, le fichier est dans backend/scrapers/config/
    with open('scrapers/config/pap.yaml', 'r') as f:
        config = yaml.safe_load(f)

    scraper = PapScraper(config)
    deals = await scraper.run()
    print(f"Deals trouvés : {len(deals)}")

    with Session(engine) as session:
        scraper.save_to_db(deals, session)   # synchrone

    if deals:
        d = deals[0]
        print("---")
        print(f"Titre : {d.get('title')}")
        print(f"Adresse : {d.get('street_number')} {d.get('street')}, {d.get('postal_code')} {d.get('city')}")
        print(f"Lat/Lon : {d.get('latitude')}, {d.get('longitude')}")

if __name__ == "__main__":
    asyncio.run(main())
