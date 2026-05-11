"""Tests unitaires pour l'extraction d'adresse, le géocodage et l'enrichissement Overpass.

Tous les appels réseau sont mockés – aucun appel réel n'est effectué.
"""
import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# S'assurer que le projet est dans le path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from backend.scrapers.pap_scraper import PapScraper


class TestExtractAddress(unittest.TestCase):
    """Tests de la méthode extract_address (regex pure, pas d'appel réseau)."""

    def setUp(self):
        self.scraper = PapScraper({"name": "test", "urls": [], "selectors": {}})

    def test_full_address(self):
        text = "Superbe appartement 12 rue de la Paix, 75002 Paris"
        result = self.scraper.extract_address(text)
        self.assertEqual(result["street_number"], "12")
        self.assertEqual(result["street"], "rue de la Paix")
        self.assertEqual(result["postal_code"], "75002")
        self.assertEqual(result["city"], "Paris")

    def test_boulevard(self):
        text = "3 bis boulevard Haussmann 75009 Paris"
        result = self.scraper.extract_address(text)
        self.assertEqual(result["street_number"], "3 bis")
        self.assertEqual(result["postal_code"], "75009")
        self.assertEqual(result["city"], "Paris")

    def test_cp_ville_only(self):
        text = "Appartement lumineux 75015 Paris 15ème"
        result = self.scraper.extract_address(text)
        self.assertEqual(result["postal_code"], "75015")
        self.assertIsNotNone(result["city"])

    def test_no_address(self):
        text = "Bel appartement avec vue"
        result = self.scraper.extract_address(text)
        self.assertIsNone(result["street_number"])
        self.assertIsNone(result["street"])
        self.assertIsNone(result["postal_code"])
        self.assertIsNone(result["city"])

    def test_avenue(self):
        text = "7 avenue des Champs-Élysées, 75008 Paris"
        result = self.scraper.extract_address(text)
        self.assertEqual(result["street_number"], "7")
        self.assertIn("avenue", result["street"])
        self.assertEqual(result["postal_code"], "75008")


class TestGetCoordinatesMocked(unittest.TestCase):
    """Tests du géocodage avec Nominatim mocké."""

    @patch("backend.scrapers.utils.geocoding.geocode")
    def test_success(self, mock_geocode):
        mock_location = MagicMock()
        mock_location.latitude = 48.8698
        mock_location.longitude = 2.3311
        mock_geocode.return_value = mock_location

        from backend.scrapers.utils.geocoding import get_coordinates
        lat, lon = get_coordinates("12 rue de la Paix, 75002 Paris, France")
        self.assertAlmostEqual(lat, 48.8698, places=3)
        self.assertAlmostEqual(lon, 2.3311, places=3)

    @patch("backend.scrapers.utils.geocoding.geocode")
    def test_not_found(self, mock_geocode):
        mock_geocode.return_value = None

        from backend.scrapers.utils.geocoding import get_coordinates
        lat, lon = get_coordinates("adresse inexistante")
        self.assertIsNone(lat)
        self.assertIsNone(lon)


class TestGetNearbyAmenitiesMocked(unittest.TestCase):
    """Tests de l'enrichissement Overpass mocké."""

    @patch("backend.scrapers.utils.overpass.api")
    def test_nearby(self, mock_api):
        mock_node_metro = MagicMock()
        mock_node_metro.tags = {"railway": "station", "name": "Opéra"}
        mock_node_metro.lat = 48.8707
        mock_node_metro.lon = 2.3318

        mock_node_school = MagicMock()
        mock_node_school.tags = {"amenity": "school", "name": "École primaire"}
        mock_node_school.lat = 48.8695
        mock_node_school.lon = 2.3305

        mock_result = MagicMock()
        mock_result.nodes = [mock_node_metro, mock_node_school]
        mock_api.query.return_value = mock_result

        from backend.scrapers.utils.overpass import get_nearby_amenities
        result = get_nearby_amenities(48.8698, 2.3311)
        self.assertEqual(len(result["metros"]), 1)
        self.assertEqual(result["metros"][0]["name"], "Opéra")
        self.assertEqual(len(result["schools"]), 1)
        self.assertEqual(result["schools"][0]["name"], "École primaire")

    @patch("backend.scrapers.utils.overpass.api")
    def test_empty_result(self, mock_api):
        mock_result = MagicMock()
        mock_result.nodes = []
        mock_api.query.return_value = mock_result

        from backend.scrapers.utils.overpass import get_nearby_amenities
        result = get_nearby_amenities(48.8698, 2.3311)
        self.assertEqual(result["metros"], [])
        self.assertEqual(result["schools"], [])


if __name__ == "__main__":
    unittest.main()
