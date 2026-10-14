"""
publish.py
==========
Lukee /articles-kansiosta uusimman Markdown-analyysin,
jakaa sisällön ilmaiseen (ilmainen esikatselu) ja maksulliseen (paywall) osioon,
muuntaa sisällön HTML-muotoon ja lähettää sen Ghost CMS Admin API:lle
(tai Webhook-rajapinnalle / Substack-integraatioon) luonnoksena tai julkaistuna.
"""

from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import re
from typing import Dict, Optional, Tuple

from dotenv import load_dotenv
import jwt
import markdown
import requests

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("publish")

BASE_DIR = Path(__file__).resolve().parent
ARTICLES_DIR = BASE_DIR / "articles"


def get_latest_article_file() -> Optional[Path]:
    """Palauttaa tuoreimman Markdown-tiedoston articles-kansiosta."""
    if not ARTICLES_DIR.exists():
        return None
    md_files = sorted(ARTICLES_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    return md_files[0] if md_files else None


def split_article_paywall(md_content: str) -> Tuple[str, str, str]:
    """
    Jakaa Markdown-artikkelin ilmaiseen ja maksulliseen osaan.

    Ilmainen osio:
    - Otsikko & julkaisumetadata
    - Yhtiön nimi & Tulos pähkinänkuoressa

    Maksullinen osio (Paywallin alapuoli):
    - Syvälliset luvut & Odotukset
    - Tärkeimmät tunnusluvut
    - Valuation & Arvostuskertoimet (P/E, EV/EBITDA)
    - Automaattinen DCF-malli
    - Sijoittajan 3 kriittisintä tärppiä
    """
    title = "Talousmedian analyysi"
    first_heading = re.search(r"^#\s+(.+)$", md_content, re.MULTILINE)
    if first_heading:
        title = first_heading.group(1).strip()

    # Etsitään ensimmäinen maksullinen osio (Valuaatio & Tunnusluvut, Tunnuslukuvertailu, DCF-Kassavirtamallinnus tms.)
    paywall_split_pattern = r"(##\s+(?:Valuaatio & Tunnusluvut|Tunnuslukuvertailu|DCF-Kassavirtamallinnus|Syvälliset luvut|Luvut vs\. Odotukset|Tärkeimmät tunnusluvut).*)"
    parts = re.split(paywall_split_pattern, md_content, maxsplit=1, flags=re.DOTALL)

    if len(parts) >= 2:
        free_part = parts[0].strip()
        paid_part = (parts[1] + (parts[2] if len(parts) > 2 else "")).strip()
    else:
        # Fallback jos osiota ei löydy tarkalla nimellä
        sections = md_content.split("## ")
        if len(sections) > 2:
            free_part = sections[0] + "## " + sections[1]
            paid_part = "## " + "## ".join(sections[2:])
        else:
            free_part = md_content
            paid_part = ""

    return title, free_part, paid_part


def build_ghost_html(title: str, free_md: str, paid_md: str) -> str:
    """
    Muuntaa Markdownin Ghost-yhteensopivaksi HTML:ksi
    ja lisää Ghostin virallisen <!--members-only--> paywall-jakajan.
    """
    free_html = markdown.markdown(free_md, extensions=["tables", "fenced_code"])
    paid_html = markdown.markdown(paid_md, extensions=["tables", "fenced_code"])

    # Ghost Paywall -erotin: <!--members-only-->
    # Lisätään myös visuaalinen teaser-laatikko lukijoille
    paywall_badge = """
<!--members-only-->
<div class="paywall-divider" style="margin: 35px 0 25px; padding: 20px; border-radius: 8px; background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%); color: #ffffff; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
    <span style="font-size: 24px;">🔒</span>
    <h3 style="margin: 8px 0; color: #ffffff; font-size: 1.25rem;">Talousmedia Premium: Täysi analyysi & DCF-malli</h3>
    <p style="margin: 5px 0 0; color: #cbd5e1; font-size: 0.95rem;">Loput artikkelista (syvälliset luvut, P/E- ja EV/EBITDA -arvostuskertoimet, DCF-laskelma sekä sijoittajan 3 tärppiä) on varattu tilaajille.</p>
</div>
"""

    return f"{free_html}\n{paywall_badge}\n{paid_html}"


def generate_ghost_token(admin_api_key: str) -> str:
    """Luo JWT-tunnisteen Ghost Admin API -kutsuja varten."""
    try:
        key_id, secret = admin_api_key.split(":")
    except ValueError:
        raise ValueError("GHOST_ADMIN_API_KEY tulee olla muotoa '{id}:{secret}' (hex-muotoinen salaisuus).")

    iat = int(datetime.now(timezone.utc).timestamp())
    header = {"alg": "HS256", "typ": "JWT", "kid": key_id}
    payload = {
        "iat": iat,
        "exp": iat + 5 * 60,
        "aud": "/admin/"
    }

    token = jwt.encode(payload, bytes.fromhex(secret), algorithm="HS256", headers=header)
    return token


def publish_to_ghost(api_url: str, admin_api_key: str, title: str, html_content: str, status: str = "draft") -> Dict:
    """Lähettää artikkelin Ghost CMS:n Admin API:in."""
    api_url = api_url.rstrip("/")
    endpoint = f"{api_url}/ghost/api/admin/posts/?source=html"
    token = generate_ghost_token(admin_api_key)

    headers = {
        "Authorization": f"Ghost {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "posts": [
            {
                "title": title,
                "html": html_content,
                "status": status,
                "tags": [
                    {"name": "Pörssi"},
                    {"name": "Talousmedia"},
                    {"name": "Premium"}
                ]
            }
        ]
    }

    resp = requests.post(endpoint, json=payload, headers=headers, timeout=20)
    resp.raise_for_status()
    return resp.json()


