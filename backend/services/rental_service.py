# backend/services/rental_service.py
"""
Génération PDF quittances et rapports propriétaire, emails relances locataires.
"""
import io
import logging
from datetime import datetime
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

from .email_service import send_email

logger = logging.getLogger(__name__)

REMINDER_TEMPLATES = {
    5: (
        "Rappel de loyer",
        "Bonjour {name},\n\nNous vous rappelons que votre loyer du mois en cours "
        "({amount:.2f} €) n'a pas encore été réglé. Merci de procéder au virement "
        "dans les meilleurs délais.\n\nCordialement,\nAEVUM Immobilier"
    ),
    10: (
        "Relance loyer impayé",
        "Bonjour {name},\n\nMalgré notre premier rappel, votre loyer de {amount:.2f} € "
        "reste impayé. Merci de régulariser cette situation dans les 48h.\n\n"
        "Cordialement,\nAEVUM Immobilier"
    ),
    15: (
        "Mise en demeure — loyer impayé",
        "Bonjour {name},\n\nNous vous mettons en demeure de régler votre loyer de "
        "{amount:.2f} € sous 72h. Sans règlement, nous serons contraints d'engager "
        "une procédure de recouvrement.\n\nAEVUM Immobilier"
    ),
}


def generate_receipt_pdf(rental, month: datetime) -> bytes:
    """Génère une quittance de loyer mensuelle au format .docx."""
    doc = Document()
    sec = doc.sections[0]
    sec.left_margin = Cm(2.5)
    sec.right_margin = Cm(2.5)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("QUITTANCE DE LOYER")
    r.bold = True
    r.font.size = Pt(16)

    doc.add_paragraph(f"Mois : {month.strftime('%B %Y').capitalize()}")
    doc.add_paragraph(f"Date d'émission : {datetime.now().strftime('%d/%m/%Y')}")
    doc.add_paragraph()

    doc.add_heading("BAILLEUR / MANDATAIRE", level=2)
    doc.add_paragraph("AEVUM Immobilier")

    doc.add_paragraph()
    doc.add_heading("LOCATAIRE", level=2)
    p = doc.add_paragraph()
    p.add_run("Nom : ").bold = True
    p.add_run(rental.tenant_name)
    p = doc.add_paragraph()
    p.add_run("Email : ").bold = True
    p.add_run(rental.tenant_email)
    if rental.tenant_phone:
        p = doc.add_paragraph()
        p.add_run("Téléphone : ").bold = True
        p.add_run(rental.tenant_phone)

    doc.add_paragraph()
    doc.add_heading("DÉTAIL DU RÈGLEMENT", level=2)

    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    hdr[0].text = "Désignation"
    hdr[1].text = "Montant"
    for label, val in [
        ("Loyer mensuel", f"{rental.monthly_rent:.2f} €"),
        ("Charges locatives", f"{rental.charges:.2f} €"),
        ("TOTAL", f"{rental.monthly_rent + rental.charges:.2f} €"),
    ]:
        row = table.add_row().cells
        row[0].text = label
        row[1].text = val

    doc.add_paragraph()
    doc.add_paragraph(
        "Je soussigné(e), bailleur/mandataire du logement désigné ci-dessus, "
        "déclare avoir reçu de son locataire la somme correspondant au loyer et aux "
        "charges du mois indiqué ci-dessus et lui en donne quittance, sous réserve "
        "de tous mes droits.",
        style="Normal"
    )
    doc.add_paragraph()
    doc.add_paragraph(f"Fait le {datetime.now().strftime('%d/%m/%Y')}")
    doc.add_paragraph()
    doc.add_paragraph("Signature du bailleur : _______________________")

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def generate_owner_report(rental, year: int, month: int, payments: list) -> bytes:
    """Génère le rapport mensuel propriétaire au format .docx."""
    doc = Document()
    sec = doc.sections[0]
    sec.left_margin = Cm(2.5)
    sec.right_margin = Cm(2.5)

    month_dt = datetime(year, month, 1)
    paid_payments = [p for p in payments if p.status in ("paid", "partial")]
    late_payments = [p for p in payments if p.status == "late"]
    total_encaisse = sum(p.amount for p in paid_payments)
    total_impaye = sum(p.amount for p in late_payments)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(f"Rapport de gestion locative — {month_dt.strftime('%B %Y').capitalize()}")
    r.bold = True
    r.font.size = Pt(14)
    doc.add_paragraph()

    doc.add_heading("Locataire", level=2)
    doc.add_paragraph(f"Nom : {rental.tenant_name}")
    doc.add_paragraph(f"Email : {rental.tenant_email}")
    doc.add_paragraph(f"Loyer mensuel : {rental.monthly_rent:.2f} € + charges {rental.charges:.2f} €")
    doc.add_paragraph()

    doc.add_heading("Bilan du mois", level=2)
    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    hdr[0].text = "Indicateur"
    hdr[1].text = "Montant"
    for label, val in [
        ("Loyers encaissés", f"{total_encaisse:.2f} €"),
        ("Loyers impayés", f"{total_impaye:.2f} €"),
        ("Charges locataire", f"{rental.charges:.2f} €"),
    ]:
        row = table.add_row().cells
        row[0].text = label
        row[1].text = val

    doc.add_paragraph()
    doc.add_paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}")

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def send_payment_reminder(rental, payment, reminder_type: int) -> bool:
    """Envoie un email de relance (types acceptés : 5, 10, 15)."""
    if reminder_type not in REMINDER_TEMPLATES:
        logger.warning(f"[RENTAL] reminder_type={reminder_type} invalide")
        return False
    subject, body_tpl = REMINDER_TEMPLATES[reminder_type]
    body = body_tpl.format(name=rental.tenant_name, amount=payment.amount)
    ok = send_email(rental.tenant_email, subject, body)
    logger.info(f"[RENTAL] Relance J+{reminder_type} → {rental.tenant_email} : {'OK' if ok else 'FAIL'}")
    return ok
