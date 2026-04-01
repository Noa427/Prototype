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

    def save(self, deals):
        """Optional method to save deals."""
        logger.info(f"[{self.name}] Saving {len(deals)} deals...")
        # Implementation can be added here or in subclasses

    async def run(self):
        """Runs the scraper for all configured URLs."""
        all_deals = []
        for url in self.urls:
            html = await self.fetch_page(url)
            if html:
                deals = self.parse(html)
                all_deals.extend(deals)
        
        if all_deals:
            self.save(all_deals)
        
        return all_deals
