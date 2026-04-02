import httpx
import logging
import asyncio
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class BaseScraper(ABC):
    def __init__(self, config):
        self.config = config
        self.name = config.get("name", "base")
        self.urls = config.get("urls", [])
        self.selectors = config.get("selectors", {})

    async def fetch_page(self, url):
        """Fetches the HTML content of a page."""
        logger.info(f"[{self.name}] Fetching {url}...")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
        try:
            async with httpx.AsyncClient(timeout=30.0, headers=headers, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.text
        except Exception as e:
            logger.error(f"[{self.name}] Error fetching {url}: {e}")
            return ""

    @abstractmethod
    def parse(self, html):
        """Parses the HTML content and returns a list of deals."""
        pass

    async def save_to_db(self, deals, session):
        """Save deals to database with history tracking."""
        from backend.models import Deal, DealHistory
        
        # Get all existing deals by URL
        existing_deals = {deal.url: deal for deal in session.query(Deal).all()}
        
        # Track URLs from current scrape
        current_urls = set()
        
        for deal_data in deals:
            current_urls.add(deal_data['url'])
            
            if deal_data['url'] in existing_deals:
                # Existing deal - check for changes
                deal = existing_deals[deal_data['url']]
                if deal.price != deal_data['price']:
                    # Price changed - create history
                    session.add(DealHistory(
                        deal_id=deal.id,
                        price=deal_data['price'],
                        available=True
                    ))
                    deal.price = deal_data['price']
            else:
                # New deal
                session.add(Deal(
                    **deal_data,
                    is_active=True
                ))
        
        # Mark deals that disappeared as inactive
        for url, deal in existing_deals.items():
            if url not in current_urls and deal.is_active:
                session.add(DealHistory(
                    deal_id=deal.id,
                    price=deal.price,
                    available=False
                ))
                deal.is_active = False
        
        session.commit()

    async def run(self):
        """Runs the scraper for all configured URLs."""
        all_deals = []
        for url in self.urls:
            html = await self.fetch_page(url)
            if html:
                deals = self.parse(html)
                all_deals.extend(deals)
        return all_deals
