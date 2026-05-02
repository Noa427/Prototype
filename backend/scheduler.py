import os
import yaml
import logging
import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlmodel import Session, select
from .database import engine
from .scrapers.pap_scraper import PapScraper
from .scrapers.leboncoin_scraper import LeboncoinScraper
from .scrapers.auto_scraper import AutoScraper
from .services.rental_yield import update_yield_for_deal, update_all_yields
from .services.scoring import update_score_for_deal_deepseek, update_all_scores_deepseek
from .services.alert_service import check_new_deals_for_alerts
from .models import Deal, Lead, Notification, Agency, Mandate, User, PostSaleStep, ChannelAccount, ChannelConversation

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


def run_leboncoin_scraper_job():
    """Fonction exécutée périodiquement pour scraper Leboncoin."""
    logger.info("--- [SCHEDULER] Démarrage du scraping Leboncoin planifié ---")
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(base_dir, "scrapers", "config", "leboncoin.yaml")

        if not os.path.exists(config_path):
            logger.error(f"[SCHEDULER] Fichier de config non trouvé : {config_path}")
            return

        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)

        scraper = LeboncoinScraper(config)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            deals = loop.run_until_complete(scraper.run())
        finally:
            loop.close()

        logger.info(f"[SCHEDULER] Leboncoin - scraping terminé : {len(deals)} deals trouvés")

        if deals:
            with Session(engine) as session:
                scraper.save_to_db(deals, session)
                logger.info("[SCHEDULER] Leboncoin - sauvegarde en base réussie")

                db_deals = []
                for d in deals:
                    statement = select(Deal).where(Deal.url == d['url'])
                    db_deal = session.exec(statement).first()
                    if db_deal:
                        update_yield_for_deal(db_deal, session)
                        db_deals.append(db_deal)

                session.commit()
                logger.info(f"[SCHEDULER] Leboncoin - enrichissement terminé pour {len(db_deals)} deals")

                check_new_deals_for_alerts(session, db_deals)
        else:
            logger.info("[SCHEDULER] Leboncoin - aucun deal trouvé")

    except Exception as e:
        logger.exception(f"[SCHEDULER] Erreur lors du scraping Leboncoin : {e}")


def relance_leads_job():
    """Leads non contactés depuis 7j → notification en base."""
    logger.info("[SCHEDULER] Vérification relances leads (7j)...")
    try:
        from datetime import datetime, timedelta
        seuil = datetime.utcnow() - timedelta(days=7)
        with Session(engine) as session:
            statement = select(Lead).where(
                Lead.status == "new",
                Lead.created_at <= seuil
            )
            leads = session.exec(statement).all()
            for lead in leads:
                notif = Notification(
                    user_id=lead.assigned_to or 1,
                    deal_id=lead.deal_id,
                    message=f"Relance : {lead.full_name} n'a pas été contacté depuis 7 jours.",
                )
                session.add(notif)
                logger.info(f"[SCHEDULER] Relance lead #{lead.id} ({lead.full_name})")
            session.commit()
            logger.info(f"[SCHEDULER] {len(leads)} relances générées")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur relance leads : {e}")


def suggest_price_drop_job():
    """Biens en ligne depuis 60j → notification suggestion baisse de prix."""
    logger.info("[SCHEDULER] Vérification biens en ligne depuis 60j...")
    try:
        from datetime import datetime, timedelta
        seuil = datetime.utcnow() - timedelta(days=60)
        with Session(engine) as session:
            statement = select(Deal).where(
                Deal.is_active == True,
                Deal.timestamp <= seuil
            )
            deals = session.exec(statement).all()
            for deal in deals:
                notif = Notification(
                    user_id=1,
                    deal_id=deal.id,
                    message=(
                        f"Bien #{deal.id} ({deal.city}) en ligne depuis plus de 60 jours. "
                        f"Prix actuel : {deal.price} €. Suggérer une baisse de prix ?"
                    ),
                )
                session.add(notif)
                logger.info(f"[SCHEDULER] Suggestion baisse prix deal #{deal.id}")
            session.commit()
            logger.info(f"[SCHEDULER] {len(deals)} suggestions générées")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur suggestion prix : {e}")


