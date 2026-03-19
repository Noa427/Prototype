import asyncio
import json
import os
import re
import hashlib
from playwright.async_api import async_playwright

def generate_stable_id(text):
    return hashlib.md5(text.encode()).hexdigest()[:12]

async def scrape_pap():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="Mozilla/5.0")
        page = await context.new_page()
        print("🛡️ GÉNÉRATION D'IDS INDESTRUCTIBLES...")
        
        try:
            await page.goto("https://www.pap.fr/annonce/vente-appartements-maisons-paris-75-g439", wait_until="domcontentloaded")
            await page.wait_for_selector(".search-list-item-alt", timeout=20000)
            listings = await page.query_selector_all(".search-list-item-alt")
            
            deals = []
            for item in listings[:10]:
                link_el = await item.query_selector("a")
                href = await link_el.get_attribute("href") if link_el else ""
                if not href: continue

                # ID BASÉ SUR L'URL (MD5) : NE CHANGERA JAMAIS
                deal_id = f"id-{generate_stable_id(href)}"

                price_el = await item.query_selector(".item-price")
                price_text = await price_el.inner_text() if price_el else "0"
                clean_price = int(''.join(filter(str.isdigit, price_text))) if any(c.isdigit() for c in price_text) else 0
                
                img_el = await item.query_selector("img")
                photo_url = await img_el.get_attribute("src") if img_el else ""

                deals.append({
                    "id": deal_id,
                    "villes": "Paris",
                    "prix": clean_price,
                    "url": f"https://www.pap.fr{href}",
                    "photos": [photo_url] if photo_url else [],
                    "timestamp": int(asyncio.get_event_loop().time() * 1000)
                })
            
            os.makedirs('src/data', exist_ok=True)
            with open('src/data/real_deals.json', 'w') as f:
                json.dump(deals, f, indent=4)
            print(f"✅ IDS FIXES GÉNÉRÉS : {len(deals)} annonces.")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_pap())