def publish_to_webhook(webhook_url: str, payload: Dict) -> Dict:
    """Lähettää artikkelin Webhook-osoitteeseen (esim. Substack/Make/Zapier)."""
    headers = {"Content-Type": "application/json"}
    resp = requests.post(webhook_url, json=payload, headers=headers, timeout=20)
    resp.raise_for_status()
    return {"status": resp.status_code, "text": resp.text}


def create_local_preview(title: str, full_html: str) -> Path:
    """Luo paikallisen HTML-esikatselun selaamista varten."""
    preview_file = ARTICLES_DIR / "preview_published.html"
    html_template = f"""<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Talousmedia Julkaisuesikatselu</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f1f5f9;
            color: #0f172a;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
        }}
        .container {{
            max-width: 820px;
            width: 100%;
            background: #ffffff;
            padding: 45px 55px;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);
            line-height: 1.7;
        }}
        h1 {{ color: #0f172a; font-size: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }}
        h2 {{ color: #1e3e62; font-size: 1.4rem; margin-top: 30px; }}
        a {{ color: #0284c7; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
        ul, ol {{ padding-left: 24px; }}
        li {{ margin-bottom: 8px; }}
        strong {{ color: #0b192c; }}
        .badge {{
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 15px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="badge">GHOST CMS / SUBSTACK VALMIS ARTIKKELIESIKATSELU</div>
        {full_html}
    </div>
</body>
</html>
"""
    with open(preview_file, "w", encoding="utf-8") as f:
        f.write(html_template)
    return preview_file


def publish_article(file_path: Optional[Path] = None) -> bool:
    """Suorittaa artikkelin julkaisu- tai luonnosprosessin."""
    target_file = file_path or get_latest_article_file()

    if not target_file or not target_file.exists():
        logger.error("Julkaistavaa artikkelia ei löydy articles-kansiosta.")
        return False

    logger.info(f"Käsitellään tiedosto: {target_file.name}")

    with open(target_file, "r", encoding="utf-8") as f:
        md_content = f.read()

    title, free_md, paid_md = split_article_paywall(md_content)
    full_html = build_ghost_html(title, free_md, paid_md)

    # Paikallinen HTML-esikatselu
    preview_path = create_local_preview(title, full_html)
    logger.info(f"Paikallinen HTML-esikatselu luotu: {preview_path}")

    # Konfiguraatiot ympäristömuuttujista
    ghost_url = os.getenv("GHOST_API_URL")
    ghost_key = os.getenv("GHOST_ADMIN_API_KEY")
    webhook_url = os.getenv("PUBLISH_WEBHOOK_URL")
    publish_status = os.getenv("PUBLISH_STATUS", "draft").lower()

    published = False

    # 1. Ghost CMS Admin API
    if ghost_url and ghost_key:
        logger.info(f"Lähetetään artikkeli Ghost API:in ({ghost_url}) tilassa: '{publish_status}'...")
        try:
            result = publish_to_ghost(ghost_url, ghost_key, title, full_html, status=publish_status)
            post_data = result.get("posts", [{}])[0]
            logger.info(f"Artikkeli luotu Ghostiin onnistuneesti! ID: {post_data.get('id')}, URL: {post_data.get('url')}")
            published = True
        except Exception as e:
            logger.error(f"Virhe Ghost API -julkaisussa: {e}")

    # 2. Webhook (Substack / Make / Zapier)
    if webhook_url:
        logger.info(f"Lähetetään artikkeli Webhookiin ({webhook_url})...")
        try:
            webhook_payload = {
                "title": title,
                "status": publish_status,
                "free_content_md": free_md,
                "paid_content_md": paid_md,
                "full_html": full_html,
                "source_file": target_file.name,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            res = publish_to_webhook(webhook_url, webhook_payload)
            logger.info(f"Webhook-kutsu onnistui: {res}")
            published = True
        except Exception as e:
            logger.error(f"Virhe Webhook-kutsussa: {e}")

    # 3. Jos API-avaimia ei ole määritetty, ajetaan simulaatio/testitila
    if not (ghost_url and ghost_key) and not webhook_url:
        logger.warning("HUOMIO: GHOST_API_URL / GHOST_ADMIN_API_KEY tai PUBLISH_WEBHOOK_URL ei ole asetettu.")
        logger.info(
            f"[TESTI- JA SIMULAATIOTILA ONNISTUI]\n"
            f"- Otsikko: {title}\n"
            f"- Tila: {publish_status}\n"
            f"- Ilmainen osa: {len(free_md)} merkkiä\n"
            f"- Paywall-raja: <!--members-only--> lisätty\n"
            f"- Maksullinen osa (DCF & Kertoimet): {len(paid_md)} merkkiä\n"
            f"- HTML-muotoiltu kokonaisuus: {len(full_html)} merkkiä\n"
            f"- Avaa esikatselu selaimessa: {preview_path}"
        )
        published = True

    return published


if __name__ == "__main__":
    publish_article()
