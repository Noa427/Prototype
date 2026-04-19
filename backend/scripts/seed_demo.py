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
from backend.models import Agency, User, Deal, Lead, Notification, Campaign, Alert
from backend.auth import get_password_hash

DEMO_AGENCY_NAME = "Agence Dupont Immobilier"
DEMO_EMAIL = "agent@demo-aevum.fr"
DEMO_PASSWORD = "Demo2026!"

_NOW = datetime.utcnow()


def _ago(days: int) -> datetime:
    return _NOW - timedelta(days=days)


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
    # Lues
    {"message": "Lead non contacté depuis 7 jours : Sophie Blanc", "is_read": True, "deal_idx": 3},
    {"message": "Nouvelle baisse de prix : Maison Caluire -12 000€", "is_read": True, "deal_idx": 10},
    {"message": "Score mis à jour : 3 biens recalculés automatiquement", "is_read": True, "deal_idx": None},
    {"message": "Rapport mensuel disponible — Agence Dupont Immobilier", "is_read": True, "deal_idx": None},
    {"message": "Campagne 'Nouveautés Mai 2026' envoyée à 8 leads avec succès", "is_read": True, "deal_idx": None},
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
        "label": "Biens coup de cœur semaine",
        "message": "Cette semaine, notre sélection coup de cœur : des biens d'exception à des prix attractifs. Contactez-nous vite !",
        "leads_ids": [],
        "type": "email",
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


def reset_demo(session: Session) -> None:
    agency = session.exec(
        select(Agency).where(Agency.name == DEMO_AGENCY_NAME)
    ).first()
    if not agency:
        return

    users = session.exec(
        select(User).where(User.agency_id == agency.id)
    ).all()

    for user in users:
        for lead in session.exec(select(Lead).where(Lead.assigned_to == user.id)).all():
            session.delete(lead)
        for alert in session.exec(select(Alert).where(Alert.user_id == user.id)).all():
            session.delete(alert)
        for notif in session.exec(select(Notification).where(Notification.user_id == user.id)).all():
            session.delete(notif)

    all_camps = session.exec(select(Campaign)).all()
    demo_labels = {"Nouveautés Mai 2026", "Relance prospects tièdes", "Biens coup de cœur semaine"}
    for c in all_camps:
        try:
            meta = json.loads(c.name)
            if meta.get("label") in demo_labels:
                session.delete(c)
        except (json.JSONDecodeError, TypeError):
            if c.name in demo_labels:
                session.delete(c)

    deals = session.exec(
        select(Deal).where(Deal.agency_id == agency.id)
    ).all()
    for deal in deals:
        for lead in session.exec(select(Lead).where(Lead.deal_id == deal.id)).all():
            session.delete(lead)
        session.delete(deal)

    for user in users:
        session.delete(user)

    session.delete(agency)
    session.commit()
    print("🗑️  Données démo supprimées.")


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

        # --- User agent ---
        agent = User(
            username="thomas.dupont",
            full_name="Thomas Dupont",
            email=DEMO_EMAIL,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            role="client",
            is_active=True,
            agency_id=agency.id,
        )
        session.add(agent)
        session.flush()

        # --- Deals ---
        created_deals: list[Deal] = []
        for d in DEALS_DATA:
            deal = Deal(agency_id=agency.id, **d)
            session.add(deal)
            session.flush()
            created_deals.append(deal)

        # --- Leads ---
        for ld in LEADS_DATA:
            ld_copy = dict(ld)
            deal_idx = ld_copy.pop("deal_idx")
            days_ago = ld_copy.pop("days_ago")
            lead = Lead(
                deal_id=created_deals[deal_idx].id,
                assigned_to=agent.id,
                created_at=now - timedelta(days=days_ago),
                **ld_copy,
            )
            session.add(lead)

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

    sep = "━" * 27
    print("✅ Agence démo créée")
    print(f"✅ {n_deals} deals insérés")
    print(f"✅ {n_leads} leads insérés")
    print(f"✅ {n_notifs} notifications insérées")
    print(f"✅ {n_camps} campagnes insérées")
    print(f"✅ {n_alerts} alertes insérées")
    print(sep)
    print(f"URL app     : http://localhost:5173")
    print(f"Email       : {DEMO_EMAIL}")
    print(f"Password    : {DEMO_PASSWORD}")
    print(sep)


if __name__ == "__main__":
    seed_demo()
