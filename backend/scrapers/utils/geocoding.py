from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import logging

logger = logging.getLogger(__name__)

geolocator = Nominatim(user_agent="antigravity-proto/1.0")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=2)


def get_coordinates(address: str):
    """Géocode une adresse via Nominatim avec rate-limiting (2 s min entre requêtes)."""
    try:
        location = geocode(address)
        if location:
            return location.latitude, location.longitude
        else:
            logger.warning(f"Géocodage échoué pour : {address}")
            return None, None
    except Exception as e:
        logger.error(f"Erreur géocodage : {e}")
        return None, None
