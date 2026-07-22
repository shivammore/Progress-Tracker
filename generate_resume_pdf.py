from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Table, TableStyle


SRC = Path("Shivam_More_Resume_semantic.md")
OUT = Path("Shivam_More_Resume_semantic.pdf")


def md_to_rl_markup(text: str) -> str:
    """Convert light markdown formatting to ReportLab-compatible markup."""
    text = text.replace("`", "")
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"__(.+?)__", r"<b>\1</b>", text)
    return text.strip()


def build_pdf(markdown_text: str, out_path: Path) -> None:
    styles = getSampleStyleSheet()

    primary = colors.HexColor("#13395E")
    accent = colors.HexColor("#13395E")
    muted = colors.HexColor("#444B52")
    divider = colors.HexColor("#B9C4CF")

    name_style = ParagraphStyle(
        "Name",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=21,
        leading=24,
        textColor=primary,
        alignment=1,
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=muted,
        alignment=1,
        spaceAfter=3,
    )
    contact_style = ParagraphStyle(
        "Contact",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.6,
        leading=11,
        alignment=1,
        textColor=muted,
        spaceAfter=3,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=11.5,
        textColor=accent,
        spaceBefore=5,
        spaceAfter=1,
    )
    company_style = ParagraphStyle(
        "Company",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=9.6,
        leading=11.5,
        spaceBefore=3,
        spaceAfter=0,
    )
    role_style = ParagraphStyle(
        "Role",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=muted,
        spaceBefore=1.5,
        spaceAfter=1,
    )
    date_style = ParagraphStyle(
        "Date",
        parent=styles["BodyText"],
        fontName="Helvetica-Oblique",
        fontSize=7.9,
        leading=9.2,
        alignment=2,
        textColor=muted,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.7,
        leading=10.8,
        spaceAfter=1.5,
    )
    bullet_1 = ParagraphStyle(
        "Bullet1",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.7,
        leading=10.8,
        leftIndent=12,
        bulletIndent=3,
        spaceAfter=1.5,
    )
    bullet_2 = ParagraphStyle(
        "Bullet2",
        parent=bullet_1,
        leftIndent=22,
        bulletIndent=13,
    )

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=13 * mm,
        rightMargin=13 * mm,
        topMargin=9 * mm,
        bottomMargin=9 * mm,
        title="Shivam More Resume",
        author="Shivam More",
    )

    story = []
    lines = markdown_text.splitlines()
    current_section = ""
    header_done = False
    contact_parts = []

    def section_header(title: str):
        story.append(Paragraph(md_to_rl_markup(title.upper()), section_style))
        story.append(HRFlowable(width="100%", thickness=0.7, color=divider, spaceBefore=1, spaceAfter=3))

    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            continue

        if line.startswith("# "):
            story.append(Paragraph(md_to_rl_markup(line[2:]), name_style))
            continue

        if not header_done and line.startswith("**") and line.endswith("**"):
            story.append(Paragraph(md_to_rl_markup(line), subtitle_style))
            continue

        if line.startswith("## "):
            if not header_done:
                if contact_parts:
                    story.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_parts), contact_style))
                story.append(HRFlowable(width="100%", thickness=1.0, color=primary, spaceBefore=3, spaceAfter=2))
                header_done = True

            current_section = line[3:].strip()
            section_header(current_section)
            continue

        if not header_done:
            contact_parts.append(md_to_rl_markup(line))
            continue

        if line.startswith("### "):
            story.append(Paragraph(md_to_rl_markup(line[4:]), company_style))
            continue

        if current_section == "Professional Experience" and line.startswith("**") and "|" in line:
            role_match = re.match(r"\*\*(.+?)\*\*\s*\|\s*(.+)", line.strip())
            if role_match:
                role_text = md_to_rl_markup(role_match.group(1).strip())
                date_text = md_to_rl_markup(role_match.group(2).strip())
                combined = (
                    f'<b>{role_text}</b>'
                    f'<font color="#888888"> &nbsp;&bull;&nbsp; </font>'
                    f'<i>{date_text}</i>'
                )
                story.append(Paragraph(combined, role_style))
                continue

        bullet_match = re.match(r"^(\s*)[-*]\s+(.*)$", line)
        if bullet_match:
            indent = len(bullet_match.group(1))
            content = md_to_rl_markup(bullet_match.group(2))
            style = bullet_2 if indent >= 2 else bullet_1
            story.append(Paragraph(content, style, bulletText="\u2022"))
            continue

        story.append(Paragraph(md_to_rl_markup(line), body))

    doc.build(story)


if __name__ == "__main__":
    text = SRC.read_text(encoding="utf-8")
    build_pdf(text, OUT)
    print(f"Generated: {OUT}")
