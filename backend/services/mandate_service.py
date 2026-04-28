import logging
from datetime import datetime, timedelta
from io import BytesIO
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

logger = logging.getLogger(__name__)


def generate_mandate_pdf(mandate) -> bytes:
    """Génère le PDF officiel d'un mandat (format .docx, Loi Hoguet)."""
    doc = Document()

    # Titre
    title = doc.add_heading("MANDAT IMMOBILIER", level=1)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in title.runs:
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph("")

    # Numéro officiel
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"N° {mandate.mandate_number:04d}")
    run.bold = True
    run.font.size = Pt(14)

    doc.add_paragraph("")

    # Type de mandat
    type_labels = {
        "vente": "MANDAT DE VENTE",
        "recherche": "MANDAT DE RECHERCHE",
        "location": "MANDAT DE LOCATION",
        "gestion": "MANDAT DE GESTION",
    }
    type_label = type_labels.get(mandate.mandate_type, mandate.mandate_type.upper())
    exclu = " EXCLUSIF" if mandate.exclusive else " SIMPLE"
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run(type_label + exclu)
    r2.bold = True
    r2.font.size = Pt(12)

    doc.add_paragraph("")

    # Table des informations
    def add_row(table, label, value):
        row = table.add_row()
        row.cells[0].text = label
        row.cells[0].paragraphs[0].runs[0].bold = True
        row.cells[1].text = str(value) if value else "—"

    table = doc.add_table(rows=0, cols=2)
    table.style = "Table Grid"

    add_row(table, "Bien immobilier", mandate.property_address)
    add_row(table, "Mandant (propriétaire)", mandate.owner_name)
    add_row(table, "Email mandant", mandate.owner_email or "—")
    add_row(table, "Téléphone mandant", mandate.owner_phone or "—")
    add_row(table, "Date de début", mandate.start_date.strftime("%d/%m/%Y"))
    add_row(table, "Date de fin", mandate.end_date.strftime("%d/%m/%Y"))
    add_row(table, "Honoraires", f"{mandate.commission_rate} % TTC")
    add_row(table, "Statut", mandate.status.upper())

    doc.add_paragraph("")
    doc.add_paragraph(
        "Conformément à la loi n° 70-9 du 2 janvier 1970 (dite Loi Hoguet) et à son décret "
        "d'application n° 72-678 du 20 juillet 1972, le présent mandat est enregistré au registre "
        "des mandats de l'agence sous le numéro indiqué ci-dessus."
    )

    doc.add_paragraph("")

    # Signatures
    sig_table = doc.add_table(rows=3, cols=2)
    sig_table.cell(0, 0).text = "Le mandant"
    sig_table.cell(0, 1).text = "L'agent immobilier"
    sig_table.cell(1, 0).text = ""
    sig_table.cell(1, 1).text = ""
    sig_table.cell(2, 0).text = f"Fait le {datetime.utcnow().strftime('%d/%m/%Y')}"
    sig_table.cell(2, 1).text = ""

    buffer = BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def check_mandate_expiry(session, agency_id: int) -> list:
    """Retourne les mandats expirant dans les 30 prochains jours."""
    from sqlmodel import select
    from ..models import Mandate
    now = datetime.utcnow()
    threshold = now + timedelta(days=30)
    return session.exec(
        select(Mandate).where(
            Mandate.agency_id == agency_id,
            Mandate.status == "actif",
            Mandate.end_date >= now,
            Mandate.end_date <= threshold,
        )
    ).all()
