import re
import logging
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper
from .utils.geocoding import get_coordinates
from .utils.overpass import get_nearby_amenities

logger = logging.getLogger(__name__)


class PapScraper(BaseScraper):

    def extract_address(self, text):
        """Extrait numéro, rue, code postal et ville depuis un texte d'annonce.

        Regex robuste couvrant les formats courants :
        - "12 rue de la Paix, 75002 Paris"
        - "3 bis boulevard Haussmann 75009 Paris"
        - "75015 Paris" (sans rue)
        """
        result = {
            "street_number": None,
            "street": None,
            "postal_code": None,
            "city": None
        }

        # Tenter d'extraire une adresse complète : numéro + type de voie + nom + CP + ville
        full_match = re.search(
            r'(\d+\s*(?:bis|ter)?)\s*,?\s*'
            r'((?:rue|avenue|boulevard|bd|av|place|impasse|passage|allée|chemin|quai|cours|square|villa|cité|voie)\s+'
            r'[A-ZÀ-Üa-zà-ÿ\s\-\'\d]+?)\s*,?\s*'
            r'(\d{5})\s+'
            r'([A-ZÀ-Üa-zà-ÿ\s\-]+)',
            text,
            re.IGNORECASE
        )
        if full_match:
            result["street_number"] = full_match.group(1).strip()
            result["street"] = full_match.group(2).strip()
            result["postal_code"] = full_match.group(3)
            result["city"] = full_match.group(4).strip()
            return result

        # Fallback : code postal + ville seulement
        cp_match = re.search(r'(\d{5})\s+([A-ZÀ-Üa-zà-ÿ\s\-]+)', text)
        if cp_match:
            result["postal_code"] = cp_match.group(1)
            result["city"] = cp_match.group(2).strip()

        # Fallback : code postal seul (ex : "75015")
        if not result["postal_code"]:
            cp_only = re.search(r'\b(\d{5})\b', text)
            if cp_only:
                result["postal_code"] = cp_only.group(1)

        return result

    def parse(self, html):
        """Parses PAP HTML content using selectors from config and regex."""
        soup = BeautifulSoup(html, 'html.parser')
        deals = []

        ad_container_selector = self.selectors.get("ad_container", ".listing")
        listings = soup.select(ad_container_selector)

        logger.info(f"[{self.name}] Found {len(listings)} listings.")

        for item in listings:
            try:
                deal = {}

                # Basic fields from selectors
                title_el = item.select_one(self.selectors.get("title", ".title"))
                price_el = item.select_one(self.selectors.get("price", ".price"))
                surface_el = item.select_one(self.selectors.get("surface", ".surface"))
                rooms_el = item.select_one(self.selectors.get("rooms", ".rooms"))
                address_el = item.select_one(self.selectors.get("address", ".address"))

                deal["title"] = title_el.get_text(strip=True) if title_el else "Appartement"

                price_text = price_el.get_text(strip=True) if price_el else "0"
                deal["prix"] = int(''.join(filter(str.isdigit, price_text))) if any(c.isdigit() for c in price_text) else 0

                if deal["prix"] == 0:
                    continue

                # Use regex for more details if needed
                full_text = item.get_text()
                deal["surface"] = self.extract_surface(full_text)
                deal["dpe"] = self.extract_dpe(full_text)
                deal["defects"] = self.detect_defects(full_text)

                # URL extraction (assuming there's an <a> tag)
                link_el = item.find("a")
                deal["url"] = f"https://www.pap.fr{link_el['href']}" if link_el and link_el.has_attr('href') else ""

                deal["source"] = "PAP.fr"

                # --- Extraction adresse + géocodage + enrichissement ---
                address_text = address_el.get_text(strip=True) if address_el else full_text
                address_data = self.extract_address(address_text)
                deal["street_number"] = address_data["street_number"]
                deal["street"] = address_data["street"]
                deal["postal_code"] = address_data["postal_code"]
                deal["city"] = address_data["city"]

                # Construire l'adresse complète pour le géocodage
                addr_parts = [
                    p for p in [
                        address_data["street_number"],
                        address_data["street"],
                        address_data["postal_code"],
                        address_data["city"]
                    ] if p
                ]
                full_address = ", ".join(addr_parts) + ", France" if addr_parts else None

                lat, lon = None, None
                if full_address:
                    lat, lon = get_coordinates(full_address)
                deal["latitude"] = lat
                deal["longitude"] = lon

                # Enrichissement Overpass uniquement si coordonnées disponibles
                if lat is not None and lon is not None:
                    amenities = get_nearby_amenities(lat, lon)
                    deal["amenities"] = amenities
                else:
                    deal["amenities"] = {"metros": [], "schools": []}

                deals.append(deal)
            except Exception as e:
                logger.error(f"[{self.name}] Error parsing item: {e}")
                continue

        return deals

    def extract_surface(self, text):
        matches = re.findall(r'(\d+(?:[.,]\d+)?)\s*(?:m²|m2|metres carres|mètres carrés)', text, re.IGNORECASE)
        if matches:
            return float(matches[0].replace(',', '.'))
        return 35.0

    def extract_dpe(self, text):
        match = re.search(r'DPE\s*[:\s]*([A-G])', text, re.IGNORECASE)
        if match: return match.group(1).upper()
        return "D"

    def detect_defects(self, text):
        keywords = ["copro en procédure", "vétusté", "amiante", "nuisibles", "travaux", "ravalement", "humidité", "plomb"]
        text_lower = text.lower()
        return [kw for kw in keywords if kw in text_lower]
