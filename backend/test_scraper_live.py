from scrapers.pap_scraper import PapScraper

scraper = PapScraper()
deals = scraper.run()
print(f"Deals trouvés : {len(deals)}")
for d in deals[:1]:
    print("---")
    print(f"Titre : {d.get('title')}")
    print(f"Adresse : {d.get('street_number')} {d.get('street')}, {d.get('postal_code')} {d.get('city')}")
    print(f"Lat/Lon : {d.get('latitude')}, {d.get('longitude')}")
    print(f"Métros : {d.get('amenities', {}).get('metros', [])}")
