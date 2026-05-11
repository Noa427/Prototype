"""
Scraper automobile LeBonCoin.
Réutilise le pattern __NEXT_DATA__ de LeboncoinScraper, adapté aux annonces voitures.
"""
import json
import logging
import re
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class AutoScraper(BaseScraper):
    """Scraper pour les annonces automobiles LeBonCoin."""

    def _extract_next_data(self, html: str) -> dict:
        soup = BeautifulSoup(html, "lxml")
        tag = soup.find("script", id="__NEXT_DATA__")
        if tag:
            try:
                return json.loads(tag.string)
            except Exception:
                pass
        return {}

    def _parse_ad(self, ad: dict) -> dict | None:
        try:
            attrs = {a["key"]: a.get("value_label") or a.get("values", [None])[0]
                     for a in ad.get("attributes", [])}

            price_raw = ad.get("price", [None])
            price = int(price_raw[0]) if price_raw else None

            mileage_raw = attrs.get("mileage")
            mileage = int(re.sub(r"\D", "", str(mileage_raw))) if mileage_raw else None

            year_raw = attrs.get("regdate")
            year = int(str(year_raw)[:4]) if year_raw else None

            brand = attrs.get("brand") or attrs.get("u_car_brand")
            model = attrs.get("model") or attrs.get("u_car_model")

            location = ad.get("location", {})
            city = location.get("city")
            postal_code = location.get("zipcode")

            images = [img.get("url", "") for img in ad.get("images", {}).get("urls_large", [])]

            return {
                "vertical": "auto",
                "url": f"https://www.leboncoin.fr/voitures/{ad.get('list_id')}.htm",
                "map_query": ad.get("subject", ""),
                "description": ad.get("body", ""),
                "price": price,
                "city": city,
                "postal_code": postal_code,
                "brand": brand,
                "model_name": model,
                "mileage": mileage,
                "year": year,
                "photos": images[:5],
                "property_type": "voiture",
            }
        except Exception as e:
            logger.debug(f"[auto_scraper] Skip ad: {e}")
            return None

    async def parse(self, html: str) -> list[dict]:
        data = self._extract_next_data(html)
        ads = (
            data.get("props", {})
            .get("pageProps", {})
            .get("searchData", {})
            .get("ads", [])
        )
        results = []
        for ad in ads:
            parsed = self._parse_ad(ad)
            if parsed and parsed.get("url") and parsed.get("price"):
                results.append(parsed)
        logger.info(f"[auto_scraper] Parsed {len(results)} valid ads from {len(ads)} total")
        return results
