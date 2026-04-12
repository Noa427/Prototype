import re
import logging
import json
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper
from .utils.geocoding import get_coordinates

logger = logging.getLogger(__name__)

class PapScraper(BaseScraper):

    def extract_address(self, text):
        result = {"street_number": None, "street": None, "postal_code": None, "city": None}
        if not text: return result

        # 1. Full address: 12 rue de Rivoli, 75001 Paris
        full_match = re.search(r'(\d+\s*(?:bis|ter)?)\s*,?\s*((?:rue|avenue|boulevard|bd|av|place|impasse|passage|allée|chemin|quai|cours|square|villa|cité|voie)\s+[A-ZÀ-Üa-zà-ÿ\s\-\'\d]+?)\s*,?\s*(\d{5})\s+([A-ZÀ-Üa-zà-ÿ\s\-]+)', text, re.IGNORECASE)
        if full_match:
            result["street_number"] = full_match.group(1).strip()
            result["street"] = full_match.group(2).strip()
            result["postal_code"] = full_match.group(3)
            result["city"] = full_match.group(4).strip()
            return result

        # 2. Address without number: rue de Rivoli, 75001 Paris
        no_num_match = re.search(r'((?:rue|avenue|boulevard|bd|av|place|impasse|passage|allée|chemin|quai|cours|square|villa|cité|voie)\s+[A-ZÀ-Üa-zà-ÿ\s\-\'\d]+?)\s*,?\s*(\d{5})\s+([A-ZÀ-Üa-zà-ÿ\s\-]+)', text, re.IGNORECASE)
        if no_num_match:
            result["street"] = no_num_match.group(1).strip()
            result["postal_code"] = no_num_match.group(2)
            result["city"] = no_num_match.group(3).strip()
            return result

        # 3. PAP style: Paris 11E (75011)
        pap_match = re.search(r'([A-ZÀ-Üa-zà-ÿ\-\s]+(?:\s*\d+[eE])?)\s*\((\d{5})\)', text)
        if pap_match:
            city_raw = pap_match.group(1).strip()
            result["city"] = re.sub(r'(?i)appartement\s*', '', city_raw).strip()
            result["postal_code"] = pap_match.group(2)
            return result

        # 4. CP + City: 75011 Paris
        cp_match = re.search(r'(\d{5})\s+([A-ZÀ-Üa-zà-ÿ\s\-]+)', text)
        if cp_match:
            result["postal_code"] = cp_match.group(1)
            result["city"] = cp_match.group(2).strip()
            return result

        # 5. Just CP: 75011
        cp_only = re.search(r'\b(\d{5})\b', text)
        if cp_only:
            result["postal_code"] = cp_only.group(1)

        return result

    async def parse(self, html):
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
                if link_el and link_el.has_attr('href'):
                    href = link_el['href']
                    deal["url"] = href if href.startswith("http") else f"https://www.pap.fr{href}"
                else:
                    deal["url"] = ""
                deal["source"] = "PAP.fr"

                # Fetch detail page for full address and coordinates
                address_text = deal["title"]
                lat, lon = None, None
                
                if deal["url"] and "pap.fr" in deal["url"]:
                    try:
                        detail_html = await self.fetch_page(deal["url"])
                        detail_soup = BeautifulSoup(detail_html, 'html.parser')
                        
                        # 1. Extract coordinates from #dialog_carte
                        dialog = detail_soup.find(id="dialog_carte")
                        if dialog:
                            map_div = dialog.find(class_="map-annonce-adresse")
                            if map_div and map_div.has_attr("data-mappy"):
                                try:
                                    mappy_data = json.loads(map_div["data-mappy"])
                                    if "center" in mappy_data and len(mappy_data["center"]) == 2:
                                        lat = float(mappy_data["center"][0])
                                        lon = float(mappy_data["center"][1])
                                        logger.info(f"[{self.name}] Found coordinates in data-mappy: {lat}, {lon}")
                                except Exception as e:
                                    logger.error(f"[{self.name}] Error parsing data-mappy: {e}")

                        # 2. Extract address and property_type from JSON-LD
                        scripts = detail_soup.find_all("script", type="application/ld+json")
                        for script in scripts:
                            try:
                                data = json.loads(script.string)
                                if isinstance(data, dict):
                                    if "address" in data:
                                        addr = data["address"]
                                        street = addr.get("streetAddress", "")
                                        cp = addr.get("postalCode", "")
                                        city = addr.get("addressLocality", "")
                                        address_text = f"{street}, {cp} {city}".strip(", ")
                                        logger.info(f"[{self.name}] Found address in JSON-LD: {address_text}")
                                    
                                    if "additionalProperty" in data:
                                        for prop in data["additionalProperty"]:
                                            if prop.get("name") == "Type de bien":
                                                deal["property_type"] = prop.get("value")
                                                break
                                    break
                            except:
                                continue
                        
                        # Fallback for address_text if JSON-LD failed
                        if address_text == deal["title"]:
                            address_el = detail_soup.select_one(".annonce-adresse, .item-address, .address")
                            if address_el:
                                address_text = address_el.get_text(strip=True)

                    except Exception as e:
                        logger.error(f"[{self.name}] Error fetching detail page {deal['url']}: {e}")

                address_data = self.extract_address(address_text)
                deal["street_number"] = address_data["street_number"]
                deal["street"] = address_data["street"]
                deal["postal_code"] = address_data["postal_code"]
                deal["city"] = address_data["city"]

                # If coordinates not found in HTML, use geocoding
                if lat is None or lon is None:
                    full_address = f"{deal['street_number'] or ''} {deal['street'] or ''}, {deal['postal_code'] or ''} {deal['city'] or ''}".strip(", ")
                    if deal["postal_code"] or deal["city"]:
                        lat, lon = get_coordinates(full_address)
                
                deal["latitude"] = lat
                deal["longitude"] = lon
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
