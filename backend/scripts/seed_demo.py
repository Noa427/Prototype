#!/usr/bin/env python3
"""Seed données démo AEVUM — Agence Dupont Immobilier.

Usage:
    python backend/scripts/seed_demo.py          # insert si données absentes
    python backend/scripts/seed_demo.py --reset  # supprime et recrée
"""
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from sqlmodel import Session, select, func as sqlfunc
from backend.database import engine
from backend.models import (
    Agency, User, Deal, Lead, Notification, Campaign, Alert, Mandate,
    CalendarConfig, CalendarBlock, ChannelAccount, ChannelConversation,
    Rental, RentalPayment, RentalDocument, PostSaleStep,
)
from backend.auth import get_password_hash
from backend.services.fernet_utils import encrypt_credentials

DEMO_AGENCY_NAME = "Agence Dupont Immobilier"
DEMO_GERANT_USERNAME = "thomas.dupont"
DEMO_GERANT_EMAIL = "thomas.dupont@agence-demo.fr"
DEMO_AGENT_USERNAME = "julie.martin"
DEMO_AGENT_EMAIL = "julie.martin@agence-demo.fr"
DEMO_PASSWORD = "Demo2026!"
# Alias conservé pour compatibilité reset
DEMO_EMAIL = DEMO_GERANT_EMAIL

SUPERADMIN_USERNAME = "noa.aevum"
SUPERADMIN_EMAIL = "noa.aevum@aevum.io"

_NOW = datetime.utcnow()


def _ago(days: int) -> datetime:
    return _NOW - timedelta(days=days)


EXTRA_AGENCIES_DATA = [
    {
        "name": "Moreau Immobilier",
        "location": "Paris",
        "status": "active",
        "gerant": {"username": "sophie.moreau", "full_name": "Sophie Moreau", "email": "sophie.moreau@moreau-immo.fr"},
        "deals": [
            {"url": "https://demo/moreau-1", "city": "Paris", "district": "Paris 8e", "property_type": "appartement", "price": 780000, "surface": 85.0, "price_per_m2": 9176, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(5)},
            {"url": "https://demo/moreau-2", "city": "Paris", "district": "Paris 16e", "property_type": "appartement", "price": 1200000, "surface": 120.0, "price_per_m2": 10000, "dpe": "B", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(10)},
            {"url": "https://demo/moreau-3", "city": "Paris", "district": "Paris 11e", "property_type": "appartement", "price": 450000, "surface": 58.0, "price_per_m2": 7758, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(15)},
            {"url": "https://demo/moreau-4", "city": "Neuilly-sur-Seine", "district": None, "property_type": "maison", "price": 2100000, "surface": 220.0, "price_per_m2": 9545, "dpe": "A", "aevum_score": 9, "vertical": "immo", "timestamp": _ago(3)},
            {"url": "https://demo/moreau-5", "city": "Paris", "district": "Paris 6e", "property_type": "appartement", "price": 950000, "surface": 75.0, "price_per_m2": 12667, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(20)},
            {"url": "https://demo/moreau-6", "city": "Paris", "district": "Paris 9e", "property_type": "appartement", "price": 620000, "surface": 70.0, "price_per_m2": 8857, "dpe": "E", "aevum_score": 5, "vertical": "immo", "timestamp": _ago(8)},
            {"url": "https://demo/moreau-7", "city": "Levallois-Perret", "district": None, "property_type": "appartement", "price": 580000, "surface": 65.0, "price_per_m2": 8923, "dpe": "B", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(12)},
            {"url": "https://demo/moreau-8", "city": "Paris", "district": "Paris 17e", "property_type": "appartement", "price": 730000, "surface": 80.0, "price_per_m2": 9125, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(25)},
        ],
    },
    {
        "name": "Côte d'Azur Prestige",
        "location": "Nice",
        "status": "active",
        "gerant": {"username": "marc.ferrari", "full_name": "Marc Ferrari", "email": "marc.ferrari@cda-prestige.fr"},
        "deals": [
            {"url": "https://demo/nice-1", "city": "Nice", "district": "Carré d'Or", "property_type": "appartement", "price": 890000, "surface": 95.0, "price_per_m2": 9368, "dpe": "B", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(4)},
            {"url": "https://demo/nice-2", "city": "Cannes", "district": None, "property_type": "appartement", "price": 1400000, "surface": 130.0, "price_per_m2": 10769, "dpe": "A", "aevum_score": 9, "vertical": "immo", "timestamp": _ago(7)},
            {"url": "https://demo/nice-3", "city": "Nice", "district": "Cimiez", "property_type": "maison", "price": 1800000, "surface": 200.0, "price_per_m2": 9000, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(14)},
            {"url": "https://demo/nice-4", "city": "Antibes", "district": None, "property_type": "appartement", "price": 560000, "surface": 68.0, "price_per_m2": 8235, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(18)},
            {"url": "https://demo/nice-5", "city": "Monaco", "district": None, "property_type": "appartement", "price": 3200000, "surface": 110.0, "price_per_m2": 29090, "dpe": "A", "aevum_score": 9, "vertical": "immo", "timestamp": _ago(2)},
        ],
    },
    {
        "name": "Cabinet Rivière",
        "location": "Bordeaux",
        "status": "suspended",
        "gerant": {"username": "claire.riviere", "full_name": "Claire Rivière", "email": "claire.riviere@cabinet-riviere.fr"},
        "deals": [
            {"url": "https://demo/bdx-1", "city": "Bordeaux", "district": "Chartrons", "property_type": "appartement", "price": 380000, "surface": 80.0, "price_per_m2": 4750, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(45)},
            {"url": "https://demo/bdx-2", "city": "Bordeaux", "district": "Bacalan", "property_type": "appartement", "price": 290000, "surface": 65.0, "price_per_m2": 4461, "dpe": "E", "aevum_score": 5, "vertical": "immo", "timestamp": _ago(60)},
            {"url": "https://demo/bdx-3", "city": "Mérignac", "district": None, "property_type": "maison", "price": 450000, "surface": 120.0, "price_per_m2": 3750, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(55)},
        ],
    },
    {
        "name": "Zénith Immo",
        "location": "Marseille",
        "status": "active",
        "gerant": {"username": "david.zenit", "full_name": "David Zénith", "email": "david.zenit@zenith-immo.fr"},
        "deals": [
            {"url": "https://demo/mrs-1", "city": "Marseille", "district": "6e arrondissement", "property_type": "appartement", "price": 420000, "surface": 90.0, "price_per_m2": 4666, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(3)},
            {"url": "https://demo/mrs-2", "city": "Marseille", "district": "Vieux-Port", "property_type": "appartement", "price": 310000, "surface": 65.0, "price_per_m2": 4769, "dpe": "E", "aevum_score": 5, "vertical": "immo", "timestamp": _ago(7)},
            {"url": "https://demo/mrs-3", "city": "Marseille", "district": "Endoume", "property_type": "appartement", "price": 680000, "surface": 110.0, "price_per_m2": 6181, "dpe": "B", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(10)},
            {"url": "https://demo/mrs-4", "city": "Aix-en-Provence", "district": None, "property_type": "maison", "price": 760000, "surface": 160.0, "price_per_m2": 4750, "dpe": "A", "aevum_score": 9, "vertical": "immo", "timestamp": _ago(5)},
            {"url": "https://demo/mrs-5", "city": "Marseille", "district": "Mazargues", "property_type": "appartement", "price": 250000, "surface": 55.0, "price_per_m2": 4545, "dpe": "D", "aevum_score": 5, "vertical": "immo", "timestamp": _ago(15)},
            {"url": "https://demo/mrs-6", "city": "Marseille", "district": "Les Goudes", "property_type": "maison", "price": 890000, "surface": 150.0, "price_per_m2": 5933, "dpe": "C", "aevum_score": 8, "vertical": "immo", "timestamp": _ago(20)},
            {"url": "https://demo/mrs-7", "city": "Cassis", "district": None, "property_type": "maison", "price": 1100000, "surface": 180.0, "price_per_m2": 6111, "dpe": "B", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(12)},
            {"url": "https://demo/mrs-8", "city": "Marseille", "district": "Montredon", "property_type": "appartement", "price": 340000, "surface": 72.0, "price_per_m2": 4722, "dpe": "D", "aevum_score": 6, "vertical": "immo", "timestamp": _ago(25)},
            {"url": "https://demo/mrs-9", "city": "La Ciotat", "district": None, "property_type": "maison", "price": 620000, "surface": 140.0, "price_per_m2": 4428, "dpe": "C", "aevum_score": 7, "vertical": "immo", "timestamp": _ago(30)},
            {"url": "https://demo/mrs-10", "city": "Marseille", "district": "Sainte-Anne", "property_type": "appartement", "price": 290000, "surface": 60.0, "price_per_m2": 4833, "dpe": "E", "aevum_score": 4, "vertical": "immo", "timestamp": _ago(35)},
        ],
    },
]


