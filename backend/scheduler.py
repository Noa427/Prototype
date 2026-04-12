import os
import yaml
import logging
import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlmodel import Session, select
from .database import engine
from .scrapers.pap_scraper import PapScraper
from .services.rental_yield import update_yield_for_deal, update_all_yields
from .services.scoring import update_score_for_deal_deepseek, update_all_scores_deepseek
from .services.alert_service import check_new_deals_for_alerts
from .models import Deal

logger = logging.getLogger(__name__)

def run_pap_scraper_job():
    """Fonction exécutée périodiquement pour scraper PAP."""
    logger.info("--- [SCHEDULER] Démarrage du scraping PAP planifié ---")
    try:
        # Charger la configuration du scraper
        base_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(base_dir, "scrapers", "config", "pap.yaml")
        
        if not os.path.exists(config_path):
            logger.error(f"[SCHEDULER] Fichier de config non trouvé : {config_path}")
            return

        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)

        scraper = PapScraper(config)
        
        # Exécuter le scraper (async)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            deals = loop.run_until_complete(scraper.run())
        finally:
            loop.close()
            
        logger.info(f"[SCHEDULER] Scraping terminé : {len(deals)} deals trouvés")

        # Sauvegarder en base et enrichir
        if deals:
            with Session(engine) as session:
                scraper.save_to_db(deals, session)
                logger.info("[SCHEDULER] Sauvegarde en base réussie")
                
                # Enrichissement (rendement, score, alertes)
                db_deals = []
                for d in deals:
                    statement = select(Deal).where(Deal.url == d['url'])
                    db_deal = session.exec(statement).first()
                    if db_deal:
                        update_yield_for_deal(db_deal, session)
                        # On relance une boucle pour l'async scoring si besoin, 
                        # mais ici on peut faire simple pour le moment ou réutiliser une boucle
                        db_deals.append(db_deal)
                
                session.commit()
                logger.info(f"[SCHEDULER] Enrichissement terminé pour {len(db_deals)} deals")
                
                # Vérifier les alertes
                check_new_deals_for_alerts(session, db_deals)
        else:
            logger.info("[SCHEDULER] Aucun deal trouvé")

    except Exception as e:
        logger.exception(f"[SCHEDULER] Erreur lors du scraping planifié : {e}")

def check_alerts_job():
    """Vérifie les alertes pour les deals récents (dernières 24h)."""
    logger.info("--- [SCHEDULER] Vérification des alertes ---")
    try:
        with Session(engine) as session:
            # Récupérer les deals récents
            from datetime import datetime, timedelta
            yesterday = datetime.utcnow() - timedelta(days=1)
            statement = select(Deal).where(Deal.timestamp >= yesterday)
            recent_deals = session.exec(statement).all()
            
            if recent_deals:
                check_new_deals_for_alerts(session, recent_deals)
                logger.info(f"[SCHEDULER] Vérification terminée pour {len(recent_deals)} deals")
            else:
                logger.info("[SCHEDULER] Aucun deal récent à vérifier")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur lors de la vérification des alertes : {e}")

scheduler = BackgroundScheduler()

def start_scheduler():
    """Démarre le scheduler avec la tâche périodique."""
    if not scheduler.running:
        # Exécute toutes les 6 heures
        scheduler.add_job(
            run_pap_scraper_job,
            trigger=IntervalTrigger(hours=6),
            id="pap_scraper_job",
            replace_existing=True
        )
        
        # Vérification des alertes toutes les 15 minutes
        scheduler.add_job(
            check_alerts_job,
            trigger=IntervalTrigger(minutes=15),
            id="check_alerts_job",
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("[SCHEDULER] Scheduler démarré - scraping PAP (6h) et alertes (15min)")

def shutdown_scheduler():
    """Arrête le scheduler proprement."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[SCHEDULER] Scheduler arrêté")

# Alias pour compatibilité si besoin
def stop_scheduler():
    shutdown_scheduler()

def run_all_scrapers():
    run_pap_scraper_job()
