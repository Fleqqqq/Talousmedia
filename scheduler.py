"""
scheduler.py
============
Ajastettu taustaprosessi talousmedian automaatiolle.
Ajaa tiedotteiden haun (fetch_news.py), AI-tiivistyksen (summarize.py)
sekä julkaisun (publish.py) automaattisesti arkipäivisin klo 09:00 ja 16:30.

Sisältää virheidenhallinnan ja duplikaattisuojan:
Mikäli uusia pörssitiedotteita ei ole ilmestynyt, skripti odottaa seuraavaa
ajastusta tekemättä turhia API-kutsuja tai julkaisuja.
"""

import argparse
from datetime import datetime
import json
import logging
from pathlib import Path
import time
from typing import List, Set

from dotenv import load_dotenv
import schedule

from fetch_news import fetch_and_save_releases
from publish import publish_article
from summarize import summarize_release

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("scheduler")

BASE_DIR = Path(__file__).resolve().parent
STATE_FILE = BASE_DIR / "processed_releases.json"


def load_processed_links() -> Set[str]:
    """Lataa aiemmin käsiteltyjen tiedotteiden linkit."""
    if not STATE_FILE.exists():
        return set()
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return set(data) if isinstance(data, list) else set()
    except Exception as e:
        logger.warning(f"Ei voitu lukea tilatiedostoa {STATE_FILE}: {e}")
        return set()


def save_processed_links(links: Set[str]) -> None:
    """Tallentaa käsitellyt tiedotteet tilatiedostoon."""
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(sorted(list(links)), f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Virhe tallennettaessa tilatiedostoa {STATE_FILE}: {e}")


def run_pipeline(force: bool = False) -> bool:
    """
    Suorittaa koko uutisputken:
    1. Hakee tuoreet tiedotteet (fetch_news.py).
    2. Tarkistaa, onko uusin tiedote käsittelemätön.
    3. Jos uutta tiedotetta ei ole, odottaa seuraavaa ajastusta tekemättä mitään.
    4. Jos uusi tiedote löytyy, luo AI-analyysin (summarize.py) ja julkaisee sen (publish.py).
    """
    logger.info("=== Käynnistetään uutisputken ajo ===")

    try:
        # Vaihe 1: Tiedotteiden nouto
        releases = fetch_and_save_releases()
    except Exception as e:
        logger.error(f"Virhe tiedotteiden noudossa (fetch_news): {e}")
        return False

    if not releases:
        logger.info("Ei tiedotteita saatavilla. Odotetaan seuraavaa ajastusta tekemättä mitään.")
        return True

    latest = releases[0]
    link = latest.get("link", "").strip()
    title = latest.get("title", "Nimetön tiedote")

    processed_links = load_processed_links()

    # Vaihe 2: Duplikaattien tarkistus
    if link in processed_links and not force:
        logger.info(
            f"Ei uusia pörssitiedotteita. Viimeisin tiedote '{title}' on jo käsitelty aiemmin.\n"
            f"Odotetaan seuraavaa ajastusta tekemättä mitään."
        )
        return True

    logger.info(f"UUSI TIEDOTE HAVAITTU: '{title}' ({link})")

    # Vaihe 3: AI-tiivistys ja DCF-mallinnus
    try:
        logger.info("Luodaan AI-analyysi tiedotteelle...")
        article_file = summarize_release(index=0)
        if not article_file or not article_file.exists():
            logger.error("Analyysin luominen epäonnistui (summarize_release palautti None).")
            return False
    except Exception as e:
        logger.error(f"Virhe tekoälytiivistyksessä (summarize): {e}")
        return False

    # Vaihe 4: Julkaisu alustalle
    try:
        logger.info(f"Julkaistaan luotu artikkeli ({article_file.name})...")
        success = publish_article(file_path=article_file)
        if success:
            processed_links.add(link)
            save_processed_links(processed_links)
            logger.info("=== Uutisputki suoritettu ja artikkeli julkaistu onnistuneesti! ===")
            return True
        else:
            logger.warning("Artikkelin julkaisu ei valmistunut onnistuneesti.")
            return False
    except Exception as e:
        logger.error(f"Virhe julkaisussa (publish): {e}")
        return False


def setup_weekday_schedule():
    """Asettaa ajastukset arkipäivisin klo 09:00 ja 16:30."""
    weekdays = [
        schedule.every().monday,
        schedule.every().tuesday,
        schedule.every().wednesday,
        schedule.every().thursday,
        schedule.every().friday,
    ]

    for day in weekdays:
        day.at("09:00").do(run_pipeline)
        day.at("16:30").do(run_pipeline)

    logger.info("Ajastukset rekisteröity:")
    logger.info("- Maanantai - Perjantai klo 09:00 (Pörssin avautuminen)")
    logger.info("- Maanantai - Perjantai klo 16:30 (Pörssin sulkeutuminen)")


def main():
    parser = argparse.ArgumentParser(description="Talousmedia automatisoitu uutisajastin")
    parser.add_argument(
        "--run-once",
        action="store_true",
        help="Suorita putki heti kerran ja lopeta (sopii CI/CD / GitHub Actions -käyttöön)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Pakota analyysi ja julkaisu vaikka uusin tiedote olisi jo aiemmin käsitelty"
    )
    args = parser.parse_args()

    if args.run_once:
        logger.info("Ajetaan uutisputki kerran komentoriviparametrilla --run-once...")
        run_pipeline(force=args.force)
        return

    # Taustaprosessitila
    setup_weekday_schedule()
    logger.info("Taustaprosessi käynnissä. Odotetaan ajastettuja aikoja (Paina Ctrl+C lopettaaksesi)...")

    while True:
        try:
            schedule.run_pending()
            time.sleep(30)
        except KeyboardInterrupt:
            logger.info("Ajastin pysäytetty käyttäjän toimesta.")
            break
        except Exception as e:
            logger.error(f"Odottamaton virhe ajastinsilmukassa: {e}")
            time.sleep(60)


if __name__ == "__main__":
    main()