def _next_monday() -> datetime:
    days_ahead = 7 - _NOW.weekday()
    if _NOW.weekday() == 0:
        days_ahead = 7
    return _NOW + timedelta(days=days_ahead)


DEALS_DATA = [
    # ── Lyon 3e (2 appartements) ──────────────────────────────────────────
    {
        "url": "https://www.pap.fr/annonce/demo-lyon3-t3-clemenceau",
        "city": "Lyon", "district": "Lyon 3e", "property_type": "appartement",
        "price": 238000, "surface": 68.0, "price_per_m2": 3500, "dpe": "D",
        "aevum_score": 7, "vertical": "immo",
        "description": "Bel appart T3 68m² Lyon 3e — Clémenceau\nLumineux au 3e étage sans ascenseur. Cuisine équipée, double séjour, 2 chambres. Cave. Proche métro Saxe-Gambetta.",
        "postal_code": "69003", "latitude": 45.7497, "longitude": 4.8414,
        "estimated_rent": 1020.0, "gross_yield": 5.14,
        "timestamp": _ago(28),
    },
    {
        "url": "https://www.leboncoin.fr/annonce/demo-lyon3-t2-garibaldi",
        "city": "Lyon", "district": "Lyon 3e", "property_type": "appartement",
        "price": 162000, "surface": 44.0, "price_per_m2": 3681, "dpe": "E",
        "aevum_score": 5, "vertical": "immo",
        "description": "T2 44m² Lyon 3e — Garibaldi, idéal investisseur\nBon état général, parquet, cuisine séparée. Charges faibles. Locataire en place possible.",
        "postal_code": "69003", "latitude": 45.7485, "longitude": 4.8430,
        "estimated_rent": 660.0, "gross_yield": 4.89,
        "timestamp": _ago(15),
    },
    # ── Lyon 6e (3 appartements) ──────────────────────────────────────────
    {
        "url": "https://www.bienici.com/annonce/demo-lyon6-t4-foch",
        "city": "Lyon", "district": "Lyon 6e", "property_type": "appartement",
        "price": 472000, "surface": 94.0, "price_per_m2": 5021, "dpe": "C",
        "aevum_score": 9, "vertical": "immo",
        "description": "PÉPITE T4 94m² Lyon 6e — Foch, estimé 18% sous le marché\nRare opportunité. Appartement bourgeois avec moulures, parquet chêne, double séjour 38m². 3 chambres. Cave + parking. Vendeur pressé.",
        "postal_code": "69006", "latitude": 45.7700, "longitude": 4.8510,
        "estimated_rent": 1410.0, "gross_yield": 3.58,
        "timestamp": _ago(3),
    },
    {
        "url": "https://www.pap.fr/annonce/demo-lyon6-t3-brotteaux",
        "city": "Lyon", "district": "Lyon 6e", "property_type": "appartement",
        "price": 326000, "surface": 71.0, "price_per_m2": 4591, "dpe": "B",
        "aevum_score": 8, "vertical": "immo",
        "description": "T3 71m² Lyon 6e — Brotteaux, très bon état\nAppartement rénové en 2022. Cuisine ouverte, 2 chambres spacieuses, salle de bain moderne. Immeuble pierre de taille. Proche Part-Dieu.",
        "postal_code": "69006", "latitude": 45.7685, "longitude": 4.8522,
        "estimated_rent": 1065.0, "gross_yield": 3.92,
        "timestamp": _ago(10),
    },
    {
        "url": "https://www.leboncoin.fr/annonce/demo-lyon6-t2-lafayette",
        "city": "Lyon", "district": "Lyon 6e", "property_type": "appartement",
        "price": 228000, "surface": 51.0, "price_per_m2": 4470, "dpe": "D",
        "aevum_score": 6, "vertical": "immo",
        "description": "T2 51m² Lyon 6e — Lafayette, calme et lumineux\nCour intérieure, double vitrage, cave. Idéal résidence principale ou investissement.",
        "postal_code": "69006", "latitude": 45.7678, "longitude": 4.8497,
        "estimated_rent": 765.0, "gross_yield": 4.03,
        "timestamp": _ago(22),
    },
    # ── Lyon 7e (3 appartements) ──────────────────────────────────────────
    {
        "url": "https://www.bienici.com/annonce/demo-lyon7-t3-gerland",
        "city": "Lyon", "district": "Lyon 7e", "property_type": "appartement",
        "price": 259000, "surface": 65.0, "price_per_m2": 3984, "dpe": "C",
        "aevum_score": 7, "vertical": "immo",
        "description": "T3 65m² Lyon 7e — Gerland, proche tram T1\nBel appartement traversant au 2e étage. Séjour 22m², 2 chambres, balcon 6m². Cave. Quartier en plein essor.",
        "postal_code": "69007", "latitude": 45.7320, "longitude": 4.8310,
        "estimated_rent": 975.0, "gross_yield": 4.52,
        "timestamp": _ago(18),
    },
    {
        "url": "https://www.pap.fr/annonce/demo-lyon7-t4-succession",
        "city": "Lyon", "district": "Lyon 7e", "property_type": "appartement",
        "price": 312000, "surface": 88.0, "price_per_m2": 3545, "dpe": "F",
        "aevum_score": 8, "vertical": "immo",
        "description": "T4 88m² Lyon 7e — SUCCESSION, vente rapide souhaitée\nGrand appartement avec fort potentiel. Travaux de rafraîchissement à prévoir. Prix négociable. 3 chambres, parquet ancien, hauteur sous plafond 3m.",
        "postal_code": "69007", "latitude": 45.7310, "longitude": 4.8290,
        "estimated_rent": 1320.0, "gross_yield": 5.08,
        "timestamp": _ago(5),
    },
    {
        "url": "https://www.leboncoin.fr/annonce/demo-lyon7-t2-jean-jaures",
        "city": "Lyon", "district": "Lyon 7e", "property_type": "appartement",
        "price": 195000, "surface": 47.0, "price_per_m2": 4148, "dpe": "D",
        "aevum_score": 5, "vertical": "immo",
        "description": "T2 47m² Lyon 7e — Jean-Jaurès, bien entretenu\nAppartement fonctionnel proche commerces et transports. Cuisine équipée, cave.",
        "postal_code": "69007", "latitude": 45.7335, "longitude": 4.8325,
        "estimated_rent": 705.0, "gross_yield": 4.34,
        "timestamp": _ago(25),
    },
    # ── Maisons banlieue (4) ──────────────────────────────────────────────
    {
        "url": "https://www.bienici.com/annonce/demo-villeurbanne-maison-1",
        "city": "Villeurbanne", "district": None, "property_type": "maison",
        "price": 398000, "surface": 112.0, "price_per_m2": 3553, "dpe": "D",
        "aevum_score": 7, "vertical": "immo",
        "description": "Maison 112m² Villeurbanne — jardin 280m², garage\nBelle maison de ville sur 2 niveaux. Séjour 30m², cuisine ouverte, 4 chambres, bureau. Garage double. Proche tramway.",
        "postal_code": "69100", "latitude": 45.7716, "longitude": 4.8803,
        "estimated_rent": 1680.0, "gross_yield": 5.06,
        "timestamp": _ago(12),
    },
    {
        "url": "https://www.pap.fr/annonce/demo-villeurbanne-maison-2",
        "city": "Villeurbanne", "district": None, "property_type": "maison",
        "price": 468000, "surface": 128.0, "price_per_m2": 3656, "dpe": "C",
        "aevum_score": 8, "vertical": "immo",
        "description": "Maison 128m² Villeurbanne — rénovée 2021, double garage\nExcellent état. Cuisine Schmidt, salle de bain moderne, 4 chambres + suite parentale. Jardin paysagé 350m².",
        "postal_code": "69100", "latitude": 45.7728, "longitude": 4.8821,
        "estimated_rent": 1920.0, "gross_yield": 4.92,
        "timestamp": _ago(8),
    },
    {
        "url": "https://www.leboncoin.fr/annonce/demo-caluire-maison-depart",
        "city": "Caluire-et-Cuire", "district": None, "property_type": "maison",
        "price": 545000, "surface": 145.0, "price_per_m2": 3758, "dpe": "B",
        "aevum_score": 9, "vertical": "immo",
        "description": "Maison 145m² Caluire — DÉPART RAPIDE, prix négociable\nSuperbe maison familiale avec piscine, 5 chambres, double garage. Mutation professionnelle du propriétaire. À saisir rapidement.",
        "postal_code": "69300", "latitude": 45.8012, "longitude": 4.8480,
        "estimated_rent": 2175.0, "gross_yield": 4.79,
        "timestamp": _ago(2),
    },
    {
        "url": "https://www.bienici.com/annonce/demo-decines-maison",
        "city": "Décines-Charpieu", "district": None, "property_type": "maison",
        "price": 342000, "surface": 98.0, "price_per_m2": 3489, "dpe": "E",
        "aevum_score": 5, "vertical": "immo",
        "description": "Maison 98m² Décines — à rafraîchir, fort potentiel\nMaison de plain-pied avec jardin 400m². 3 chambres, garage. Travaux de modernisation à prévoir. Prix en rapport.",
        "postal_code": "69150", "latitude": 45.7650, "longitude": 4.9650,
        "estimated_rent": 1470.0, "gross_yield": 5.16,
        "timestamp": _ago(20),
    },
    # ── Paris (4 appartements) ────────────────────────────────────────────
    {
        "url": "https://www.pap.fr/annonce/demo-paris11-t3",
        "city": "Paris", "district": "Paris 11e", "property_type": "appartement",
        "price": 648000, "surface": 71.0, "price_per_m2": 9126, "dpe": "D",
        "aevum_score": 6, "vertical": "immo",
        "description": "T3 71m² Paris 11e — République, beau volume\nAppartement haussmannien au 4e étage avec ascenseur. Moulures, parquet, cheminée décorative. Cave.",
        "postal_code": "75011", "latitude": 48.8630, "longitude": 2.3700,
        "estimated_rent": 2130.0, "gross_yield": 3.95,
        "timestamp": _ago(14),
    },
    {
        "url": "https://www.leboncoin.fr/annonce/demo-paris13-t2",
        "city": "Paris", "district": "Paris 13e", "property_type": "appartement",
        "price": 376000, "surface": 42.0, "price_per_m2": 8952, "dpe": "C",
        "aevum_score": 7, "vertical": "immo",
        "description": "T2 42m² Paris 13e — Butte aux Cailles, calme\nAppartement traversant au 3e sans ascenseur. Lumineux, double vitrage, parquet. Proche ligne 7.",
        "postal_code": "75013", "latitude": 48.8320, "longitude": 2.3500,
        "estimated_rent": 1260.0, "gross_yield": 4.02,
        "timestamp": _ago(17),
    },
    {
        "url": "https://www.bienici.com/annonce/demo-paris20-t3",
        "city": "Paris", "district": "Paris 20e", "property_type": "appartement",
        "price": 462000, "surface": 58.0, "price_per_m2": 7965, "dpe": "E",
        "aevum_score": 5, "vertical": "immo",
        "description": "T3 58m² Paris 20e — Belleville, bien exposé\nAppartement plein sud, cuisine ouverte, 2 chambres. Immeuble années 70. Charges modérées.",
        "postal_code": "75020", "latitude": 48.8650, "longitude": 2.3990,
        "estimated_rent": 1740.0, "gross_yield": 4.52,
        "timestamp": _ago(9),
    },
    {
        "url": "https://www.pap.fr/annonce/demo-paris20-t4",
        "city": "Paris", "district": "Paris 20e", "property_type": "appartement",
        "price": 595000, "surface": 78.0, "price_per_m2": 7628, "dpe": "B",
        "aevum_score": 8, "vertical": "immo",
        "description": "T4 78m² Paris 20e — Père-Lachaise, entièrement rénové\nBel appartement années 30 avec cachet. Cuisine Boffi, salle de bain marbre, 3 chambres. Cave + parking.",
        "postal_code": "75020", "latitude": 48.8618, "longitude": 2.3940,
        "estimated_rent": 2340.0, "gross_yield": 4.72,
        "timestamp": _ago(6),
    },
    # ── Studios étudiants Lyon (2) ────────────────────────────────────────
    {
        "url": "https://www.bienici.com/annonce/demo-lyon6-studio",
        "city": "Lyon", "district": "Lyon 6e", "property_type": "studio",
        "price": 92000, "surface": 22.0, "price_per_m2": 4181, "dpe": "F",
        "aevum_score": 4, "vertical": "immo",
        "description": "Studio 22m² Lyon 6e — idéal investissement locatif étudiant\nÀ rénover. Kitchenette, salle d'eau. Résidence avec digicode. Rendement brut potentiel > 7%.",
        "postal_code": "69006", "latitude": 45.7660, "longitude": 4.8505,
        "estimated_rent": 490.0, "gross_yield": 6.39,
        "timestamp": _ago(30),
    },
    {
        "url": "https://www.leboncoin.fr/annonce/demo-lyon3-studio",
        "city": "Lyon", "district": "Lyon 3e", "property_type": "studio",
        "price": 108000, "surface": 26.0, "price_per_m2": 4153, "dpe": "C",
        "aevum_score": 5, "vertical": "immo",
        "description": "Studio 26m² Lyon 3e — Saxe, meublé, bail étudiant\nStudio meublé refait à neuf. Loué 590€/mois. Idéal investisseur clé-en-main. Rendement 6.5%.",
        "postal_code": "69003", "latitude": 45.7502, "longitude": 4.8426,
        "estimated_rent": 590.0, "gross_yield": 6.55,
        "timestamp": _ago(11),
    },
    # ── Biens signal faible (2 supplémentaires) ───────────────────────────
    {
        "url": "https://www.pap.fr/annonce/demo-lyon4-succession",
        "city": "Lyon", "district": "Lyon 4e", "property_type": "appartement",
        "price": 285000, "surface": 74.0, "price_per_m2": 3851, "dpe": "A",
        "aevum_score": 9, "vertical": "immo",
        "description": "T3 74m² Lyon 4e — SUCCESSION, à saisir rapidement\nAppartement avec vue dégagée sur Lyon, exposé sud-ouest. Travaux légers. Vendu par les héritiers, prix en dessous du marché. Rare dans ce secteur prisé.",
        "postal_code": "69004", "latitude": 45.7748, "longitude": 4.8270,
        "estimated_rent": 1110.0, "gross_yield": 4.67,
        "timestamp": _ago(1),
    },
    {
        "url": "https://www.bienici.com/annonce/demo-caluire-depart-imminent",
        "city": "Caluire-et-Cuire", "district": None, "property_type": "maison",
        "price": 412000, "surface": 118.0, "price_per_m2": 3491, "dpe": "A",
        "aevum_score": 7, "vertical": "immo",
        "description": "Maison 118m² Caluire — DÉPART IMMINENT, mutation professionnelle\nMaison familiale bien entretenue. 4 chambres, jardin 300m², garage. Propriétaire muté à Bordeaux, cherche vente rapide. Prix ferme.",
        "postal_code": "69300", "latitude": 45.8001, "longitude": 4.8475,
        "estimated_rent": 1770.0, "gross_yield": 5.16,
        "timestamp": _ago(4),
    },
]

