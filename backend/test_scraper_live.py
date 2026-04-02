import sys
import asyncio
import yaml
from sqlmodel import Session

sys.path.insert(0, '/home/noa/Documents/N.C.C./antigravity-proto')
from scrapers.pap_scraper import PapScraper
from backend.database import engine

async def main():
    with open('backend/scrapers/config/pap.yaml', 'r') as f:
        config = yaml.safe_load(f)

    scraper = PapScraper(config)
    deals = await scraper.run()
    print(f"Deals trouvés : {len(deals)}")

    with Session(engine) as session:
        await scraper.save_to_db(deals, session)
        session.commit()

    if deals:
        d = deals[0]
        print("---")
        print(f"Titre : {d.get('title')}")
        print(f"Adresse : {d.get('street_number')} {d.get('street')}, {d.get('postal_code')} {d.get('city')}")
        print(f"Lat/Lon : {d.get('latitude')}, {d.get('longitude')}")

if __name__ == "__main__":
    asyncio.run(main())
