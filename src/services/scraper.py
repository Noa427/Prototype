#!/usr/bin/env python3
"""
AEVUM SCANNER - Module d'extraction de données immobilières
Utilise Playwright pour extraire les annonces depuis les sites immobiliers
"""

import json
import os
import re
from datetime import datetime
from playwright.sync_api import sync_playwright
import logging

# Configuration des logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - AEVUM SCANNER - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

class AevumScraper:
    def __init__(self):
        self.data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        self.output_file = os.path.join(self.data_dir, 'real_deals.json')
        self.ensure_data_directory()
    
    def ensure_data_directory(self):
        """Crée le dossier data s'il n'existe pas"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
            logger.info(f"Dossier créé: {self.data_dir}")
    
    def clean_price(self, price_text):
        """Nettoie et convertit le prix en nombre"""
        if not price_text:
            return None
        
        # Supprime tous les caractères non numériques sauf les espaces
        price_clean = re.sub(r'[^\d\s]', '', price_text)
        # Supprime les espaces
        price_clean = price_clean.replace(' ', '')
        
        try:
            return int(price_clean) if price_clean else None
        except ValueError:
            logger.warning(f"Impossible de convertir le prix: {price_text}")
            return None
    
    def clean_surface(self, surface_text):
        """Nettoie et convertit la surface en nombre"""
        if not surface_text:
            return None
        
        # Cherche les nombres suivis de m² ou m2
        match = re.search(r'(\d+(?:[,\.]\d+)?)\s*m[²2]', surface_text.lower())
        if match:
            try:
                surface = float(match.group(1).replace(',', '.'))
                return int(surface) if surface == int(surface) else surface
            except ValueError:
                pass
        
        # Fallback: cherche juste un nombre
        numbers = re.findall(r'\d+', surface_text)
        if numbers:
            try:
                return int(numbers[0])
            except ValueError:
                pass
        
        logger.warning(f"Impossible de convertir la surface: {surface_text}")
        return None
    
    def calculate_price_per_m2(self, price, surface):
        """Calcule le prix au m²"""
        if price and surface and surface > 0:
            return round(price / surface)
        return None
    
    def scrape_pap_fr(self):
        """Scrape les annonces depuis PAP.fr"""
        logger.info("🔍 Connexion au site PAP.fr...")
        
        deals = []
        
        with sync_playwright() as p:
            try:
                # Lancement du navigateur
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                
                # Configuration du user agent
                page.set_extra_http_headers({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                
                # URL de recherche PAP (appartements à vendre en France)
                url = "https://www.pap.fr/annonce/vente-appartement"
                logger.info(f"📡 Accès à: {url}")
                
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # Attendre que les annonces se chargent
                page.wait_for_selector('.search-list-item', timeout=10000)
                
                # Extraire les annonces
                listings = page.query_selector_all('.search-list-item')[:5]
                logger.info(f"📋 {len(listings)} annonces trouvées")
                
                for i, listing in enumerate(listings, 1):
                    try:
                        logger.info(f"🔄 Extraction annonce {i}/5...")
                        
                        # Titre
                        title_elem = listing.query_selector('.item-title')
                        title = title_elem.inner_text().strip() if title_elem else "Titre non disponible"
                        
                        # Prix
                        price_elem = listing.query_selector('.item-price')
                        price_text = price_elem.inner_text().strip() if price_elem else ""
                        price = self.clean_price(price_text)
                        
                        # Surface
                        surface_elem = listing.query_selector('.item-summary')
                        surface_text = surface_elem.inner_text().strip() if surface_elem else ""
                        surface = self.clean_surface(surface_text)
                        
                        # Ville (chercher dans différents sélecteurs possibles)
                        city = "Ville non disponible"
                        city_selectors = ['.item-location', '.item-city', '.item-address']
                        for selector in city_selectors:
                            city_elem = listing.query_selector(selector)
                            if city_elem:
                                city = city_elem.inner_text().strip()
                                break
                        
                        # Si pas trouvé, chercher dans le titre
                        if city == "Ville non disponible" and title:
                            # Chercher un code postal dans le titre
                            postal_match = re.search(r'\b(\d{5})\b', title)
                            if postal_match:
                                city = f"Code postal {postal_match.group(1)}"
                        
                        # Calcul prix au m²
                        price_per_m2 = self.calculate_price_per_m2(price, surface)
                        
                        deal = {
                            "id": f"pap_{datetime.now().strftime('%Y%m%d')}_{i}",
                            "title": title,
                            "price": price,
                            "surface": surface,
                            "city": city,
                            "pricePerM2": price_per_m2,
                            "source": "PAP.fr",
                            "extractedAt": datetime.now().isoformat(),
                            "url": url
                        }
                        
                        deals.append(deal)
                        
                        logger.info(f"✅ Annonce {i}: {title[:50]}{'...' if len(title) > 50 else ''}")
                        if price:
                            logger.info(f"   💰 Prix: {price:,}€")
                        if surface:
                            logger.info(f"   📐 Surface: {surface}m²")
                        if price_per_m2:
                            logger.info(f"   📊 Prix/m²: {price_per_m2:,}€/m²")
                        logger.info(f"   📍 Ville: {city}")
                        
                    except Exception as e:
                        logger.error(f"❌ Erreur lors de l'extraction de l'annonce {i}: {str(e)}")
                        continue
                
                browser.close()
                
            except Exception as e:
                logger.error(f"❌ Erreur lors du scraping: {str(e)}")
                return []
        
        return deals
    
    def save_deals(self, deals):
        """Sauvegarde les annonces dans le fichier JSON"""
        if not deals:
            logger.warning("⚠️ Aucune annonce à sauvegarder")
            return False
        
        try:
            # Charger les données existantes si le fichier existe
            existing_deals = []
            if os.path.exists(self.output_file):
                with open(self.output_file, 'r', encoding='utf-8') as f:
                    existing_deals = json.load(f)
            
            # Ajouter les nouvelles annonces
            all_deals = existing_deals + deals
            
            # Sauvegarder
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(all_deals, f, ensure_ascii=False, indent=2)
            
            logger.info(f"💾 {len(deals)} nouvelles annonces sauvegardées dans {self.output_file}")
            logger.info(f"📊 Total: {len(all_deals)} annonces en base")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la sauvegarde: {str(e)}")
            return False
    
    def run(self):
        """Lance le processus complet de scraping"""
        logger.info("🚀 AEVUM SCANNER - Démarrage de l'extraction")
        logger.info("=" * 50)
        
        try:
            # Scraping des annonces
            deals = self.scrape_pap_fr()
            
            if deals:
                # Sauvegarde
                success = self.save_deals(deals)
                
                if success:
                    logger.info("=" * 50)
                    logger.info("✅ EXTRACTION TERMINÉE AVEC SUCCÈS")
                    logger.info(f"📈 {len(deals)} annonces extraites et sauvegardées")
                else:
                    logger.error("❌ Échec de la sauvegarde")
            else:
                logger.warning("⚠️ Aucune annonce extraite")
                
        except Exception as e:
            logger.error(f"❌ Erreur critique: {str(e)}")

def main():
    """Point d'entrée principal"""
    scraper = AevumScraper()
    scraper.run()

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
AEVUM SCANNER - Module d'extraction de données immobilières
Utilise Playwright pour extraire les annonces depuis les sites immobiliers
"""

import json
import os
import re
from datetime import datetime
from playwright.sync_api import sync_playwright
import logging

# Configuration des logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - AEVUM SCANNER - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

class AevumScraper:
    def __init__(self):
        self.data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        self.output_file = os.path.join(self.data_dir, 'real_deals.json')
        self.ensure_data_directory()
    
    def ensure_data_directory(self):
        """Crée le dossier data s'il n'existe pas"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
            logger.info(f"Dossier créé: {self.data_dir}")
    
    def clean_price(self, price_text):
        """Nettoie et convertit le prix en nombre"""
        if not price_text:
            return None
        
        # Supprime tous les caractères non numériques sauf les espaces
        price_clean = re.sub(r'[^\d\s]', '', price_text)
        # Supprime les espaces
        price_clean = price_clean.replace(' ', '')
        
        try:
            return int(price_clean) if price_clean else None
        except ValueError:
            logger.warning(f"Impossible de convertir le prix: {price_text}")
            return None
    
    def clean_surface(self, surface_text):
        """Nettoie et convertit la surface en nombre"""
        if not surface_text:
            return None
        
        # Cherche les nombres suivis de m² ou m2
        match = re.search(r'(\d+(?:[,\.]\d+)?)\s*m[²2]', surface_text.lower())
        if match:
            try:
                surface = float(match.group(1).replace(',', '.'))
                return int(surface) if surface == int(surface) else surface
            except ValueError:
                pass
        
        # Fallback: cherche juste un nombre
        numbers = re.findall(r'\d+', surface_text)
        if numbers:
            try:
                return int(numbers[0])
            except ValueError:
                pass
        
        logger.warning(f"Impossible de convertir la surface: {surface_text}")
        return None
    
    def calculate_price_per_m2(self, price, surface):
        """Calcule le prix au m²"""
        if price and surface and surface > 0:
            return round(price / surface)
        return None
    
    def scrape_pap_fr(self):
        """Scrape les annonces depuis PAP.fr"""
        logger.info("🔍 Connexion au site PAP.fr...")
        
        deals = []
        
        with sync_playwright() as p:
            try:
                # Lancement du navigateur
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                
                # Configuration du user agent
                page.set_extra_http_headers({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                
                # URL de recherche PAP (appartements à vendre en France)
                url = "https://www.pap.fr/annonce/vente-appartement"
                logger.info(f"📡 Accès à: {url}")
                
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # Attendre que les annonces se chargent
                page.wait_for_selector('.search-list-item', timeout=10000)
                
                # Extraire les annonces
                listings = page.query_selector_all('.search-list-item')[:5]
                logger.info(f"📋 {len(listings)} annonces trouvées")
                
                for i, listing in enumerate(listings, 1):
                    try:
                        logger.info(f"🔄 Extraction annonce {i}/5...")
                        
                        # Titre
                        title_elem = listing.query_selector('.item-title')
                        title = title_elem.inner_text().strip() if title_elem else "Titre non disponible"
                        
                        # Prix
                        price_elem = listing.query_selector('.item-price')
                        price_text = price_elem.inner_text().strip() if price_elem else ""
                        price = self.clean_price(price_text)
                        
                        # Surface
                        surface_elem = listing.query_selector('.item-summary')
                        surface_text = surface_elem.inner_text().strip() if surface_elem else ""
                        surface = self.clean_surface(surface_text)
                        
                        # Ville (chercher dans différents sélecteurs possibles)
                        city = "Ville non disponible"
                        city_selectors = ['.item-location', '.item-city', '.item-address']
                        for selector in city_selectors:
                            city_elem = listing.query_selector(selector)
                            if city_elem:
                                city = city_elem.inner_text().strip()
                                break
                        
                        # Si pas trouvé, chercher dans le titre
                        if city == "Ville non disponible" and title:
                            # Chercher un code postal dans le titre
                            postal_match = re.search(r'\b(\d{5})\b', title)
                            if postal_match:
                                city = f"Code postal {postal_match.group(1)}"
                        
                        # Calcul prix au m²
                        price_per_m2 = self.calculate_price_per_m2(price, surface)
                        
                        deal = {
                            "id": f"pap_{datetime.now().strftime('%Y%m%d')}_{i}",
                            "title": title,
                            "price": price,
                            "surface": surface,
                            "city": city,
                            "pricePerM2": price_per_m2,
                            "source": "PAP.fr",
                            "extractedAt": datetime.now().isoformat(),
                            "url": url
                        }
                        
                        deals.append(deal)
                        
                        logger.info(f"✅ Annonce {i}: {title[:50]}{'...' if len(title) > 50 else ''}")
                        if price:
                            logger.info(f"   💰 Prix: {price:,}€")
                        if surface:
                            logger.info(f"   📐 Surface: {surface}m²")
                        if price_per_m2:
                            logger.info(f"   📊 Prix/m²: {price_per_m2:,}€/m²")
                        logger.info(f"   📍 Ville: {city}")
                        
                    except Exception as e:
                        logger.error(f"❌ Erreur lors de l'extraction de l'annonce {i}: {str(e)}")
                        continue
                
                browser.close()
                
            except Exception as e:
                logger.error(f"❌ Erreur lors du scraping: {str(e)}")
                return []
        
        return deals
    
    def save_deals(self, deals):
        """Sauvegarde les annonces dans le fichier JSON"""
        if not deals:
            logger.warning("⚠️ Aucune annonce à sauvegarder")
            return False
        
        try:
            # Charger les données existantes si le fichier existe
            existing_deals = []
            if os.path.exists(self.output_file):
                with open(self.output_file, 'r', encoding='utf-8') as f:
                    existing_deals = json.load(f)
            
            # Ajouter les nouvelles annonces
            all_deals = existing_deals + deals
            
            # Sauvegarder
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(all_deals, f, ensure_ascii=False, indent=2)
            
            logger.info(f"💾 {len(deals)} nouvelles annonces sauvegardées dans {self.output_file}")
            logger.info(f"📊 Total: {len(all_deals)} annonces en base")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la sauvegarde: {str(e)}")
            return False
    
    def run(self):
        """Lance le processus complet de scraping"""
        logger.info("🚀 AEVUM SCANNER - Démarrage de l'extraction")
        logger.info("=" * 50)
        
        try:
            # Scraping des annonces
            deals = self.scrape_pap_fr()
            
            if deals:
                # Sauvegarde
                success = self.save_deals(deals)
                
                if success:
                    logger.info("=" * 50)
                    logger.info("✅ EXTRACTION TERMINÉE AVEC SUCCÈS")
                    logger.info(f"📈 {len(deals)} annonces extraites et sauvegardées")
                else:
                    logger.error("❌ Échec de la sauvegarde")
            else:
                logger.warning("⚠️ Aucune annonce extraite")
                
        except Exception as e:
            logger.error(f"❌ Erreur critique: {str(e)}")

def main():
    """Point d'entrée principal"""
    scraper = AevumScraper()
    scraper.run()

if __name__ == "__main__":
    main()
import asyncio
import json
import os
from playwright.async_api import async_playwright

async def scrape_pap():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("🔍 Connexion à PAP.fr...")
        await page.goto("https://www.pap.fr/annonce/vente-appartements-maisons-paris-75-g439")
        
        deals = []
        listings = await page.query_selector_all(".search-list-item")
        
        for i, item in enumerate(listings[:5]):
            title = await (await item.query_selector(".h1")).inner_text()
            price = await (await item.query_selector(".price")).inner_text()
            # Nettoyage basique du prix
            clean_price = int(''.join(filter(str.isdigit, price)))
            
            deals.append({
                "id": f"real-{i}",
                "villes": "Paris",
                "type": title,
                "prix": clean_price,
                "surface": 45, # Valeur par défaut pour le test
                "rendement": 5.2,
                "score": 85,
                "source": "LIVE"
            })
        
        os.makedirs('src/data', exist_ok=True)
        with open('src/data/real_deals.json', 'w') as f:
            json.dump(deals, f, indent=4)
        
        print(f"✅ EXTRACTION TERMINÉE : {len(deals)} annonces sauvegardées.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_pap())