# deal_idx = index 0-based dans created_deals
LEADS_DATA = [
    # ── CHAUDS (score_chaleur 8-10) ───────────────────────────────────────
    {
        "full_name": "Marie Lefort", "email": "marie.lefort@gmail.com",
        "phone": "06 12 34 56 78", "budget": 350000, "apport": 60000,
        "delay": "immédiat", "status": "offre", "score_chaleur": 9,
        "notes": "Accord bancaire reçu le 10/04. Offre déposée à 465 000€. Très motivée.",
        "deal_idx": 2, "days_ago": 45,
    },
    {
        "full_name": "Jean-Pierre Martin", "email": "jeanpierre.martin@outlook.fr",
        "phone": "07 23 45 67 89", "budget": 420000, "apport": 80000,
        "delay": "immédiat", "status": "rdv_pris", "score_chaleur": 8,
        "notes": "RDV vendredi 14h. Cherche maison avec jardin, financement OK.",
        "deal_idx": 9, "days_ago": 30,
    },
    {
        "full_name": "Sophie Blanc", "email": "sophie.blanc@gmail.com",
        "phone": "06 34 56 78 90", "budget": 280000, "apport": 45000,
        "delay": "immédiat", "status": "signé", "score_chaleur": 10,
        "notes": "Compromis signé le 12/04. Dossier complet, notaire saisi.",
        "deal_idx": 3, "days_ago": 58,
    },
    {
        "full_name": "Luc Arnaud", "email": "luc.arnaud@gmail.com",
        "phone": "07 45 67 89 01", "budget": 500000, "apport": 100000,
        "delay": "3 mois", "status": "offre", "score_chaleur": 9,
        "notes": "Offre à 528 000€. En attente réponse vendeur sous 48h.",
        "deal_idx": 10, "days_ago": 20,
    },
    {
        "full_name": "Camille Rousseau", "email": "camille.rousseau@outlook.fr",
        "phone": "06 56 78 90 12", "budget": 240000, "apport": 40000,
        "delay": "immédiat", "status": "rdv_pris", "score_chaleur": 8,
        "notes": "Primo-accédant, PTZ validé. Visite confirmée mardi matin.",
        "deal_idx": 18, "days_ago": 15,
    },
    # ── TIÈDES (score_chaleur 4-7) ────────────────────────────────────────
    {
        "full_name": "Thomas Berger", "email": "thomas.berger@gmail.com",
        "phone": "07 67 89 01 23", "budget": 200000, "apport": 30000,
        "delay": "6 mois", "status": "qualified", "score_chaleur": 6,
        "notes": "En attente retour banque. Rappeler après le 25/04.",
        "deal_idx": 0, "days_ago": 25,
    },
    {
        "full_name": "Isabelle Faure", "email": "isabelle.faure@gmail.com",
        "phone": "06 78 90 12 34", "budget": 320000, "apport": 55000,
        "delay": "3 mois", "status": "contacted", "score_chaleur": 5,
        "notes": "A visité 2 biens, encore indécise. Préfère secteur Lyon 6e.",
        "deal_idx": 4, "days_ago": 40,
    },
    {
        "full_name": "Franck Dupuis", "email": "franck.dupuis@outlook.fr",
        "phone": "07 89 01 23 45", "budget": 380000, "apport": 70000,
        "delay": "6 mois", "status": "qualified", "score_chaleur": 7,
        "notes": "Divorce en cours. Cherche maison banlieue nord de Lyon.",
        "deal_idx": 8, "days_ago": 50,
    },
    {
        "full_name": "Nathalie Morel", "email": "nathalie.morel@gmail.com",
        "phone": "06 90 12 34 56", "budget": 160000, "apport": 25000,
        "delay": "6 mois", "status": "contacted", "score_chaleur": 4,
        "notes": "Budget serré. Cherche T2 ou studio. Rappeler vendredi.",
        "deal_idx": 17, "days_ago": 35,
    },
    {
        "full_name": "Pierre Legrand", "email": "pierre.legrand@outlook.fr",
        "phone": "07 01 23 45 67", "budget": 450000, "apport": 90000,
        "delay": "3 mois", "status": "qualified", "score_chaleur": 6,
        "notes": "Mutation pro à Lyon depuis Paris. Cherche 4 pièces minimum.",
        "deal_idx": 15, "days_ago": 28,
    },
    # ── FROIDS (score_chaleur 1-3) ────────────────────────────────────────
    {
        "full_name": "Laura Simon", "email": "laura.simon@gmail.com",
        "phone": "06 11 22 33 44", "budget": 180000, "apport": 20000,
        "delay": "1 an", "status": "new", "score_chaleur": 2,
        "notes": "Premier contact par formulaire. Pas encore de financement.",
        "deal_idx": 1, "days_ago": 5,
    },
    {
        "full_name": "Antoine Petit", "email": "antoine.petit@gmail.com",
        "phone": "07 22 33 44 55", "budget": 250000, "apport": 35000,
        "delay": "1 an", "status": "new", "score_chaleur": 1,
        "notes": "Curieux, pas pressé. À recontacter dans 6 mois minimum.",
        "deal_idx": 5, "days_ago": 3,
    },
    {
        "full_name": "Émilie Garnier", "email": "emilie.garnier@outlook.fr",
        "phone": "06 33 44 55 66", "budget": 300000, "apport": 50000,
        "delay": "1 an", "status": "contacted", "score_chaleur": 3,
        "notes": "A demandé des infos par email. Pas de rappel depuis 3 semaines.",
        "deal_idx": 12, "days_ago": 60,
    },
    {
        "full_name": "Marc Renaud", "email": "marc.renaud@gmail.com",
        "phone": "07 44 55 66 77", "budget": 150000, "apport": 15000,
        "delay": "1 an", "status": "new", "score_chaleur": 2,
        "notes": "Cherche pour parents. Très tôt dans la réflexion.",
        "deal_idx": 16, "days_ago": 8,
    },
    {
        "full_name": "Julie Mercier", "email": "julie.mercier@outlook.fr",
        "phone": "06 55 66 77 88", "budget": 390000, "apport": 65000,
        "delay": "1 an", "status": "contacted", "score_chaleur": 3,
        "notes": "Vue annonce sur LBC. Quelques questions. Pas encore décidée.",
        "deal_idx": 19, "days_ago": 12,
    },
]

