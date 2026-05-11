import asyncio
import logging
import sys
import os
import re
from playwright.async_api import async_playwright

# Ajouter le dossier parent au path pour les imports si besoin
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
]

async def test_source(name, url, selector):
    logger.info(f"🚀 Test de la source : {name}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
        context = await browser.new_context(
            user_agent=USER_AGENTS[0],
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        
        try:
            logger.info(f"Navigation vers {url}...")
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(10) # Délai généreux pour le test
            
            # Capture d'écran pour debug visuel
            os.makedirs('debug', exist_ok=True)
            await page.screenshot(path=f"debug/test_{name.lower()}.png")
            logger.info(f"Screenshot sauvegardé : debug/test_{name.lower()}.png")
            
            listings = await page.query_selector_all(selector)
            logger.info(f"✅ {name}: {len(listings)} éléments trouvés avec le sélecteur '{selector}'.")
            
            if len(listings) > 0:
                first_item = listings[0]
                html = await first_item.inner_html()
                logger.info(f"📄 HTML du premier élément ({name}):\n{html[:1000]}...")
                
                link_el = await first_item.query_selector("a")
                href = await link_el.get_attribute("href") if link_el else "NON TROUVÉ"
                logger.info(f"🔗 Exemple d'URL extraite : {href}")
                
                # Test de reconstruction
                base_url = "https://www.leboncoin.fr" if name == "LeBonCoin" else "https://www.bienici.com" if name == "Bien'ici" else ""
                full_url = href if href.startswith("http") else f"{base_url}{href}"
                logger.info(f"🔗 URL reconstruite : {full_url}")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du test de {name}: {e}")
        finally:
            await browser.close()

async def main():
    sources = [
        ("PAP", "https://www.pap.fr/annonce/vente-appartements-maisons-paris-75-g439", ".search-list-item-alt"),
        ("LeBonCoin", "https://www.leboncoin.fr/recherche?category=9&locations=Paris__48.8588897_2.32004102113926_5000", "article"),
        ("Bien'ici", "https://www.bienici.com/recherche/achat/paris-75000?tri=nouveaute", "article"),
        ("SeLoger", "https://www.seloger.com/list.htm?projects=2&types=1,2&places=[{cp:75}]&sort=realty_nouveautes", "[data-test='sl.card-container']")
    ]
    
    for name, url, selector in sources:
        await test_source(name, url, selector)
        await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