def dpe_expiry_job():
    """Deals actifs depuis 30j avec DPE F/G → alerte diagnostic."""
    logger.info("[SCHEDULER] Vérification diagnostics DPE anciens (30j)...")
    try:
        from datetime import datetime, timedelta
        seuil = datetime.utcnow() - timedelta(days=30)
        with Session(engine) as session:
            statement = select(Deal).where(
                Deal.is_active == True,
                Deal.timestamp <= seuil,
                Deal.dpe.in_(["F", "G"])
            )
            deals = session.exec(statement).all()
            for deal in deals:
                notif = Notification(
                    user_id=1,
                    deal_id=deal.id,
                    message=(
                        f"Bien #{deal.id} ({deal.city}) — DPE {deal.dpe} : "
                        f"diagnostic énergétique à vérifier ou renouveler."
                    ),
                )
                session.add(notif)
                logger.info(f"[SCHEDULER] Alerte DPE deal #{deal.id} (DPE={deal.dpe})")
            session.commit()
            logger.info(f"[SCHEDULER] {len(deals)} alertes DPE générées")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur alerte DPE : {e}")


def check_heartbeat_staleness_job():
    """Logue les agences dont le heartbeat est absent depuis >2h."""
    logger.info("[SCHEDULER] Vérification staleness heartbeat agences...")
    try:
        from datetime import datetime, timedelta
        threshold = datetime.utcnow() - timedelta(hours=2)
        with Session(engine) as session:
            agencies = session.exec(select(Agency)).all()
            stale = [
                a for a in agencies
                if a.status == "active" and (
                    a.last_heartbeat is None or a.last_heartbeat < threshold
                )
            ]
            for a in stale:
                age = "jamais" if a.last_heartbeat is None else f"{int((datetime.utcnow() - a.last_heartbeat).total_seconds() / 3600)}h"
                logger.warning(f"[HEARTBEAT] Agence #{a.id} '{a.name}' — dernier heartbeat : {age}")
            logger.info(f"[SCHEDULER] {len(stale)} agence(s) avec heartbeat stale")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur check heartbeat : {e}")


def start_scheduler():
    """Démarre le scheduler avec la tâche périodique."""
    if not scheduler.running:
        # PAP – toutes les 6 heures
        scheduler.add_job(
            run_pap_scraper_job,
            trigger=IntervalTrigger(hours=6),
            id="pap_scraper_job",
            replace_existing=True
        )

        # Leboncoin – toutes les 6 heures (décalé de 30 min)
        scheduler.add_job(
            run_leboncoin_scraper_job,
            trigger=IntervalTrigger(hours=6, start_date='2000-01-01 00:30:00'),
            id="leboncoin_scraper_job",
            replace_existing=True
        )

        # Vérification des alertes toutes les 15 minutes
        scheduler.add_job(
            check_alerts_job,
            trigger=IntervalTrigger(minutes=15),
            id="check_alerts_job",
            replace_existing=True
        )

        # Relances métier – quotidien à 9h
        scheduler.add_job(
            relance_leads_job,
            trigger=IntervalTrigger(hours=24),
            id="relance_leads_job",
            replace_existing=True
        )
        scheduler.add_job(
            suggest_price_drop_job,
            trigger=IntervalTrigger(hours=24),
            id="suggest_price_drop_job",
            replace_existing=True
        )
        scheduler.add_job(
            dpe_expiry_job,
            trigger=IntervalTrigger(hours=24),
            id="dpe_expiry_job",
            replace_existing=True
        )

        # Auto scraper – toutes les 12 heures
        scheduler.add_job(
            run_auto_scraper_job,
            trigger=IntervalTrigger(hours=12),
            id="auto_scraper_job",
            replace_existing=True
        )

        # Heartbeat staleness — toutes les 5 min
        scheduler.add_job(
            check_heartbeat_staleness_job,
            trigger=IntervalTrigger(minutes=5),
            id="heartbeat_staleness_job",
            replace_existing=True
        )

        # Mandats expirants — quotidien
        scheduler.add_job(
            mandate_expiry_job,
            trigger=IntervalTrigger(hours=24),
            id="mandate_expiry_job",
            replace_existing=True
        )

        # Gestion locative — 1er du mois 07h00 UTC
        scheduler.add_job(
            generate_monthly_rental_payments_job,
            trigger=CronTrigger(day=1, hour=7, minute=0),
            id="rental_payments_job",
            replace_existing=True,
        )
        # Relances impayés — 5, 10, 15 du mois à 09h00 UTC
        scheduler.add_job(
            lambda: rental_reminder_job(5),
            trigger=CronTrigger(day=5, hour=9, minute=0),
            id="rental_reminder_5_job",
            replace_existing=True,
        )
        scheduler.add_job(
            lambda: rental_reminder_job(10),
            trigger=CronTrigger(day=10, hour=9, minute=0),
            id="rental_reminder_10_job",
            replace_existing=True,
        )
        scheduler.add_job(
            lambda: rental_reminder_job(15),
            trigger=CronTrigger(day=15, hour=9, minute=0),
            id="rental_reminder_15_job",
            replace_existing=True,
        )

        # Post-sale alerts — quotidien 08h00 UTC
        scheduler.add_job(
            post_sale_alerts_job,
            trigger=CronTrigger(hour=8, minute=0),
            id="post_sale_alerts_job",
            replace_existing=True,
        )

        # Email polling — toutes les 5 min
        scheduler.add_job(
            poll_email_inboxes,
            trigger=IntervalTrigger(minutes=5),
            id="email_poll_job",
            replace_existing=True,
        )

        scheduler.start()
        logger.info(
            "[SCHEDULER] Démarré — PAP(6h), Leboncoin(6h+30min), alertes(15min), "
            "relances leads(24h), baisse prix(24h), DPE(24h), heartbeat(5min), "
            "rental_payments(1er mois), rental_reminders(5/10/15), post_sale_alerts(08h), "
            "email_poll(5min)"
        )