# deal_idx = index 0-based dans created_deals, None pour notif standalone
NOTIFICATIONS_DATA = [
    # Non-lues (badge visible)
    {"message": "Nouveau lead chaud détecté : Marie Lefort, score 9/10", "is_read": False, "deal_idx": 2},
    {"message": "Pépite détectée : T4 Lyon 6e Foch, estimé 18% sous le marché", "is_read": False, "deal_idx": 2},
    {"message": "RDV confirmé : Jean-Pierre Martin, vendredi 14h — Villeurbanne", "is_read": False, "deal_idx": 9},
    {"message": "Loyer impayé : Appartement rue Garibaldi — locataire Claire Fontaine", "is_read": False, "deal_idx": None},
    {"message": "Nouveau message WhatsApp de +33 6 45 23 67 89 — prospect Lyon 6e", "is_read": False, "deal_idx": None},
    # Lues
    {"message": "Lead non contacté depuis 7 jours : Sophie Blanc", "is_read": True, "deal_idx": 3},
    {"message": "Nouvelle baisse de prix : Maison Caluire -12 000€", "is_read": True, "deal_idx": 10},
    {"message": "Score mis à jour : 3 biens recalculés automatiquement", "is_read": True, "deal_idx": None},
    {"message": "Rapport mensuel disponible — Agence Dupont Immobilier", "is_read": True, "deal_idx": None},
    {"message": "Campagne 'Nouveautés Mai 2026' envoyée à 8 leads avec succès", "is_read": True, "deal_idx": None},
    {"message": "Mandat n°7 expire dans 15 jours : Maison Villeurbanne — Sylvie Moreau", "is_read": True, "deal_idx": None},
    {"message": "Signature complétée : Sophie Blanc — Compromis T3 Lyon 6e Brotteaux", "is_read": True, "deal_idx": 3},
]

