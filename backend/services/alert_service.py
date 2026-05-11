import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlmodel import Session, select
from ..models import Deal, Alert, User, Notification

logger = logging.getLogger(__name__)

# SMTP Configuration
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

def check_new_deals_for_alerts(session: Session, deals: list[Deal]):
    """
    Checks new deals against active alerts and user thresholds.
    """
    logger.info(f"Checking {len(deals)} new deals for alerts...")
    
    # Get all active users
    statement = select(User).where(User.is_active == True)
    users = session.exec(statement).all()
    
    for deal in deals:
        for user in users:
            # 1. Check against user's global threshold
            if deal.aevum_score and deal.aevum_score >= user.alert_threshold:
                logger.info(f"[ALERT] High score deal for user {user.username}: {deal.id} (Score: {deal.aevum_score})")
                
                # Store in DB
                notification = Notification(
                    user_id=user.id,
                    deal_id=deal.id,
                    message=f"Nouvelle opportunité à haut score ({deal.aevum_score}/10) détectée !"
                )
                session.add(notification)
                
                send_alert_notification(user, deal)
            
            # 2. Check against user-defined search alerts
            # (Existing logic, could be refined)
            statement = select(Alert).where(Alert.user_id == user.id, Alert.is_active == True)
            user_alerts = session.exec(statement).all()
            
            for alert in user_alerts:
                match = True
                if alert.min_price and deal.price and deal.price < alert.min_price: match = False
                if alert.max_price and deal.price and deal.price > alert.max_price: match = False
                if alert.min_surface and deal.surface and deal.surface < alert.min_surface: match = False
                
                if match:
                    logger.info(f"[ALERT] Deal {deal.id} matches search alert {alert.id} for user {user.username}")
                    
                    # Store in DB
                    notification = Notification(
                        user_id=user.id,
                        deal_id=deal.id,
                        alert_id=alert.id,
                        message=f"Le bien correspond à votre alerte : {alert.query}"
                    )
                    session.add(notification)
                    
                    send_alert_notification(user, deal, alert_name=alert.query)
        
    session.commit()

def send_alert_notification(user: User, deal: Deal, alert_name: str = "High Score"):
    """
    Sends a notification to the user (Email).
    """
    if not EMAIL_USER or not EMAIL_PASSWORD:
        logger.warning(f"SMTP not configured. Skipping email to {user.email}")
        return

    subject = f"🔔 AEVUM Alert: {alert_name} - {deal.price}€"
    body = f"""
    Bonjour {user.full_name},
    
    Une nouvelle opportunité a été détectée sur AEVUM !
    
    - Bien : {deal.property_type}
    - Prix : {deal.price} €
    - Surface : {deal.surface} m²
    - Score AEVUM : {deal.aevum_score}/10
    - Rendement : {deal.gross_yield}%
    
    Voir l'annonce : {deal.url}
    
    L'équipe AEVUM
    """

    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = user.email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)
            
        logger.info(f"Email alert sent to {user.email} for deal {deal.id}")
    except Exception as e:
        logger.error(f"Failed to send email to {user.email}: {e}")
