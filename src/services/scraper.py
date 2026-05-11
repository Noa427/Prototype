import asyncio
import json
import os
import re
import httpx
import logging
import random
import yaml
from playwright.async_api import async_playwright
from backend.scrapers import PapScraper

# Configuration des logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Liste de User-Agents pour rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
]

# Structure pour proxies (à remplir par l'utilisateur si besoin)
PROXIES = [] # Format: "http://user:pass@host:port"

# Cache pour le géocodage
GEO_CACHE = {}

# Prix médians par arrondissement (valeurs indicatives Paris 2024)
MARKET_PRICES = {
    "75001": 15000, "75002": 13500, "75003": 14000, "75004": 14500, "75005": 13800,
    "75006": 16000, "75007": 15500, "75008": 12500, "75009": 11500, "75010": 10500,
    "75011": 11000, "75012": 10200, "75013": 9800, "75014": 10800, "75015": 11200,
    "75016": 12000, "75017": 11800, "75018": 9500, "75019": 8800, "75020": 9200
}

def retry_on_failure(retries=3, delay=10):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            for i in range(retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if i == retries - 1: 
                        logger.error(f"❌ Échec définitif de {func.__name__}: {e}")
                        return []
                    logger.warning(f"⚠️ Tentative {i+1}/{retries} échouée pour {func.__name__}: {e}")
                    await asyncio.sleep(delay * (i + 1))
            return []
        return wrapper
    return decorator

async def apply_stealth(page):
    """Applique des scripts de furtivité manuels pour bypasser les détections simples."""
    await page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    """)

async def get_precise_location(address):
    if not address: return None
    if address in GEO_CACHE: return GEO_CACHE[address]
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api-adresse.data.gouv.fr/search/?q={address}&limit=1",
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                if data["features"]:
                    feature = data["features"][0]
                    coords = feature["geometry"]["coordinates"]
                    result = {
                        "address": feature["properties"]["label"],
                        "lat": coords[1],
                        "lng": coords[0]
                    }
                    GEO_CACHE[address] = result
                    return result
    except Exception as e:
        logger.warning(f"Erreur géocodage pour {address}: {e}")
    
    return None

def extract_dpe(text):
    match = re.search(r'DPE\s*[:\s]*([A-G])', text, re.IGNORECASE)
    if match: return match.group(1).upper()
    match = re.search(r'(?:classe|consommation|catégorie)\s*(?:énergétique)?\s*([A-G])', text, re.IGNORECASE)
    if match: return match.group(1).upper()
    return "D"

def extract_surface(text, tags_text=""):
    surfaces = []
    match_tags = re.search(r'(\d+(?:[.,]\d+)?)\s*m²', tags_text, re.IGNORECASE)
    if match_tags: surfaces.append(float(match_tags.group(1).replace(',', '.')))
    matches_desc = re.findall(r'(\d+(?:[.,]\d+)?)\s*(?:m²|m2|metres carres|mètres carrés)', text, re.IGNORECASE)
    for m in matches_desc:
        surfaces.append(float(m.replace(',', '.')))
    return max(surfaces) if surfaces else 35.0

def detect_defects(text):
    keywords = ["copro en procédure", "vétusté", "amiante", "nuisibles", "travaux", "ravalement", "humidité", "plomb"]
    text_lower = text.lower()
    return [kw for kw in keywords if kw in text_lower]

def extract_map_query(text, city, district_text):
    cp_match = re.search(r'75\d{3}', district_text)
    cp = cp_match.group(0) if cp_match else ""
    metro_match = re.search(r'(?:m[ée]tro|m°)\s+([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)*)', text, re.IGNORECASE)
    if metro_match: return f"Métro {metro_match.group(1)} Paris"
    loc_match = re.search(r'(?:rue|avenue|boulevard|place|bd|av|quartier|secteur|proche)\s+([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)*)', text, re.IGNORECASE)
    if loc_match: return f"{loc_match.group(0)} Paris {cp}".strip()
    return f"Paris {cp}".strip() if cp else city

@retry_on_failure()
async def scrape_pap(page):
    logger.info("🔍 Scraping PAP.fr (Modular)...")
    try:
        config_path = os.path.join(os.path.dirname(__file__), "../../backend/scrapers/config/pap.yaml")
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        scraper = PapScraper(config)
        deals = await scraper.run()
        
        # Add missing fields for compatibility with the rest of the system
        for deal in deals:
            deal.setdefault("villes", "Paris")
            deal.setdefault("type", "Appartement")
            deal.setdefault("location", None)
            deal.setdefault("map_query", "Paris")
            deal.setdefault("photos", [])
            deal.setdefault("description", deal.get("title", ""))
            deal.setdefault("id", f"pap-{abs(hash(deal['url']))}")
            # Champs géocodage & enrichissement
            deal.setdefault("street_number", None)
            deal.setdefault("street", None)
            deal.setdefault("postal_code", None)
            deal.setdefault("latitude", None)
            deal.setdefault("longitude", None)
            deal.setdefault("amenities", {"metros": [], "schools": []})
            deal.setdefault("city", deal.get("villes", "Paris"))
            
        return deals
    except Exception as e:
        logger.error(f"Erreur PAP (Modular): {e}")
    return []

@retry_on_failure()
async def scrape_lbc(page):
    logger.info("🔍 Scraping LeBonCoin...")
    deals = []
    try:
        # URL de recherche Paris Immobilier
        await page.goto("https://www.leboncoin.fr/recherche?category=9&locations=Paris__48.8588897_2.32004102113926_5000", wait_until="domcontentloaded", timeout=45000)
        await asyncio.sleep(8) # Délai plus long pour simuler lecture humaine
        
        listings = await page.query_selector_all("article")
        logger.info(f"✅ LeBonCoin: {len(listings)} annonces trouvées.")
        
        for item in listings[:10]:
            try:
                link_el = await item.query_selector("a")
                href = await link_el.get_attribute("href") if link_el else ""
                if not href: continue

                # Reconstruction URL propre
                full_url = href if href.startswith("http") else f"https://www.leboncoin.fr{href}"
                deal_id = f"lbc-{abs(hash(full_url))}"
                
                title_el = await item.query_selector("[data-qa-id='aditem_title']")
                price_el = await item.query_selector("[data-qa-id='aditem_price']")
                
                title_text = await title_el.inner_text() if title_el else "Appartement"
                price_text = await price_el.inner_text() if price_el else "0"
                clean_price = int(''.join(filter(str.isdigit, price_text))) if any(c.isdigit() for c in price_text) else 0
                
                deals.append({
                    "id": deal_id,
                    "villes": "Paris",
                    "type": title_text,
                    "prix": clean_price,
                    "surface": 35.0,
                    "dpe": "D",
                    "defects": [],
                    "map_query": "Paris",
                    "location": None,
                    "url": full_url,
                    "description": title_text,
                    "photos": [],
                    "source": "LeBonCoin"
                })
            except Exception as e:
                logger.debug(f"Erreur item LBC: {e}")
                continue
    except Exception as e:
        logger.error(f"Erreur LBC: {e}")
    return deals

@retry_on_failure()
async def scrape_bienici(page):
    logger.info("🔍 Scraping Bien'ici...")
    deals = []
    try:
        await page.goto("https://www.bienici.com/recherche/achat/paris-75000?tri=nouveaute", wait_until="domcontentloaded", timeout=45000)
        await asyncio.sleep(random.uniform(8, 12))
        
        # Simuler un scroll pour charger les images et paraître humain
        await page.mouse.wheel(0, 500)
        await asyncio.sleep(2)
        
        listings = await page.query_selector_all("article")
        logger.info(f"✅ Bien'ici: {len(listings)} annonces trouvées.")
        
        for item in listings[:15]:
            try:
                link_el = await item.query_selector("a.detailedSheetLink")
                href = await link_el.get_attribute("href") if link_el else ""
                if not href: continue

                full_url = href if href.startswith("http") else f"https://www.bienici.com{href}"
                
                # Extraction prix plus robuste (plusieurs sélecteurs possibles)
                price_text = "0"
                for sel in [".ad-overview-details__price", ".ad-card__price", ".price"]:
                    el = await item.query_selector(sel)
                    if el:
                        price_text = await el.inner_text()
                        break
                
                if price_text == "0":
                    # Tentative par recherche de texte €
                    inner_text = await item.inner_text()
                    price_match = re.search(r'(\d[\d\s]*)€', inner_text)
                    if price_match:
                        price_text = price_match.group(1)

                clean_price = int(''.join(filter(str.isdigit, price_text))) if any(c.isdigit() for c in price_text) else 0
                
                # Extraction surface
                surface_text = "35"
                for sel in [".ad-overview-details__surface", ".ad-card__surface", ".surface"]:
                    el = await item.query_selector(sel)
                    if el:
                        surface_text = await el.inner_text()
                        break
                
                clean_surface = float(re.search(r'(\d+)', surface_text).group(1)) if re.search(r'\d+', surface_text) else 35.0
                
                cp = "75000"
                cp_match = re.search(r'paris-(\d+)e', href)
                if cp_match:
                    arr = int(cp_match.group(1))
                    cp = f"75{arr:03d}"

                # Extraction photo
                img_el = await item.query_selector("img")
                img_url = await img_el.get_attribute("src") if img_el else ""
                photos = [img_url] if img_url and "http" in img_url else []

                deal_id = f"bienici-{abs(hash(full_url))}"
                deals.append({
                    "id": deal_id,
                    "villes": "Paris",
                    "type": f"Appartement {cp}",
                    "prix": clean_price,
                    "surface": clean_surface,
                    "dpe": "D",
                    "defects": [],
                    "map_query": f"Paris {cp}",
                    "location": None,
                    "url": full_url,
                    "description": "Annonce Bien'ici",
                    "photos": photos,
                    "source": "Bien'ici"
                })
            except Exception as e: 
                logger.debug(f"Erreur item Bien'ici: {e}")
                continue
    except Exception as e:
        logger.error(f"Erreur Bien'ici: {e}")
    return deals

@retry_on_failure()
async def scrape_seloger(page):
    logger.info("🔍 Scraping SeLoger...")
    deals = []
    try:
        await page.goto("https://www.seloger.com/list.htm?projects=2&types=1,2&places=[{cp:75}]&sort=realty_nouveautes", wait_until="domcontentloaded", timeout=45000)
        await asyncio.sleep(8)
        listings = await page.query_selector_all("[data-test='sl.card-container']")
        logger.info(f"✅ SeLoger: {len(listings)} annonces trouvées.")
        
        for item in listings[:10]:
            try:
                link_el = await item.query_selector("a")
                href = await link_el.get_attribute("href") if link_el else ""
                if not href: continue
                
                full_url = href if href.startswith("http") else f"https://www.seloger.com{href}"
                
                deals.append({
                    "id": f"seloger-{abs(hash(full_url))}",
                    "villes": "Paris",
                    "type": "Appartement",
                    "prix": 500000,
                    "surface": 40.0,
                    "dpe": "D",
                    "defects": [],
                    "map_query": "Paris",
                    "location": None,
                    "url": full_url,
                    "description": "Annonce SeLoger",
                    "photos": [],
                    "source": "SeLoger"
                })
            except Exception as e:
                logger.debug(f"Erreur item SeLoger: {e}")
                continue
    except Exception as e:
        logger.error(f"Erreur SeLoger: {e}")
    return deals

def deduplicate_deals(all_deals):
    unique_deals = {}
    for deal in all_deals:
        cp_match = re.search(r'75\d{3}', deal["type"])
        cp = cp_match.group(0) if cp_match else "75000"
        fingerprint = f"{deal['prix']}-{int(deal['surface'])}-{cp}"
        
        if fingerprint in unique_deals:
            existing = unique_deals[fingerprint]
            if deal["source"] not in [s["name"] for s in existing.get("sources", [])]:
                existing.setdefault("sources", [{"name": existing["source"], "url": existing["url"]}])
                existing["sources"].append({"name": deal["source"], "url": deal["url"]})
            if len(deal["photos"]) > len(existing["photos"]):
                existing["photos"] = deal["photos"]
        else:
            deal["sources"] = [{"name": deal["source"], "url": deal["url"]}]
            unique_deals[fingerprint] = deal
            
    final_deals = []
    for deal in unique_deals.values():
        surface = deal["surface"]
        price = deal["prix"]
        deal["price_per_m2"] = round(price / surface) if surface > 0 else 0
        
        cp_match = re.search(r'75\d{3}', deal["type"])
        cp = cp_match.group(0) if cp_match else "75015"
        market_price = MARKET_PRICES.get(cp, 11000)
        deal["price_vs_market"] = round((deal["price_per_m2"] / market_price - 1) * 100, 1) if market_price > 0 else 0
        deal["market_price_ref"] = market_price
        
        deal["estimated_monthly_charges"] = round(surface * 2.5)
        deal["estimated_annual_tax"] = round(surface * 9)
        deal["rendement"] = 5.2
        deal["score"] = 80
        final_deals.append(deal)
        
    return final_deals

async def run_all_scrapers():
    async with async_playwright() as p:
        # Sélection aléatoire d'un proxy si disponible
        proxy = random.choice(PROXIES) if PROXIES else None
        
        browser = await p.chromium.launch(
            headless=True, 
            args=["--disable-blink-features=AutomationControlled"],
            proxy={"server": proxy} if proxy else None
        )
        
        # Rotation de User-Agent
        ua = random.choice(USER_AGENTS)
        context = await browser.new_context(
            user_agent=ua,
            viewport={'width': 1920, 'height': 1080}
        )
        
        page = await context.new_page()
        await apply_stealth(page)
        
        all_deals = []
        all_deals.extend(await scrape_pap(page))
        await asyncio.sleep(random.uniform(2, 5))
        
        all_deals.extend(await scrape_lbc(page))
        await asyncio.sleep(random.uniform(2, 5))
        
        all_deals.extend(await scrape_bienici(page))
        await asyncio.sleep(random.uniform(2, 5))
        
        all_deals.extend(await scrape_seloger(page))
        
        final_deals = deduplicate_deals(all_deals)
        
        if final_deals:
            os.makedirs('src/data', exist_ok=True)
            with open('src/data/real_deals.json', 'w', encoding='utf-8') as f:
                json.dump(final_deals, f, indent=4, ensure_ascii=False)
            logger.info(f"✅ ANALYSE TERMINÉE : {len(final_deals)} annonces uniques sauvegardées.")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_all_scrapers())