CAMPAIGNS_DATA = [
    {
        "label": "Nouveautés Mai 2026",
        "message": "Découvrez nos dernières opportunités immobilières sélectionnées ce mois-ci par votre agent Thomas Dupont.",
        "leads_ids": [],
        "type": "email",
        "status": "sent",
        "scheduled_at": None,
    },
    {
        "label": "Relance prospects tièdes",
        "message": "Vous avez récemment manifesté votre intérêt pour un bien immobilier. Nous avons de nouvelles opportunités qui pourraient vous correspondre.",
        "leads_ids": [],
        "type": "email",
        "status": "draft",
        "scheduled_at": None,
    },
    {
        "label": "Offres exceptionnelles semaine",
        "message": "Cette semaine, notre sélection coup de cœur : des biens d'exception à des prix attractifs. Contactez-nous vite !",
        "leads_ids": [],
        "type": "sms",
        "status": "scheduled",
        "scheduled_at": None,  # remplacé par demain 09:00 lors de l'insertion
    },
]

ALERTS_DATA = [
    {"query": "Lyon 6e appartement", "max_price": 350000, "min_surface": 60.0, "min_price": None},
    {"query": "Villeurbanne maison", "max_price": 500000, "min_surface": None, "min_price": None},
    {"query": "Score AEVUM élevé tous secteurs", "max_price": None, "min_surface": None, "min_price": None},
    {"query": "DPE A ou B Lyon", "max_price": None, "min_surface": None, "min_price": None},
    {"query": "succession départ rapide", "max_price": None, "min_surface": None, "min_price": None},
]

MANDATES_DATA = [
    {
        "mandate_number": 1,
        "mandate_type": "vente",
        "property_address": "12 rue de la Paix, 69003 Lyon",
        "owner_name": "Bernard Lefranc",
        "owner_email": "bernard.lefranc@gmail.com",
        "owner_phone": "06 10 20 30 40",
        "start_date": _ago(60),
        "end_date": _ago(60) + timedelta(days=90),
        "exclusive": True,
        "commission_rate": 3.5,
        "status": "actif",
    },
    {
        "mandate_number": 2,
        "mandate_type": "vente",
        "property_address": "8 avenue Foch, 69006 Lyon",
        "owner_name": "Martine Dubois",
        "owner_email": "martine.dubois@outlook.fr",
        "owner_phone": "07 20 30 40 50",
        "start_date": _ago(45),
        "end_date": _ago(45) + timedelta(days=90),
        "exclusive": False,
        "commission_rate": 3.0,
        "status": "actif",
    },
    {
        "mandate_number": 3,
        "mandate_type": "recherche",
        "property_address": "23 cours Gambetta, 69003 Lyon",
        "owner_name": "Jean-Marc Aubert",
        "owner_email": "jm.aubert@gmail.com",
        "owner_phone": "06 30 40 50 60",
        "start_date": _ago(30),
        "end_date": _ago(30) + timedelta(days=90),
        "exclusive": True,
        "commission_rate": 2.5,
        "status": "actif",
    },
    {
        "mandate_number": 4,
        "mandate_type": "vente",
        "property_address": "5 rue de la République, 69100 Villeurbanne",
        "owner_name": "Sylvie Moreau",
        "owner_email": "sylvie.moreau@gmail.com",
        "owner_phone": "07 40 50 60 70",
        "start_date": _ago(100),
        "end_date": _ago(100) + timedelta(days=90),
        "exclusive": False,
        "commission_rate": 3.0,
        "status": "expiré",
    },
    {
        "mandate_number": 5,
        "mandate_type": "vente",
        "property_address": "17 rue Pierre Corneille, 69006 Lyon",
        "owner_name": "Robert Sanchez",
        "owner_email": "r.sanchez@outlook.fr",
        "owner_phone": "06 50 60 70 80",
        "start_date": _ago(15),
        "end_date": _ago(15) + timedelta(days=90),
        "exclusive": True,
        "commission_rate": 4.0,
        "status": "actif",
    },
    {
        "mandate_number": 6,
        "mandate_type": "location",
        "property_address": "42 rue de Marseille, 69007 Lyon",
        "owner_name": "Christine Lebrun",
        "owner_email": "c.lebrun@gmail.com",
        "owner_phone": "07 60 70 80 90",
        "start_date": _ago(20),
        "end_date": _ago(20) + timedelta(days=90),
        "exclusive": False,
        "commission_rate": 5.0,
        "status": "actif",
    },
    {
        "mandate_number": 7,
        "mandate_type": "vente",
        "property_address": "3 impasse des Lilas, 69100 Villeurbanne",
        "owner_name": "Paul Vigneron",
        "owner_email": "paul.vigneron@outlook.fr",
        "owner_phone": "06 70 80 90 01",
        "start_date": _ago(110),
        "end_date": _ago(110) + timedelta(days=90),
        "exclusive": True,
        "commission_rate": 3.5,
        "status": "expiré",
    },
    {
        "mandate_number": 8,
        "mandate_type": "vente",
        "property_address": "9 rue du Docteur Bouchut, 69007 Lyon",
        "owner_name": "Hélène Garnier",
        "owner_email": "helene.garnier@gmail.com",
        "owner_phone": "07 80 90 01 12",
        "start_date": _ago(90),
        "end_date": _ago(90) + timedelta(days=90),
        "exclusive": True,
        "commission_rate": 3.0,
        "status": "vendu",
    },
]

# lead_idx = index 0-based dans created_leads (après insertion)
SIGNATURES_DATA = [
    {
        "lead_idx": 2,  # Sophie Blanc — signé
        "signature_request_id": "sim-demo-001",
        "signature_status": "signed",
    },
    {
        "lead_idx": 0,  # Marie Lefort — offre
        "signature_request_id": "sim-demo-002",
        "signature_status": "pending",
    },
    {
        "lead_idx": 3,  # Luc Arnaud — offre
        "signature_request_id": "sim-demo-003",
        "signature_status": "pending",
    },
    {
        "lead_idx": 6,  # Isabelle Faure — refusé (Franck Dupuis est assigné à julie.martin)
        "signature_request_id": "sim-demo-004",
        "signature_status": "refused",
    },
]


# ── Nouvelles fonctions seed ──────────────────────────────────────────────────

_POST_SALE_STEPS = [
    "Signature du compromis de vente",
    "Obtention du financement bancaire",
    "Levée des conditions suspensives",
    "Constitution du dossier notarial",
    "Signature de l'acte authentique",
    "Remise des clés",
    "Publication au cadastre",
]
_POST_SALE_OFFSETS = [0, 10, 30, 45, 60, 61, 75]  # jours après base


