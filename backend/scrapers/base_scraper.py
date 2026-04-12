import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import httpx
import logging
from abc import ABC, abstractmethod
from backend.models import Deal, DealHistory

logger = logging.getLogger(__name__)

class BaseScraper(ABC):
    def __init__(self, config):
        self.config = config
        self.name = config.get("name", "base")
        self.urls = config.get("urls", [])
        self.selectors = config.get("selectors", {})

    async def fetch_page(self, url):
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr,fr-FR;q=0.8,en;q=0.6',
            'Referer': 'https://www.pap.fr/',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text

    @abstractmethod
    async def parse(self, html):
        pass

    async def run(self):
        logger.info(f"[{self.name}] Starting scraping...")
        all_deals = []
        for url in self.urls:
            try:
                html = await self.fetch_page(url)
                deals = await self.parse(html)
                all_deals.extend(deals)
            except Exception as e:
                logger.error(f"[{self.name}] Error fetching {url}: {e}")
        logger.info(f"[{self.name}] Found {len(all_deals)} deals")
        return all_deals

    def save_to_db(self, deals, session):
        existing = {d.url: d for d in session.query(Deal).all()}
        current_urls = set()
        for deal_data in deals:
            current_urls.add(deal_data['url'])
            if deal_data['url'] in existing:
                deal = existing[deal_data['url']]
                if deal.price != deal_data['price']:
                    session.add(DealHistory(
                        deal_id=deal.id,
                        price=deal_data['price'],
                        available=True
                    ))
                    deal.price = deal_data['price']
            else:
                session.add(Deal(**deal_data, is_active=True))
        for url, deal in existing.items():
            if url not in current_urls and deal.is_active:
                session.add(DealHistory(
                    deal_id=deal.id,
                    price=deal.price,
                    available=False
                ))
                deal.is_active = False
        session.commit()
