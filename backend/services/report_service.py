"""
Génération du rapport mensuel d'agence au format .docx.
"""
import io
from datetime import datetime
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH


def generate_monthly_report(agency_name: str, stats: dict, leads: list) -> bytes:
    """
    stats: {total_leads, taux_conversion, par_statut}
    leads: liste de Lead
    Retourne des bytes .docx
    """
    doc = Document()

    # Titre
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title.add_run(f"Rapport mensuel — {agency_name}")
    r.bold = True
    r.font.size = Pt(18)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.add_run(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}")
    doc.add_paragraph()

    # Synthèse
    doc.add_heading("Synthèse", level=1)
    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    hdr[0].text = "Indicateur"
    hdr[1].text = "Valeur"

    rows_data = [
        ("Total leads", str(stats.get("total", 0))),
        ("Taux de conversion", f"{stats.get('taux_conversion', 0)}%"),
    ]
    for stat, val in rows_data:
        row = table.add_row().cells
        row[0].text = stat
        row[1].text = val

    doc.add_paragraph()

    # Répartition par statut
    doc.add_heading("Répartition par statut", level=1)
    par_statut = stats.get("par_statut", {})
    if par_statut:
        t2 = doc.add_table(rows=1, cols=3)
        t2.style = "Table Grid"
        h2 = t2.rows[0].cells
        h2[0].text = "Statut"
        h2[1].text = "Nombre"
        h2[2].text = "% du total"
        total = stats.get("total", 1) or 1
        for status, count in sorted(par_statut.items(), key=lambda x: -x[1]):
            row = t2.add_row().cells
            row[0].text = status
            row[1].text = str(count)
            row[2].text = f"{round(count / total * 100, 1)}%"
    else:
        doc.add_paragraph("Aucune donnée disponible.")

    doc.add_paragraph()

    # Liste des 20 derniers leads
    doc.add_heading("Derniers leads (20 max)", level=1)
    if leads:
        t3 = doc.add_table(rows=1, cols=4)
        t3.style = "Table Grid"
        h3 = t3.rows[0].cells
        h3[0].text = "Nom"
        h3[1].text = "Email"
        h3[2].text = "Budget"
        h3[3].text = "Statut"
        for l in leads[:20]:
            row = t3.add_row().cells
            row[0].text = l.full_name or ""
            row[1].text = l.email or ""
            row[2].text = f"{l.budget or 0:,} €"
            row[3].text = l.status or ""
    else:
        doc.add_paragraph("Aucun lead.")

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