def seed_rentals(session: Session, agency_id: int, deals: list) -> list:
    tenants = [
        {"name": "Martin Beaulieu", "email": "martin.beaulieu@gmail.com", "phone": "06 11 22 33 44", "rent": 980.0, "deal_idx": 0, "status": "active"},
        {"name": "Claire Fontaine", "email": "claire.fontaine@outlook.fr", "phone": "07 22 33 44 55", "rent": 650.0, "deal_idx": 1, "status": "active"},
        {"name": "Nicolas Vidal", "email": "nicolas.vidal@gmail.com", "phone": "06 33 44 55 66", "rent": 1300.0, "deal_idx": 5, "status": "active"},
        {"name": "Amélie Renard", "email": "amelie.renard@gmail.com", "phone": "07 44 55 66 77", "rent": 590.0, "deal_idx": 16, "status": "terminated"},
        {"name": "Stéphane Moulin", "email": "stephane.moulin@outlook.fr", "phone": "06 55 66 77 88", "rent": 710.0, "deal_idx": 7, "status": "terminated"},
    ]
    created = []
    for t in tenants:
        start = _ago(365) if t["status"] == "active" else _ago(730)
        end = _ago(30) if t["status"] == "terminated" else None
        rental = Rental(
            agency_id=agency_id,
            deal_id=deals[t["deal_idx"]].id,
            tenant_name=t["name"],
            tenant_email=t["email"],
            tenant_phone=t["phone"],
            monthly_rent=t["rent"],
            charges=80.0,
            deposit=t["rent"] * 2,
            start_date=start,
            end_date=end,
            notice_period_days=90,
            status=t["status"],
        )
        session.add(rental)
        created.append(rental)
    session.flush()

    # 6 paiements par bail actif (mix paid/late/pending)
    payment_patterns = [
        ("paid", -5), ("paid", -4), ("paid", -3), ("paid", -2),
        ("late", -1), ("pending", 0),
    ]
    for rental in created[:3]:
        for pay_status, months_offset in payment_patterns:
            base = _NOW.replace(day=1)
            month_date = (base + timedelta(days=32 * months_offset)).replace(day=1)
            paid_date = month_date + timedelta(days=5) if pay_status == "paid" else None
            session.add(RentalPayment(
                rental_id=rental.id,
                month=month_date,
                amount=rental.monthly_rent,
                paid_date=paid_date,
                status=pay_status,
            ))

    # 2 documents par bail
    for rental in created:
        session.add(RentalDocument(
            rental_id=rental.id,
            doc_type="inventory_in",
            file_path=f"/docs/rentals/{rental.id}/etat_lieux_entree.pdf",
        ))
        session.add(RentalDocument(
            rental_id=rental.id,
            doc_type="receipt",
            file_path=f"/docs/rentals/{rental.id}/quittance_mai_2026.pdf",
        ))

    return created


def seed_post_sale(session: Session, deals: list) -> None:
    configs = [
        {"deal_idx": 0, "completed_count": 2},
        {"deal_idx": 3, "completed_count": 5},
        {"deal_idx": 2, "completed_count": 7},
    ]
    for cfg in configs:
        deal = deals[cfg["deal_idx"]]
        base = _ago(75)
        for i, (name, offset) in enumerate(zip(_POST_SALE_STEPS, _POST_SALE_OFFSETS)):
            order = i + 1
            due = base + timedelta(days=offset)
            done = order <= cfg["completed_count"]
            session.add(PostSaleStep(
                deal_id=deal.id,
                step_name=name,
                step_order=order,
                due_date=due,
                completed_date=due - timedelta(days=2) if done else None,
                status="completed" if done else ("overdue" if due < _NOW else "pending"),
                notes=f"Étape {order} validée." if done else None,
            ))


def seed_extra_agencies(session: Session) -> None:
    for ag_data in EXTRA_AGENCIES_DATA:
        agency = Agency(
            name=ag_data["name"],
            location=ag_data["location"],
            status=ag_data["status"],
        )
        session.add(agency)
        session.flush()

        gerant = User(
            username=ag_data["gerant"]["username"],
            full_name=ag_data["gerant"]["full_name"],
            email=ag_data["gerant"]["email"],
            hashed_password=get_password_hash(DEMO_PASSWORD),
            role="gérant",
            is_active=True,
            agency_id=agency.id,
        )
        session.add(gerant)
        session.flush()

        for d in ag_data["deals"]:
            deal = Deal(agency_id=agency.id, **d)
            session.add(deal)
        session.flush()


def seed_calendar_blocks(session: Session, agency_id: int, user_id: int) -> None:
    tomorrow_14h = (_NOW + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)
    next_mon_9h = _next_monday().replace(hour=9, minute=0, second=0, microsecond=0)
    blocks = [
        CalendarBlock(
            agency_id=agency_id, user_id=user_id,
            block_type="vacation",
            start_datetime=datetime(2026, 6, 15, 0, 0),
            end_datetime=datetime(2026, 6, 20, 23, 59),
            reason="Congés d'été",
        ),
        CalendarBlock(
            agency_id=agency_id, user_id=user_id,
            block_type="personal",
            start_datetime=tomorrow_14h,
            end_datetime=tomorrow_14h + timedelta(hours=2),
            reason="Rendez-vous personnel",
        ),
        CalendarBlock(
            agency_id=agency_id, user_id=user_id,
            block_type="appointment",
            start_datetime=next_mon_9h,
            end_datetime=next_mon_9h + timedelta(hours=3),
            reason="Formation gestion locative",
        ),
    ]
    for b in blocks:
        session.add(b)


def seed_channels(session: Session, agency_id: int, user_id: int) -> list:
    accounts_cfg = [
        {
            "channel_type": "whatsapp",
            "phone_number": "+33612345678",
            "email_address": None,
            "credentials": {"simulated": True, "account_sid": "SIM_WA_DEMO_001", "auth_token": "sim_tok_wa_demo"},
        },
        {
            "channel_type": "email",
            "phone_number": None,
            "email_address": "contact@agence-demo.fr",
            "credentials": {"simulated": True, "imap_host": "imap.demo-aevum.fr", "imap_port": 993, "imap_user": "contact@agence-demo.fr", "imap_pass": "sim_demo_pass"},
        },
        {
            "channel_type": "sms",
            "phone_number": "+33698765432",
            "email_address": None,
            "credentials": {"simulated": True, "account_sid": "SIM_SMS_DEMO_001", "auth_token": "sim_tok_sms_demo"},
        },
    ]
    created = []
    for a in accounts_cfg:
        acc = ChannelAccount(
            agency_id=agency_id,
            user_id=user_id,
            channel_type=a["channel_type"],
            credentials_encrypted=encrypt_credentials(a["credentials"]),
            phone_number=a["phone_number"],
            email_address=a["email_address"],
            is_active=True,
            last_sync=_ago(1),
        )
        session.add(acc)
        created.append(acc)
    session.flush()
    return created


