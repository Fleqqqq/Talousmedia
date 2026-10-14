"""
generate_archive.py
===================
Eräajoskripti, joka käy läpi pörssitiedotteiden arkiston ja generoi
30–50 erilaista, kattavaa talous- ja pörssianalyysia kansion /articles alle.
Varmistaa uniikit ID:t, kategoriajaottelun ja estää duplikaatit.
"""

import json
import logging
import sys
from pathlib import Path
from typing import List, Dict

from fetch_news import fetch_and_save_releases, OUTPUT_FILE
from summarize import summarize_release, ARTICLES_DIR, classify_category

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("generate_archive")

BATCH_TRACKER_FILE = Path(__file__).resolve().parent / "processed_releases.json"


def load_releases() -> List[Dict[str, str]]:
    """Lataa tiedotteet JSON-tiedostosta tai noutaa ne tarvittaessa."""
    if not OUTPUT_FILE.exists():
        logger.info("latest_releases.json puuttuu. Suoritetaan tiedotteiden haku...")
        return fetch_and_save_releases(max_full_text=60)

    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        releases = json.load(f)

    if len(releases) < 25:
        logger.info(f"Arkistossa vain {len(releases)} tiedotetta. Täydennetään syötteistä...")
        return fetch_and_save_releases(max_full_text=60)

    return releases


def run_batch_archive(target_count: int = 40):
    """Käy läpi pörssitiedotteet ja generoi halutun määrän laadukkaita analyyseja."""
    logger.info("=" * 65)
    logger.info(f"KÄYNNISTETÄÄN ERÄAJO: Tavoitteena {target_count} pörssianalyysia")
    logger.info("=" * 65)

    releases = load_releases()
    logger.info(f"Arkistossa käytettävissä yhteensä {len(releases)} uniikkia pörssitiedotetta.")

    # Ladataan aiemmin käsitellyt linkit
    processed_links = set()
    if BATCH_TRACKER_FILE.exists():
        try:
            with open(BATCH_TRACKER_FILE, "r", encoding="utf-8") as f:
                processed_links = set(json.load(f))
        except Exception:
            pass

    generated_count = 0
    category_counts = {
        "Tulosraportit": 0,
        "Tulosvaroitukset": 0,
        "Sopimukset & Investoinnit": 0,
        "Strategia & Johto": 0
    }

    # Valitaan monipuolisesti eri yhtiöiden ja eri kategorioiden tiedotteita
    for i, rel in enumerate(releases):
        if generated_count >= target_count:
            break

        title = rel.get("title", "")
        link = rel.get("link", "")
        category = classify_category(title, rel.get("full_text", rel.get("summary", "")))

        logger.info(f"[{generated_count + 1}/{target_count}] Käsitellään: {title[:55]}... ({category})")

        try:
            art_path = summarize_release(rel)
            if art_path and art_path.exists():
                generated_count += 1
                category_counts[category] = category_counts.get(category, 0) + 1
                processed_links.add(link)
        except Exception as e:
            logger.error(f"Virhe käsiteltäessä tiedotetta '{title}': {e}")

    # Tallennetaan seuranta
    with open(BATCH_TRACKER_FILE, "w", encoding="utf-8") as f:
        json.dump(list(processed_links), f, ensure_ascii=False, indent=2)

    logger.info("=" * 65)
    logger.info(f"ERÄAJO VALMIS! Yhteensä {generated_count} uutta artikkelia generoitu.")
    logger.info(f"Artikkelikansio: {ARTICLES_DIR}")
    logger.info("Kategoriat:")
    for cat, count in category_counts.items():
        logger.info(f"  - {cat}: {count} kpl")
    logger.info("=" * 65)


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 35
    run_batch_archive(target_count=count)
