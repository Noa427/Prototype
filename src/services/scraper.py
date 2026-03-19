import asyncio
import json
import os
import re
import hashlib
import shutil
from datetime import datetime

def generate_stable_id(text):
    return hashlib.md5(text.encode()).hexdigest()[:12]

def backup_existing_data():
    """Sauvegarde le fichier existant avant modification"""
    data_file = 'src/data/real_deals.json'
    if os.path.exists(data_file):
        backup_file = f'src/data/real_deals_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        shutil.copy2(data_file, backup_file)
        print(f"📦 Sauvegarde créée: {backup_file}")

def safe_write_data(deals):
    """Écriture sécurisée des données avec fallback"""
    os.makedirs('src/data', exist_ok=True)
    
    if deals and len(deals) > 0:
        # Écriture normale si on a des données
        with open('src/data/real_deals.json', 'w', encoding='utf-8') as f:
            json.dump(deals, f, indent=4, ensure_ascii=False)
        print(f"✅ {len(deals)} annonces sauvegardées")
    else:
        # Si aucune donnée, on garde l'ancien fichier ou on crée un tableau vide minimal
        data_file = 'src/data/real_deals.json'
        if not os.path.exists(data_file):
            # Créer un fichier minimal si aucun n'existe
            fallback_data = [{
                "id": "fallback-001",
                "villes": "Paris",
                "type": "Appartement",
                "prix": 350000,
                "surface": 35,
                "rendement": 4.5,
                "score": 65,
                "url": "https://www.pap.fr",
                "photos": [],
                "description": "Données de secours - Scanner en cours de redémarrage"
            }]
            with open(data_file, 'w', encoding='utf-8') as f:
                json.dump(fallback_data, f, indent=4, ensure_ascii=False)
            print("🔄 Fichier de secours créé")
        else:
            print("⚠️ Aucune nouvelle donnée - fichier existant conservé")

async def scrape_pap():
    print("🚀 DÉMARRAGE DU SCANNER AEVUM...")
    
    # Sauvegarde préventive
    backup_existing_data()
    
    try:
        # Import conditionnel de Playwright
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            print("❌ Playwright non disponible - utilisation des données de secours")
            safe_write_data([])
            return
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            page = await context.new_page()
            
            try:
                await page.goto("https://www.pap.fr/annonce/vente-appartements-maisons-paris-75-g439", 
                              wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_selector(".search-list-item-alt", timeout=20000)
                listings = await page.query_selector_all(".search-list-item-alt")
                
                deals = []
                for i, item in enumerate(listings[:10]):
                    try:
                        link_el = await item.query_selector("a")
                        href = await link_el.get_attribute("href") if link_el else ""
                        if not href: 
                            continue

                        # ID stable basé sur l'URL
                        deal_id = f"pap-{generate_stable_id(href)}"

                        # Prix avec validation
                        price_el = await item.query_selector(".item-price")
                        price_text = await price_el.inner_text() if price_el else "0"
                        clean_price = int(''.join(filter(str.isdigit, price_text))) if any(c.isdigit() for c in price_text) else 0
                        
                        if clean_price == 0:
                            continue  # Ignorer les annonces sans prix valide
                        
                        # Image (optionnelle)
                        img_el = await item.query_selector("img")
                        photo_url = await img_el.get_attribute("src") if img_el else ""
                        
                        # Titre/Type
                        title_el = await item.query_selector(".item-title")
                        title = await title_el.inner_text() if title_el else "Appartement"

                        deals.append({
                            "id": deal_id,
                            "villes": "Paris",
                            "type": title.strip(),
                            "prix": clean_price,
                            "surface": 35 + (i * 5),  # Surface simulée
                            "rendement": round(4.0 + (i * 0.3), 1),
                            "score": 60 + (i * 5),
                            "url": f"https://www.pap.fr{href}",
                            "photos": [photo_url] if photo_url and photo_url.startswith('http') else [],
                            "description": f"Opportunité détectée par AEVUM - {title.strip()}"
                        })
                        
                        print(f"✅ {deal_id} - {clean_price}€")
                        
                    except Exception as e:
                        print(f"⚠️ Erreur item {i}: {e}")
                        continue
                
                safe_write_data(deals)
                
            except Exception as e:
                print(f"💥 Erreur de scraping: {e}")
                safe_write_data([])
            finally:
                await browser.close()
                
    except Exception as e:
        print(f"💥 Erreur critique: {e}")
        safe_write_data([])

if __name__ == "__main__":
    asyncio.run(scrape_pap())
