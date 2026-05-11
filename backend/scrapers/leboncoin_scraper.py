import re
import json
import random
import asyncio
import logging

from bs4 import BeautifulSoup

from .base_scraper import BaseScraper
from .utils.geocoding import get_coordinates

logger = logging.getLogger(__name__)


class LeboncoinScraper(BaseScraper):
    """
    Scraper pour Leboncoin – annonces immobilières (vente).

    Leboncoin utilise du rendu côté serveur avec du JSON embarqué dans la page
    (window.__REDACTED_INITIAL_STATE__ ou __NEXT_DATA__). On privilégie
    l'extraction via ce JSON quand il est disponible, avec un fallback HTML
    pour les cas où le structure change.

    Notes anti-blocage :
      - User-Agent Desktop réaliste
      - Délai aléatoire entre requêtes (configurable via YAML)
      - Respect du robots.txt (pas de scraping trop agressif)
    """

    # --- Patterns Regex -------------------------------------------------------

    # Prix : "269 000 €" → 269000
    _RE_PRICE = re.compile(r'([\d\s\u00a0]+)\s*€', re.UNICODE)

    # Surface : "68 m²", "68m2", "68 metres"
    _RE_SURFACE = re.compile(
        r'(\d+(?:[.,]\d+)?)\s*(?:m²|m2|mètres?\s*carrés?|metres?\s*carres?)',
        re.IGNORECASE,
    )

    # Nombre de pièces
    _RE_ROOMS = re.compile(r'(\d+)\s*(?:pièces?|rooms?|p\.)', re.IGNORECASE)

    # Adresse complète : "12 rue de Rivoli, 75001 Paris"
    _RE_FULL_ADDR = re.compile(
        r'(\d+\s*(?:bis|ter)?)\s*,?\s*'
        r'((?:rue|avenue|boulevard|bd|av|place|impasse|passage|allée|chemin|quai'
        r'|cours|square|villa|cité|voie)\s+[A-ZÀ-Üa-zà-ÿ\s\-\'\d]+?)\s*,?\s*'
        r'(\d{5})\s+([A-ZÀ-Üa-zà-ÿ\s\-]+)',
        re.IGNORECASE,
    )

    # Rue sans numéro : "rue de Rivoli, 75001 Paris"
    _RE_STREET_NO_NUM = re.compile(
        r'((?:rue|avenue|boulevard|bd|av|place|impasse|passage|allée|chemin|quai'
        r'|cours|square|villa|cité|voie)\s+[A-ZÀ-Üa-zà-ÿ\s\-\'\d]+?)\s*,?\s*'
        r'(\d{5})\s+([A-ZÀ-Üa-zà-ÿ\s\-]+)',
        re.IGNORECASE,
    )

    # "Paris 11" / "Paris 11e" / "Paris 11ème"
    _RE_PARIS_DISTRICT = re.compile(
        r'Paris\s*(\d{1,2})(?:e|ème|er)?(?:\s*arrondissement)?',
        re.IGNORECASE,
    )

    # Code postal + ville bruts : "75011 Paris"
    _RE_CP_CITY = re.compile(r'(\d{5})\s+([A-ZÀ-Üa-zà-ÿ][A-ZÀ-Üa-zà-ÿ\s\-]+)')

    # Code postal seul
    _RE_CP_ONLY = re.compile(r'\b(\d{5})\b')

    # DPE
    _RE_DPE = re.compile(r'DPE\s*[:\s]*([A-G])', re.IGNORECASE)

    # -------------------------------------------------------------------------

    async def fetch_page(self, url: str) -> str:
        """Override pour ajouter un délai aléatoire et des headers Leboncoin."""
        delay_min = self.config.get('request_delay_min', 2)
        delay_max = self.config.get('request_delay_max', 5)
        await asyncio.sleep(random.uniform(delay_min, delay_max))

        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/124.0.0.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.leboncoin.fr/',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
        }

        import httpx
        async with httpx.AsyncClient(
            headers=headers,
            timeout=30.0,
            follow_redirects=True,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text

    # --- Extraction d'adresse -------------------------------------------------

    def extract_address(self, text: str) -> dict:
        """
        Tente d'extraire, par ordre de précision décroissante :
          1. Adresse complète (numéro + rue + CP + ville)
          2. Rue sans numéro + CP + ville
          3. Paris + arrondissement  → CP synthétique (750XX)
          4. CP + ville
          5. CP seul
        """
        result = {
            'street_number': None,
            'street': None,
            'postal_code': None,
            'city': None,
        }
        if not text:
            return result

        # 1. Adresse complète
        m = self._RE_FULL_ADDR.search(text)
        if m:
            result['street_number'] = m.group(1).strip()
            result['street'] = m.group(2).strip()
            result['postal_code'] = m.group(3)
            result['city'] = m.group(4).strip()
            return result

        # 2. Rue sans numéro
        m = self._RE_STREET_NO_NUM.search(text)
        if m:
            result['street'] = m.group(1).strip()
            result['postal_code'] = m.group(2)
            result['city'] = m.group(3).strip()
            return result

        # 3. Paris NNe (format Leboncoin fréquent)
        m = self._RE_PARIS_DISTRICT.search(text)
        if m:
            district = int(m.group(1))
            result['city'] = f"Paris {district}e Arrondissement"
            # Synthétiser le CP : Paris 1 → 75001, Paris 11 → 75011
            result['postal_code'] = f"750{district:02d}"
            return result

        # 4. CP + ville
        m = self._RE_CP_CITY.search(text)
        if m:
            result['postal_code'] = m.group(1)
            result['city'] = m.group(2).strip()
            return result

        # 5. CP seul
        m = self._RE_CP_ONLY.search(text)
        if m:
            result['postal_code'] = m.group(1)

        return result

    # --- Extraction de surface ------------------------------------------------

    def extract_surface(self, text: str) -> float | None:
        m = self._RE_SURFACE.search(text)
        if m:
            return float(m.group(1).replace(',', '.'))
        return None

    # --- Extraction du nombre de pièces ---------------------------------------

    def extract_rooms(self, text: str) -> int | None:
        m = self._RE_ROOMS.search(text)
        if m:
            return int(m.group(1))
        return None

    # --- Extraction DPE -------------------------------------------------------

    def extract_dpe(self, text: str) -> str | None:
        m = self._RE_DPE.search(text)
        if m:
            return m.group(1).upper()
        return None

    # --- Détection des défauts ------------------------------------------------

    @staticmethod
    def detect_defects(text: str) -> list[str]:
        keywords = [
            'travaux', 'à rénover', 'rénovation', 'vétusté',
            'amiante', 'plomb', 'humidité', 'nuisibles',
            'ravalement', 'copro en procédure',
        ]
        return [kw for kw in keywords if kw in text.lower()]

    # --- Extraction du JSON embarqué ------------------------------------------

    def _extract_json_ads(self, html: str) -> list[dict]:
        """
        Leboncoin injecte les annonces dans __NEXT_DATA__ (JSON).
        On tente de les extraire pour avoir des données structurées.
        """
        soup = BeautifulSoup(html, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        if not script or not script.string:
            return []

        try:
            data = json.loads(script.string)
            # Chemin typique : props > pageProps > searchData > ads
            ads = (
                data.get('props', {})
                    .get('pageProps', {})
                    .get('searchData', {})
                    .get('ads', [])
            )
            return ads if isinstance(ads, list) else []
        except (json.JSONDecodeError, AttributeError):
            return []

    # --- Parse principal ------------------------------------------------------

    async def parse(self, html: str) -> list[dict]:
        deals = []

        # ── Tentative 1 : extraction JSON (plus fiable) ──────────────────────
        json_ads = self._extract_json_ads(html)
        if json_ads:
            logger.info(f"[{self.name}] JSON mode: {len(json_ads)} annonces trouvées")
            for ad in json_ads:
                try:
                    deal = self._parse_json_ad(ad)
                    if deal:
                        deals.append(deal)
                except Exception as e:
                    logger.error(f"[{self.name}] Erreur JSON ad: {e}")
            return deals

        # ── Tentative 2 : fallback HTML ──────────────────────────────────────
        logger.info(f"[{self.name}] HTML fallback mode")
        soup = BeautifulSoup(html, 'html.parser')
        container_selector = self.selectors.get('ad_container', '[data-test-id="ad"]')
        items = soup.select(container_selector)
        logger.info(f"[{self.name}] HTML mode: {len(items)} éléments trouvés")

        for item in items:
            try:
                deal = await self._parse_html_item(item)
                if deal:
                    deals.append(deal)
            except Exception as e:
                logger.error(f"[{self.name}] Erreur HTML item: {e}")

        return deals

    # --- Parser JSON ad -------------------------------------------------------

    def _parse_json_ad(self, ad: dict) -> dict | None:
        """Parse une annonce depuis le JSON __NEXT_DATA__."""
        price_raw = ad.get('price', [None])
        price = price_raw[0] if isinstance(price_raw, list) and price_raw else None
        if not price:
            return None

        url_slug = ad.get('url', '')
        url = f"https://www.leboncoin.fr{url_slug}" if url_slug.startswith('/') else url_slug
        if not url:
            return None

        title = ad.get('subject', 'Annonce immobilière')
        location = ad.get('location', {})
        city = location.get('city', '')
        postal_code = location.get('zipcode', '')
        lat = location.get('lat')
        lon = location.get('lng')

        # Attributs complémentaires
        attributes = {a['key']: a.get('value') for a in ad.get('attributes', [])}
        surface_raw = attributes.get('square', None)
        surface = float(surface_raw) if surface_raw else None
        rooms_raw = attributes.get('rooms', None)
        property_type_raw = attributes.get('real_estate_type', None)

        full_text = f"{title} {city} {postal_code}"

        # Géocodage si coordonnées absentes
        if (lat is None or lon is None) and (postal_code or city):
            address_str = f"{postal_code} {city}".strip()
            lat, lon = get_coordinates(address_str)
            logger.info(f"[{self.name}] Géocodage '{address_str}' → {lat}, {lon}")

        return {
            'url': url,
            'price': int(price),
            'city': city or None,
            'postal_code': postal_code or None,
            'surface': surface,
            'latitude': float(lat) if lat else None,
            'longitude': float(lon) if lon else None,
            'dpe': self.extract_dpe(full_text),
            'description': ad.get('body', ''),
            'photos': [img.get('url', '') for img in ad.get('images', {}).get('urls_large', [])
                       if isinstance(img, dict)] if isinstance(ad.get('images'), dict) else [],
            'amenities': {'metros': [], 'schools': []},
            'property_type': property_type_raw,
            'map_query': f"{postal_code} {city}".strip() or None,
        }

    # --- Parser HTML item (fallback) -----------------------------------------

    async def _parse_html_item(self, item) -> dict | None:
        """Parse une annonce depuis le HTML brut (fallback)."""
        # Prix
        price_el = item.select_one(self.selectors.get('price', '[data-test-id="price"]'))
        if not price_el:
            return None
        price_text = price_el.get_text(' ', strip=True)
        m = self._RE_PRICE.search(price_text)
        if not m:
            return None
        price = int(re.sub(r'\s|\u00a0', '', m.group(1)))
        if price == 0:
            return None

        # Titre
        title_el = item.select_one(self.selectors.get('title', '[data-test-id="ad-title"]'))
        title = title_el.get_text(strip=True) if title_el else 'Annonce immobilière'

        # Lien
        link_el = item.find('a')
        if not link_el or not link_el.get('href'):
            return None
        href = link_el['href']
        url = href if href.startswith('http') else f"https://www.leboncoin.fr{href}"

        # Localisation
        loc_el = item.select_one(self.selectors.get('location', '[data-test-id="ad-location"]'))
        loc_text = loc_el.get_text(strip=True) if loc_el else ''

        # Attributs texte brut
        full_text = item.get_text(' ')
        surface = self.extract_surface(full_text)
        dpe = self.extract_dpe(full_text)

        # Extraction adresse depuis la localisation Leboncoin
        addr = self.extract_address(loc_text or title)
        city = addr['city']
        postal_code = addr['postal_code']

        # Géocodage
        lat, lon = None, None
        address_str = ' '.join(filter(None, [
            addr.get('street_number'), addr.get('street'),
            postal_code, city,
        ])).strip()
        if address_str:
            lat, lon = get_coordinates(address_str)
            logger.info(f"[{self.name}] Géocodage '{address_str}' → {lat}, {lon}")

        return {
            'url': url,
            'price': price,
            'city': city,
            'postal_code': postal_code,
            'street_number': addr['street_number'],
            'street': addr['street'],
            'surface': surface,
            'dpe': dpe,
            'description': '',
            'photos': [],
            'latitude': float(lat) if lat else None,
            'longitude': float(lon) if lon else None,
            'amenities': {'metros': [], 'schools': []},
            'map_query': address_str or None,
        }