def seed_conversations(
    session: Session, agency_id: int, channels: list, leads: list
) -> None:
    wa, email_acc, sms = channels[0], channels[1], channels[2]

    def _ts(days_ago: int, hour: int = 10) -> str:
        return _ago(days_ago).replace(hour=hour, minute=0, second=0, microsecond=0).isoformat()

    convs = [
        # Conv 1 — WhatsApp, lead qualifié, lead_created
        ChannelConversation(
            agency_id=agency_id, channel_account_id=wa.id,
            external_id="whatsapp:+33645236789", sender_identity="+33645236789",
            lead_id=leads[1].id if len(leads) > 1 else None,
            messages=[
                {"role": "user", "content": "Bonjour, l'appartement Lyon 6e est-il disponible ?", "ts": _ts(2, 10)},
                {"role": "assistant", "content": "Bonjour, je suis l'assistant virtuel d'Agence Dupont Immobilier. Oui, il est disponible ! Quel est votre budget d'achat ?", "ts": _ts(2, 10)},
                {"role": "user", "content": "Mon budget est de 480 000€ avec 80 000€ d'apport", "ts": _ts(2, 11)},
                {"role": "assistant", "content": "Excellent projet ! Et quel est votre délai d'achat idéal ?", "ts": _ts(2, 11)},
                {"role": "user", "content": "Je cherche pour cet été, dans les 3 mois maximum", "ts": _ts(2, 14)},
                {"role": "assistant", "content": "Parfait ! Voici des créneaux disponibles :\n• Lundi 14h\n• Mardi 10h\n• Mercredi 11h\nLequel vous convient ?", "ts": _ts(2, 14)},
            ],
            status="lead_created",
            last_message_at=_ago(2),
        ),
        # Conv 2 — Email, prospect froid, active
        ChannelConversation(
            agency_id=agency_id, channel_account_id=email_acc.id,
            external_id="email:prospect-lyon7@exemple.fr", sender_identity="prospect-lyon7@exemple.fr",
            lead_id=None,
            messages=[
                {"role": "user", "content": "Bonjour, avez-vous des biens sous 300 000€ dans Lyon 7e ?", "ts": _ts(1, 9)},
                {"role": "assistant", "content": "Bonjour ! Oui, nous avons plusieurs biens dans ce secteur. Avez-vous un apport disponible pour votre projet ?", "ts": _ts(1, 9)},
            ],
            status="active",
            last_message_at=_ago(1),
        ),
        # Conv 3 — SMS, active, en cours de qualification
        ChannelConversation(
            agency_id=agency_id, channel_account_id=sms.id,
            external_id="+33677889900", sender_identity="+33677889900",
            lead_id=None,
            messages=[
                {"role": "user", "content": "Bonjour info sur T3 Gerland", "ts": _ts(1, 15)},
                {"role": "assistant", "content": "Bonjour ! Le T3 Gerland est à 259 000€, 65m², DPE C. Quel est votre budget pour cet achat ?", "ts": _ts(1, 15)},
                {"role": "user", "content": "Budget 260k apport 40k", "ts": _ts(1, 16)},
                {"role": "assistant", "content": "Bien noté ! Et quel est votre délai d'achat idéal ?", "ts": _ts(1, 16)},
            ],
            status="active",
            last_message_at=_ago(1),
        ),
        # Conv 4 — WhatsApp, active, cherche maison
        ChannelConversation(
            agency_id=agency_id, channel_account_id=wa.id,
            external_id="whatsapp:+33688774455", sender_identity="+33688774455",
            lead_id=None,
            messages=[
                {"role": "user", "content": "Bonjour je cherche une maison pour famille nombreuse secteur Lyon", "ts": _ts(3, 11)},
                {"role": "assistant", "content": "Bonjour ! Nous avons de très belles maisons autour de Lyon. Quel est votre budget d'achat ?", "ts": _ts(3, 11)},
                {"role": "user", "content": "Environ 400 000€", "ts": _ts(3, 11)},
                {"role": "assistant", "content": "Parfait ! Avez-vous un apport disponible ?", "ts": _ts(3, 12)},
            ],
            status="active",
            last_message_at=_ago(3),
        ),
        # Conv 5 — Email, fermée
        ChannelConversation(
            agency_id=agency_id, channel_account_id=email_acc.id,
            external_id="email:ancien-prospect@exemple.fr", sender_identity="ancien-prospect@exemple.fr",
            lead_id=None,
            messages=[
                {"role": "user", "content": "Je ne suis finalement plus intéressé par vos services, merci.", "ts": _ts(5, 10)},
                {"role": "assistant", "content": "Merci pour votre message. N'hésitez pas à nous recontacter si votre projet évolue. Bonne journée !", "ts": _ts(5, 10)},
            ],
            status="closed",
            last_message_at=_ago(5),
        ),
        # Conv 6 — SMS, agent takeover (urgence)
        ChannelConversation(
            agency_id=agency_id, channel_account_id=sms.id,
            external_id="+33601122334", sender_identity="+33601122334",
            lead_id=leads[0].id if leads else None,
            messages=[
                {"role": "user", "content": "Urgence : vendeur veut une réponse ce soir pour le T4 Père-Lachaise", "ts": _ts(0, 17)},
                {"role": "assistant", "content": "Je transmets immédiatement votre message à votre agent. Restez disponible.", "ts": _ts(0, 17)},
                {"role": "user", "content": "Merci, il accepte de baisser à 580 000€", "ts": _ts(0, 17)},
            ],
            status="active",
            agent_takeover=True,
            last_message_at=_NOW,
        ),
    ]
    for c in convs:
        session.add(c)


# ── Reset ─────────────────────────────────────────────────────────────────────

def reset_demo(session: Session) -> None:
    from sqlalchemy import text

    agency = session.exec(
        select(Agency).where(Agency.name == DEMO_AGENCY_NAME)
    ).first()
    if not agency:
        return

    aid = agency.id
    uids = [u.id for u in session.exec(select(User).where(User.agency_id == aid)).all()]
    deal_ids = [d.id for d in session.exec(select(Deal).where(Deal.agency_id == aid)).all()]
    rental_ids = [r.id for r in session.exec(select(Rental).where(Rental.agency_id == aid)).all()]

    conn = session.connection()

    demo_labels = {
        "Nouveautés Mai 2026", "Relance prospects tièdes",
        "Offres exceptionnelles semaine", "Biens coup de cœur semaine",
    }

    def _del(table: str, where: str, params: dict) -> None:
        conn.execute(text(f"DELETE FROM {table} WHERE {where}"), params)

    def _in(ids: list) -> str:
        return f"({','.join(str(i) for i in ids)})" if ids else "(NULL)"

    if rental_ids:
        conn.execute(text(f"DELETE FROM rentalpayment WHERE rental_id IN {_in(rental_ids)}"))
        conn.execute(text(f"DELETE FROM rentaldocument WHERE rental_id IN {_in(rental_ids)}"))

    conn.execute(text(f"DELETE FROM channelconversation WHERE agency_id = {aid}"))
    conn.execute(text(f"DELETE FROM channelaccount WHERE agency_id = {aid}"))

    if uids:
        conn.execute(text(f"DELETE FROM notification WHERE user_id IN {_in(uids)}"))

    if deal_ids:
        conn.execute(text(f"DELETE FROM postsalestep WHERE deal_id IN {_in(deal_ids)}"))
        conn.execute(text(f"DELETE FROM lead WHERE deal_id IN {_in(deal_ids)}"))

    if uids:
        conn.execute(text(f"DELETE FROM lead WHERE assigned_to IN {_in(uids)}"))
        conn.execute(text(f"DELETE FROM alert WHERE user_id IN {_in(uids)}"))
        conn.execute(text(f"DELETE FROM calendarconfig WHERE user_id IN {_in(uids)}"))

    conn.execute(text(f"DELETE FROM calendarblock WHERE agency_id = {aid}"))
    conn.execute(text(f"DELETE FROM rental WHERE agency_id = {aid}"))

    if deal_ids:
        conn.execute(text(f"DELETE FROM deal WHERE id IN {_in(deal_ids)}"))

    conn.execute(text(f"DELETE FROM mandate WHERE agency_id = {aid}"))

    # Campaigns démo (filtrées par label JSON)
    all_camps = session.exec(select(Campaign)).all()
    camp_ids = []
    for c in all_camps:
        try:
            label = json.loads(c.name).get("label", "")
        except (json.JSONDecodeError, TypeError):
            label = c.name
        if label in demo_labels:
            camp_ids.append(c.id)
    if camp_ids:
        conn.execute(text(f"DELETE FROM campaign WHERE id IN {_in(camp_ids)}"))

    if uids:
        conn.execute(text(f"DELETE FROM \"user\" WHERE id IN {_in(uids)}"))

    conn.execute(text(f"DELETE FROM agency WHERE id = {aid}"))

    # Supprimer agences extras + leurs users et deals
    for ag_name in [ag["name"] for ag in EXTRA_AGENCIES_DATA]:
        extra_ag = session.exec(select(Agency).where(Agency.name == ag_name)).first()
        if not extra_ag:
            continue
        extra_deal_ids = [d.id for d in session.exec(select(Deal).where(Deal.agency_id == extra_ag.id)).all()]
        extra_uid = [u.id for u in session.exec(select(User).where(User.agency_id == extra_ag.id)).all()]
        if extra_deal_ids:
            conn.execute(text(f"DELETE FROM deal WHERE id IN {_in(extra_deal_ids)}"))
        if extra_uid:
            conn.execute(text(f'DELETE FROM "user" WHERE id IN {_in(extra_uid)}'))
        conn.execute(text(f"DELETE FROM agency WHERE id = {extra_ag.id}"))

    # Supprimer superadmin
    conn.execute(text(f"DELETE FROM \"user\" WHERE username = '{SUPERADMIN_USERNAME}'"))

    session.commit()
    print("🗑️  Données démo supprimées.")


# ── Seed principal ────────────────────────────────────────────────────────────

