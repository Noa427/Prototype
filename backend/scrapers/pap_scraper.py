import re
import time
import logging
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper
from .utils.geocoding import get_coordinates
from .utils.overpass import get_nearby_amenities

logger = logging.getLogger(__name__)

class PapScraper(BaseScraper):

    def extract_address(self, text):
        result = {"street_number": None, "street": None, "postal_code": None, "city": None}
        
        # 1. Adresse complète classique
        full_match = re.search(r'(\d+\s*(?:bis|ter)?)\s*,?\s*((?:rue|avenue|boulevard|bd|av|place|impasse|passage|allée|chemin|quai|cours|square|villa|cité|voie)\s+[A-ZÀ-Üa-zà-ÿ\s\-\'\d]+?)\s*,?\s*(\d{5})\s+([A-ZÀ-Üa-zà-ÿ\s\-]+)', text, re.IGNORECASE)
        if full_match:
            result["street_number"] = full_match.group(1).strip()
            result["street"] = full_match.group(2).strip()
            result["postal_code"] = full_match.group(3)
            result["city"] = full_match.group(4).strip()
            return result

        # 2. Format PAP classique : "Paris 12E (75012)" ou "Montreuil (93100)"
        pap_match = re.search(r'([A-ZÀ-Üa-zà-ÿ\-\s]+(?:\s*\d+[eE])?)\s*\((\d{5})\)', text)
        if pap_match:
            city_raw = pap_match.group(1).strip()
            # Nettoyage si le mot "Appartement" est collé
            result["city"] = re.sub(r'(?i)appartement\s*', '', city_raw).strip()
            result["postal_code"] = pap_match.group(2)
            return result

        # 3. Format "75012 Paris"
        cp_match = re.search(r'(\d{5})\s+([A-ZÀ-Üa-zà-ÿ\s\-]+)', text)
        if cp_match:
            result["postal_code"] = cp_match.group(1)
            result["city"] = cp_match.group(2).strip()
            return result

        # 4. Repli final : juste le code postal
        cp_only = re.search(r'\b(\d{5})\b', text)
        if cp_only:
            result["postal_code"] = cp_only.group(1)

        return result

    def parse(self, html):
        soup = BeautifulSoup(html, 'html.parser')
        deals = []
        ad_container_selector = self.selectors.get("ad_container", ".listing")
        listings = soup.select(ad_container_selector)
        logger.info(f"[{self.name}] Found {len(listings)} listings.")

        for item in listings:
            try:
                deal = {}
                title_el = item.select_one(self.selectors.get("title", ".title"))
                price_el = item.select_one(self.selectors.get("price", ".price"))
                address_el = item.select_one(self.selectors.get("address", ".address"))

                deal["title"] = title_el.get_text(strip=True) if title_el else "Appartement"
                price_text = price_el.get_text(strip=True) if price_el else "0"
                deal["price"] = int(''.join(filter(str.isdigit, price_text))) if any(c.isdigit() for c in price_text) else 0

                if deal["price"] == 0:
                    continue

                full_text = item.get_text()
                deal["surface"] = self.extract_surface(full_text)
                deal["dpe"] = self.extract_dpe(full_text)
                deal["defects"] = self.detect_defects(full_text)

                link_el = item.find("a")
                deal["url"] = f"https://www.pap.fr{link_el['href']}" if link_el and link_el.has_attr('href') else ""
                deal["source"] = "PAP.fr"

                address_text = address_el.get_text(strip=True) if address_el else full_text
                
                # PAP cache souvent la ville dans le titre
                if " (" in deal["title"]:
                    address_text = deal["title"] + " " + address_text

                address_data = self.extract_address(address_text)
                deal["street_number"] = address_data["street_number"]
                deal["street"] = address_data["street"]
                deal["postal_code"] = address_data["postal_code"]
                deal["city"] = address_data["city"]

                addr_parts = [p for p in [address_data["street_number"], address_data["street"], address_data["postal_code"], address_data["city"]] if p]
                full_address = ", ".join(addr_parts) + ", France" if addr_parts else None

                lat, lon = None, None
                if full_address:
                    lat, lon = get_coordinates(full_address)
                    time.sleep(1)  # Frein thermique : 1 seconde pour Nominatim

                deal["latitude"] = lat
                deal["longitude"] = lon

                if lat is not None and lon is not None:
                    amenities = get_nearby_amenities(lat, lon)
                    deal["amenities"] = amenities
                    time.sleep(2)  # Frein thermique : 2 secondes pour Overpass
                else:
                    deal["amenities"] = {"metros": [], "schools": []}

                deals.append(deal)
            except Exception as e:
                logger.error(f"[{self.name}] Error parsing item: {e}")
                continue

        return deals

    def extract_surface(self, text):
        matches = re.findall(r'(\d+(?:[.,]\d+)?)\s*(?:m²|m2|metres carres|mètres carrés)', text, re.IGNORECASE)
        if matches: return float(matches[0].replace(',', '.'))
        return 35.0

    def extract_dpe(self, text):
        match = re.search(r'DPE\s*[:\s]*([A-G])', text, re.IGNORECASE)
        if match: return match.group(1).upper()
        return "D"

    def detect_defects(self, text):
        keywords = ["copro en procédure", "vétusté", "amiante", "nuisibles", "travaux", "ravalement", "humidité", "plomb"]
        return [kw for kw in keywords if kw in text.lower()]