def shutdown_scheduler():
    """Arrête le scheduler proprement."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[SCHEDULER] Scheduler arrêté")

# Alias pour compatibilité si besoin
def stop_scheduler():
    shutdown_scheduler()

def run_auto_scraper_job():
    """Scraping annonces automobiles LeBonCoin."""
    logger.info("--- [SCHEDULER] Démarrage scraping Auto ---")
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(base_dir, "scrapers", "config", "leboncoin_auto.yaml")
        if not os.path.exists(config_path):
            logger.error(f"[SCHEDULER] Config auto non trouvée : {config_path}")
            return
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        scraper = AutoScraper(config)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            deals = loop.run_until_complete(scraper.run())
        finally:
            loop.close()
        logger.info(f"[SCHEDULER] Auto scraping terminé : {len(deals)} annonces")
        if deals:
            with Session(engine) as session:
                scraper.save_to_db(deals, session)
                logger.info("[SCHEDULER] Auto - sauvegarde OK")
    except Exception as e:
        logger.exception(f"[SCHEDULER] Erreur scraping auto : {e}")


def mandate_expiry_job():
    """Mandats expirant dans 30 jours → notification aux agents de l'agence."""
    logger.info("[SCHEDULER] Vérification mandats expirants (30j)...")
    try:
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        threshold = now + timedelta(days=30)
        with Session(engine) as session:
            mandates = session.exec(
                select(Mandate).where(
                    Mandate.status == "actif",
                    Mandate.end_date >= now,
                    Mandate.end_date <= threshold,
                )
            ).all()
            for m in mandates:
                days_left = (m.end_date - now).days
                users = session.exec(select(User).where(User.agency_id == m.agency_id)).all()
                for u in users:
                    notif = Notification(
                        user_id=u.id,
                        message=(
                            f"Mandat #{m.mandate_number:04d} — {m.owner_name} "
                            f"expire dans {days_left} jour(s) ({m.end_date.strftime('%d/%m/%Y')})."
                        ),
                    )
                    session.add(notif)
            session.commit()
            logger.info(f"[SCHEDULER] {len(mandates)} mandat(s) proches de l'expiration notifiés")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur mandat expiry : {e}")


def generate_monthly_rental_payments_job():
    """1er du mois : génère les lignes de paiement pour le mois en cours."""
    logger.info("[SCHEDULER] Génération paiements locatifs mensuels...")
    try:
        from datetime import datetime
        from .models import Rental, RentalPayment
        today = datetime.utcnow()
        first_of_month = datetime(today.year, today.month, 1)
        with Session(engine) as session:
            active_rentals = session.exec(
                select(Rental).where(Rental.status == "active")
            ).all()
            created = 0
            for rental in active_rentals:
                exists = session.exec(
                    select(RentalPayment).where(
                        RentalPayment.rental_id == rental.id,
                        RentalPayment.month == first_of_month,
                    )
                ).first()
                if not exists:
                    payment = RentalPayment(
                        rental_id=rental.id,
                        month=first_of_month,
                        amount=rental.monthly_rent + rental.charges,
                    )
                    session.add(payment)
                    created += 1
            session.commit()
            logger.info(f"[SCHEDULER] {created} lignes de paiement créées")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur génération paiements : {e}")