def seed_demo() -> None:
    do_reset = "--reset" in sys.argv

    with Session(engine) as session:
        existing = session.exec(
            select(Agency).where(Agency.name == DEMO_AGENCY_NAME)
        ).first()

        if existing and not do_reset:
            print(f"⚠️  Données démo déjà présentes (Agency ID={existing.id}).")
            print("    Relancez avec --reset pour les recréer.")
            return

        if do_reset:
            reset_demo(session)

        now = datetime.utcnow()

        # --- Agency ---
        agency = Agency(
            name=DEMO_AGENCY_NAME,
            location="Lyon",
            status="active",
        )
        session.add(agency)
        session.flush()

        # --- Gérant (manager de l'agence) ---
        agent = User(
            username=DEMO_GERANT_USERNAME,
            full_name="Thomas Dupont",
            email=DEMO_GERANT_EMAIL,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            role="gérant",
            is_active=True,
            agency_id=agency.id,
        )
        session.add(agent)

        # --- Agent (employé standard) ---
        agent2 = User(
            username=DEMO_AGENT_USERNAME,
            full_name="Julie Martin",
            email=DEMO_AGENT_EMAIL,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            role="agent",
            is_active=True,
            agency_id=agency.id,
        )
        session.add(agent2)
        session.flush()

        # --- Superadmin AEVUM ---
        superadmin = User(
            username=SUPERADMIN_USERNAME,
            full_name="Noa AEVUM",
            email=SUPERADMIN_EMAIL,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            role="admin",
            is_active=True,
            agency_id=None,
        )
        session.add(superadmin)
        session.flush()

        # --- Agences supplémentaires (vue superadmin) ---
        seed_extra_agencies(session)

        # --- Deals ---
        created_deals: list[Deal] = []
        for d in DEALS_DATA:
            deal = Deal(agency_id=agency.id, **d)
            session.add(deal)
            session.flush()
            created_deals.append(deal)

        # --- Leads --- leads[0-6] → thomas (gérant), leads[7+] → julie (agent)
        for i, ld in enumerate(LEADS_DATA):
            ld_copy = dict(ld)
            deal_idx = ld_copy.pop("deal_idx")
            days_ago = ld_copy.pop("days_ago")
            assigned = agent2.id if i >= 7 else agent.id
            lead = Lead(
                deal_id=created_deals[deal_idx].id,
                assigned_to=assigned,
                created_at=now - timedelta(days=days_ago),
                **ld_copy,
            )
            session.add(lead)
        session.flush()

        # --- Notifications ---
        for nd in NOTIFICATIONS_DATA:
            nd_copy = dict(nd)
            deal_idx = nd_copy.pop("deal_idx")
            deal_id = created_deals[deal_idx].id if deal_idx is not None else None
            notif = Notification(
                user_id=agent.id,
                deal_id=deal_id,
                **nd_copy,
            )
            session.add(notif)

        # --- Campaigns ---
        tomorrow_9h = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        for cd in CAMPAIGNS_DATA:
            cd_copy = dict(cd)
            label = cd_copy.pop("label")
            leads_ids = cd_copy.pop("leads_ids")
            message = cd_copy.pop("message")
            scheduled_at = tomorrow_9h if cd_copy["status"] == "scheduled" else cd_copy.pop("scheduled_at", None)
            if "scheduled_at" in cd_copy:
                cd_copy.pop("scheduled_at")
            camp = Campaign(
                name=json.dumps({"label": label, "message": message, "leads_ids": leads_ids}),
                scheduled_at=scheduled_at,
                **cd_copy,
            )
            session.add(camp)

        # --- Alerts ---
        for ad in ALERTS_DATA:
            alert = Alert(user_id=agent.id, **ad)
            session.add(alert)

        # --- Mandates ---
        for md in MANDATES_DATA:
            mandate = Mandate(agency_id=agency.id, **md)
            session.add(mandate)

        # --- Signatures sur leads existants ---
        created_leads_list = session.exec(select(Lead).where(Lead.assigned_to == agent.id)).all()
        for sd in SIGNATURES_DATA:
            idx = sd["lead_idx"]
            if idx < len(created_leads_list):
                lead_to_sign = created_leads_list[idx]
                lead_to_sign.signature_request_id = sd["signature_request_id"]
                lead_to_sign.signature_status = sd["signature_status"]
                session.add(lead_to_sign)

        # --- CalendarConfig pour l'agent ---
        cal_cfg = CalendarConfig(
            user_id=agent.id,
            work_days="1,2,3,4,5",
            start_time="09:00",
            end_time="18:00",
            slot_duration=45,
            lunch_start="12:00",
            lunch_end="13:30",
            excluded_dates="",
            calendar_url=None,
        )
        session.add(cal_cfg)

        # --- CalendarBlocks ---
        seed_calendar_blocks(session, agency.id, agent.id)

        # --- Canaux omnicanal ---
        channel_accounts = seed_channels(session, agency.id, agent.id)

        # --- Conversations ---
        all_leads = session.exec(select(Lead).where(Lead.assigned_to == agent.id)).all()
        seed_conversations(session, agency.id, channel_accounts, list(all_leads))

        # --- Gestion locative ---
        seed_rentals(session, agency.id, created_deals)

        # --- Suivi post-compromis ---
        seed_post_sale(session, created_deals)

        session.commit()

    # Compter pour résumé
    with Session(engine) as s:
        agency_db = s.exec(select(Agency).where(Agency.name == DEMO_AGENCY_NAME)).first()
        n_deals = s.exec(select(sqlfunc.count(Deal.id)).where(Deal.agency_id == agency_db.id)).one()
        n_leads = s.exec(select(sqlfunc.count(Lead.id))).one()
        n_notifs = s.exec(select(sqlfunc.count(Notification.id))).one()
        n_camps = s.exec(select(sqlfunc.count(Campaign.id))).one()
        agent_db = s.exec(select(User).where(User.email == DEMO_EMAIL)).first()
        n_alerts = s.exec(select(sqlfunc.count(Alert.id)).where(Alert.user_id == agent_db.id)).one()
        n_mandates = s.exec(select(sqlfunc.count(Mandate.id)).where(Mandate.agency_id == agency_db.id)).one()
        n_rentals = s.exec(select(sqlfunc.count(Rental.id)).where(Rental.agency_id == agency_db.id)).one()
        n_post_sale = s.exec(select(sqlfunc.count(PostSaleStep.id))).one()
        n_blocks = s.exec(select(sqlfunc.count(CalendarBlock.id)).where(CalendarBlock.agency_id == agency_db.id)).one()
        n_channels = s.exec(select(sqlfunc.count(ChannelAccount.id)).where(ChannelAccount.agency_id == agency_db.id)).one()
        n_convs = s.exec(select(sqlfunc.count(ChannelConversation.id)).where(ChannelConversation.agency_id == agency_db.id)).one()

    n_extra_agencies = len(EXTRA_AGENCIES_DATA)
    n_extra_deals = sum(len(ag["deals"]) for ag in EXTRA_AGENCIES_DATA)

    sep = "━" * 27
    print(f"✅ Agence démo créée (Dupont Immobilier)")
    print(f"✅ {n_deals} deals insérés")
    print(f"✅ {n_leads} leads insérés (7 → thomas.dupont / 8 → julie.martin)")
    print(f"✅ {n_rentals} baux locatifs créés (3 actifs, 2 terminés)")
    print(f"✅ 3 suivis post-compromis ({n_post_sale} étapes)")
    print(f"✅ {n_mandates} mandats enregistrés")
    print(f"✅ 4 demandes de signature")
    print(f"✅ {n_camps} campagnes")
    print(f"✅ Calendrier configuré + {n_blocks} blocs d'indisponibilité")
    print(f"✅ {n_channels} canaux connectés (simulation)")
    print(f"✅ {n_convs} conversations omnicanal")
    print(f"✅ {n_notifs} notifications")
    print(f"✅ Superadmin créé : {SUPERADMIN_USERNAME} / {DEMO_PASSWORD}")
    print(f"✅ {n_extra_agencies} agences supplémentaires ({n_extra_deals} deals synthétiques)")
    print(sep)
    print(f"Comptes démo prêts :")
    print(f"  Gérant   : thomas.dupont / {DEMO_PASSWORD}")
    print(f"  Agent    : julie.martin / {DEMO_PASSWORD}")
    print(f"  Superadmin : {SUPERADMIN_USERNAME} / {DEMO_PASSWORD}")
    print(f"  URL      : http://localhost:5173")
    print(sep)


if __name__ == "__main__":
    seed_demo()
