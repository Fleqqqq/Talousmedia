"""
fetch_news.py
=============
Hakee suomalaisten pörssiyhtiöiden tiedotteet ja historiadatan Cisionin virallisista RSS-syötteistä.
Kattaa koko Helsingin pörssin säännellyt tiedotteet sekä erilliset syötteet keskeisille
suomalaisille pörssiyhtiöille (Neste, Fortum, Sampo, Nordea, KONE, Wärtsilä, UPM, Kesko, Valmet, jne.).
Lataa täyden leipätekstin ja taulukot sekä tallentaa rikastettuun JSON-tiedostoon (latest_releases.json).
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from bs4 import BeautifulSoup
import feedparser
import requests

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("fetch_news")

# Laaja syötevalikoima: Nasdaq Helsinki yleissyötteet + keskeiset yhtiökohtaiset historiatiedotteet
RSS_FEEDS = [
    {
        "name": "Cision - Säännellyt pörssitiedotteet (Nasdaq Helsinki)",
        "url": "https://news.cision.com/fi/rss/regulatory"
    },
    {
        "name": "Cision - Kaikki yritystiedotteet (Suomi)",
        "url": "https://news.cision.com/fi/rss/all"
    },
    {
        "name": "Neste - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/neste/rss/regulatory"
    },
    {
        "name": "Fortum - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/fortum/rss/regulatory"
    },
    {
        "name": "Sampo - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/sampo/rss/regulatory"
    },
    {
        "name": "Nordea - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/nordea/rss/regulatory"
    },
    {
        "name": "KONE - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/kone-oyj/rss/regulatory"
    },
    {
        "name": "Wärtsilä - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/wartsila-corporation/rss/regulatory"
    },
    {
        "name": "UPM-Kymmene - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/upm-kymmene-oyj/rss/regulatory"
    },
    {
        "name": "Valmet - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/valmet-oyj/rss/regulatory"
    },
    {
        "name": "Kemira - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/kemira-oyj/rss/regulatory"
    },
    {
        "name": "Kesko - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/kesko-oyj/rss/regulatory"
    },
    {
        "name": "SSAB - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/ssab/rss/regulatory"
    },
    {
        "name": "Olvi - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/olvi-oyj/rss/regulatory"
    },
    {
        "name": "Elisa - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/elisa-oyj/rss/regulatory"
    },
    {
        "name": "Konecranes - Pörssitiedotteet",
        "url": "https://news.cision.com/fi/konecranes-oyj/rss/regulatory"
    }
]

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}

OUTPUT_FILE = Path(__file__).resolve().parent / "latest_releases.json"


def strip_html(text: str) -> str:
    """Poistaa HTML-tagit ja ylimääräiset välilyönnit tekstistä."""
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")
    return " ".join(soup.get_text().split())


def format_published_date(entry: Any) -> str:
    """Muuntaa julkaisuajan ISO 8601 -formaattiin."""
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        try:
            dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            return dt.isoformat()
        except Exception:
            pass

    return getattr(entry, "published", "") or getattr(entry, "updated", "")


def extract_full_content_and_tables(session: requests.Session, url: str, fallback_summary: str = "") -> str:
    """
    Noutaa pörssitiedotteen täyden leipätekstin, väliotsikot ja taulukot verkosta.
    """
    if not url:
        return fallback_summary

    try:
        resp = session.get(url, headers=REQUEST_HEADERS, timeout=10)
        if resp.status_code != 200:
            return fallback_summary

        soup = BeautifulSoup(resp.content, "html.parser")

        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]):
            tag.decompose()

        container = (
            soup.find("main") or
            soup.find("article") or
            soup.find("div", {"itemprop": "articleBody"}) or
            soup.find(class_=re.compile(r"(release-text|main-content|news-text|article-body)", re.I)) or
            soup.body
        )

        if not container:
            return fallback_summary

        blocks = []

        for elem in container.find_all(["p", "h1", "h2", "h3", "h4", "table", "ul"]):
            if elem.name == "table":
                table_lines = []
                for tr in elem.find_all("tr"):
                    cells = [" ".join(c.get_text().split()) for c in tr.find_all(["th", "td"])]
                    if cells and any(cells):
                        table_lines.append(" | ".join(cells))
                if table_lines:
                    blocks.append("\n[TAULUKKO / LUVUT]:\n" + "\n".join(table_lines) + "\n")

            elif elem.name == "ul":
                items = [f"- {' '.join(li.get_text().split())}" for li in elem.find_all("li") if li.get_text().strip()]
                if items:
                    blocks.append("\n".join(items))

            else:
                txt = " ".join(elem.get_text().split())
                if txt and len(txt) > 20 and not txt.startswith(("Seuraa meitä", "Tilaa uutiset", "Jaa artikkeli")):
                    blocks.append(txt)

        full_content = "\n\n".join(blocks).strip()
        if len(full_content) > 150:
            return full_content

    except Exception as e:
        logger.warning(f"Virhe noudettaessa täyttä sisältöä osoitteesta {url}: {e}")

    return fallback_summary


def fetch_and_save_releases(max_full_text: int = 60) -> List[Dict[str, str]]:
    """Hakee tiedotteet kaikista syötteistä, poistaa duplikaatit ja tallentaa JSON-arkistoon."""
    releases: List[Dict[str, str]] = []
    seen_links = set()
    seen_titles = set()
    session = requests.Session()

    for feed_info in RSS_FEEDS:
        name = feed_info["name"]
        url = feed_info["url"]
        logger.info(f"Noudetaan syöte: {name}")

        try:
            response = session.get(url, headers=REQUEST_HEADERS, timeout=10)
            if response.status_code != 200:
                continue

            parsed_feed = feedparser.parse(response.content)
        except Exception as err:
            logger.warning(f"Virhe noudettaessa syötettä '{name}': {err}")
            continue

        entries = parsed_feed.entries
        count_added = 0

        for entry in entries:
            link = getattr(entry, "link", "").strip()
            title = strip_html(getattr(entry, "title", ""))
            norm_title = title.lower().strip()

            if not link or link in seen_links or norm_title in seen_titles:
                continue

            seen_links.add(link)
            seen_titles.add(norm_title)
            published = format_published_date(entry)
            summary = strip_html(getattr(entry, "summary", ""))

            releases.append({
                "title": title,
                "published": published,
                "link": link,
                "summary": summary
            })
            count_added += 1

        logger.info(f"-> Lisätty {count_added} uutta uniikkia tiedotetta.")

    # Järjestetään kronologisesti uusimmasta vanhimpaan
    releases.sort(key=lambda r: r.get("published", ""), reverse=True)
    logger.info(f"Yhteensä {len(releases)} uniikkia pörssitiedotetta koottu.")

    if max_full_text > 0:
        fetch_count = min(len(releases), max_full_text)
        logger.info(f"Ladataan täysi teksti ja taulukot {fetch_count} tiedotteelle...")
        for i, rel in enumerate(releases[:fetch_count]):
            if (i + 1) % 10 == 0 or i == 0:
                logger.info(f"[{i+1}/{fetch_count}] Ladataan sisältö: {rel['title'][:55]}...")
            full_text = extract_full_content_and_tables(session, rel["link"], fallback_summary=rel["summary"])
            rel["full_text"] = full_text

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(releases, f, ensure_ascii=False, indent=2)

    logger.info(f"Arkisto tallennettu tiedostoon: {OUTPUT_FILE}")
    return releases


if __name__ == "__main__":
    fetch_and_save_releases(max_full_text=60)