def rental_reminder_job(reminder_type: int):
    """J+N du mois : envoie relances pour loyers impayés du mois précédent."""
    logger.info(f"[SCHEDULER] Relances impayés J+{reminder_type}...")
    try:
        from datetime import datetime
        from .models import Rental, RentalPayment
        from .services.rental_service import send_payment_reminder
        today = datetime.utcnow()
        if today.month == 1:
            target_month = datetime(today.year - 1, 12, 1)
        else:
            target_month = datetime(today.year, today.month - 1, 1)
        with Session(engine) as session:
            late_payments = session.exec(
                select(RentalPayment).where(
                    RentalPayment.month == target_month,
                    RentalPayment.status.in_(["pending", "late"]),
                )
            ).all()
            for payment in late_payments:
                rental = session.get(Rental, payment.rental_id)
                if rental and rental.status == "active":
                    key = f"J+{reminder_type}"
                    already_sent = any(key in d for d in (payment.reminder_sent_dates or []))
                    if not already_sent:
                        send_payment_reminder(rental, payment, reminder_type)
                        dates = list(payment.reminder_sent_dates or [])
                        dates.append(f"{key}:{datetime.utcnow().isoformat()}")
                        payment.reminder_sent_dates = dates
                        payment.status = "late"
                        session.add(payment)
                        notif = Notification(
                            user_id=1,
                            message=f"Loyer impayé J+{reminder_type} : {rental.tenant_name} "
                                    f"({rental.monthly_rent + rental.charges:.0f} €/mois) — relance envoyée.",
                        )
                        session.add(notif)
            session.commit()
            logger.info(f"[SCHEDULER] Relances J+{reminder_type} envoyées pour {len(late_payments)} paiements")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur relances J+{reminder_type} : {e}")


def post_sale_alerts_job():
    """Quotidien 08h00 : notifications J-7/J-3/J-1 + marque overdue les étapes dépassées."""
    logger.info("[SCHEDULER] Vérification étapes post-sale...")
    try:
        from datetime import datetime, timedelta
        today = datetime.utcnow().date()
        with Session(engine) as session:
            steps = session.exec(
                select(PostSaleStep).where(PostSaleStep.status == "pending")
            ).all()
            overdue_count = 0
            notif_count = 0
            for step in steps:
                due = step.due_date.date()
                delta = (due - today).days
                if delta < 0:
                    step.status = "overdue"
                    step.updated_at = datetime.utcnow()
                    session.add(step)
                    overdue_count += 1
                elif delta in (7, 3, 1):
                    deal = session.get(Deal, step.deal_id)
                    if not deal:
                        continue
                    users = session.exec(
                        select(User).where(User.agency_id == deal.agency_id)
                    ).all()
                    for u in users:
                        existing = session.exec(
                            select(Notification).where(
                                Notification.user_id == u.id,
                                Notification.deal_id == step.deal_id,
                                Notification.message.contains(f"J-{delta}"),
                                Notification.message.contains(step.step_name),
                            )
                        ).first()
                        if not existing:
                            notif = Notification(
                                user_id=u.id,
                                deal_id=step.deal_id,
                                message=(
                                    f"Post-compromis J-{delta} : \"{step.step_name}\" "
                                    f"— échéance le {step.due_date.strftime('%d/%m/%Y')}."
                                ),
                            )
                            session.add(notif)
                            notif_count += 1
            session.commit()
            logger.info(f"[SCHEDULER] Post-sale : {overdue_count} overdue, {notif_count} notifications créées")
    except Exception as e:
        logger.error(f"[SCHEDULER] Erreur post_sale_alerts_job : {e}")


def poll_email_inboxes():
    """Toutes les 5 min : traite les emails entrants UNSEEN pour tous les ChannelAccount email actifs."""
    logger.info("[SCHEDULER] Polling boîtes email...")
    from datetime import datetime
    import re
    from .services.email_inbox import fetch_new_emails, send_reply, extract_email_address
    from .services.omnichannel_ai import qualify_and_respond

    with Session(engine) as session:
        accounts = session.exec(
            select(ChannelAccount).where(
                ChannelAccount.channel_type == "email",
                ChannelAccount.is_active == True,
            )
        ).all()
        for account in accounts:
            try:
                emails = fetch_new_emails(account)
                for em in emails:
                    email_addr = extract_email_address(em["from"])
                    conv = session.exec(
                        select(ChannelConversation).where(
                            ChannelConversation.channel_account_id == account.id,
                            ChannelConversation.external_id == email_addr,
                        )
                    ).first()
                    if not conv:
                        conv = ChannelConversation(
                            agency_id=account.agency_id,
                            channel_account_id=account.id,
                            external_id=email_addr,
                            sender_identity=email_addr,
                        )
                        session.add(conv)
                        session.commit()
                        session.refresh(conv)
                    if conv.agent_takeover:
                        continue
                    reply_text = qualify_and_respond(em["body"], account, conv, session)
                    subject = f"Re: {em['subject']}" if em["subject"] else "Votre demande"
                    send_reply(account, email_addr, subject, reply_text)
                account.last_sync = datetime.utcnow()
                session.add(account)
                session.commit()
            except Exception as e:
                logger.error(f"[SCHEDULER] Email poll error account {account.id}: {e}")


def run_all_scrapers():
    run_pap_scraper_job()
    run_leboncoin_scraper_job()
    run_auto_scraper_job()
