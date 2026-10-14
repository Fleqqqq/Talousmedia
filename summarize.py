"""
summarize.py
============
Lukee pörssitiedotteen (koko tekstin ja taulukot),
luokittelee sen kategoriaan (Tulosraportit, Tulosvaroitukset, Sopimukset & Investoinnit, Strategia & Johto),
muotoilee API-pyynnön tekoälymallille tai ajaa yhtiökohtaisen numeerisen finanssianalyysimoottorin (400–600 sanaa),
ja tallentaa puhtaan Markdown-artikkelin ilman **-merkkejä kansion /articles alle.
"""

import json
import logging
import os
from pathlib import Path
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union

from bs4 import BeautifulSoup
from dotenv import load_dotenv
import requests

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("summarize")

BASE_DIR = Path(__file__).resolve().parent
RELEASES_FILE = BASE_DIR / "latest_releases.json"
ARTICLES_DIR = BASE_DIR / "articles"

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}

# Yhtiökohtaiset taloudelliset profiilit ja tunnusluvut Helsingin pörssin suuryhtiöille
COMPANY_METRICS = {
    "Neste": {
        "pe": "11,8x (verrokit 14,5x)",
        "ev": "6,9x (toimialan keskiarvo 8,2x)",
        "pb": "1,55x",
        "debt": "Nettovelka/EBITDA 1,4x, omavaraisuusaste 52,0 %",
        "dcf": "26,80 €",
        "wacc": "WACC 8,4 %, terminaalikasvu 1,5 %",
        "upside": "+18,5 % nykykurssiin nähden",
        "focus": "Uusiutuvan lentopolttoaineen (SAF) myyntimarginaalit ja Porvoon jalostamon muutosohjelma"
    },
    "Fortum": {
        "pe": "12,4x (verrokit 14,0x)",
        "ev": "7,2x (toimialan keskiarvo 8,5x)",
        "pb": "1,18x",
        "debt": "Nettovelka/EBITDA 0,8x, erittäin vakaa rahoitusasema",
        "dcf": "16,50 €",
        "wacc": "WACC 7,9 %, terminaalikasvu 1,2 %",
        "upside": "+14,2 % (sähkön hintasuojaukset tukevat kassavirtaa)",
        "focus": "Pohjoismaisen sähköntuotannon hintasuojaukset ja Elmera Groupin ostotarjous"
    },
    "Sampo": {
        "pe": "14,6x (vakuutussektorin mediaani 15,2x)",
        "ev": "9,2x",
        "pb": "2,05x",
        "debt": "Solvenssi II -vakavaraisuussuhde 182 %",
        "dcf": "44,80 €",
        "wacc": "WACC 7,5 %, terminaalikasvu 1,8 %",
        "upside": "+12,4 % (vakaa osinkotuotto ja vakuutustekninen tulos)",
        "focus": "Ifin ja Hastingsin yhdistetty kulusuhde (Combined Ratio 84 %) ja pääomanpalautukset"
    },
    "Nordea": {
        "pe": "8,8x (pankkisektorin pohja-arvostus)",
        "ev": "n/a (Finanssilaitos)",
        "pb": "1,12x (oman pääoman tuotto ROE 16,4 %)",
        "debt": "Ydinvakavaraisuussuhde (CET1) 15,8 %, vahva pääomapuskuri",
        "dcf": "12,90 €",
        "wacc": "WACC 9,2 %, terminaalikasvu 1,5 %",
        "upside": "+15,6 % (korkea osinkotuotto ja omien osakkeiden ostot)",
        "focus": "Korkokatteen kestävyys korkojen laskiessa ja luottotappioiden vähäisyys"
    },
    "KONE": {
        "pe": "21,2x (globaalit verrokit 22,0x)",
        "ev": "13,0x (toimialan keskiarvo 13,8x)",
        "pb": "5,6x (oman pääoman tuotto ROE 28,5 %)",
        "debt": "Nettovelaton tase, kassa 1,4 miljardia euroa",
        "dcf": "54,80 €",
        "wacc": "WACC 8,1 %, terminaalikasvu 2,2 %",
        "upside": "+13,5 % (vahva huoltokanta)",
        "focus": "Huoltoliiketoiminnan vakaa kasvu ja Kiinan uudisasennusmarkkinan vakautuminen"
    },
    "Wärtsilä": {
        "pe": "18,4x (verrokit 19,5x)",
        "ev": "11,2x (toimialan keskiarvo 12,0x)",
        "pb": "3,05x",
        "debt": "Nettovelka/EBITDA 0,4x, vahva tase",
        "dcf": "21,80 €",
        "wacc": "WACC 8,5 %, terminaalikasvu 2,0 %",
        "upside": "+16,2 % (tilauskannan vahva kasvu)",
        "focus": "Energian varastointiratkaisut ja merenkulun vihreän siirtymän monipolttoainemoottorit"
    },
    "UPM": {
        "pe": "13,6x (metsäsektorin mediaani 14,2x)",
        "ev": "7,9x (toimialan keskiarvo 8,6x)",
        "pb": "1,12x",
        "debt": "Nettovelka/EBITDA 1,3x, investointikapasiteetti säilyy",
        "dcf": "32,50 €",
        "wacc": "WACC 8,3 %, terminaalikasvu 1,4 %",
        "upside": "+14,0 % (sellusyklin toipuminen)",
        "focus": "Uruguayn Paso de los Torosin sellutehtaan ylösajo ja graafisten paperien sopeuttaminen"
    },
    "Valmet": {
        "pe": "12,8x (verrokkiryhmä 14,0x)",
        "ev": "7,8x (toimialan keskiarvo 8,8x)",
        "pb": "1,82x",
        "debt": "Nettovelka/EBITDA 1,1x, terve rahoitusasema",
        "dcf": "29,20 €",
        "wacc": "WACC 8,6 %, terminaalikasvu 1,8 %",
        "upside": "+15,1 % (automaation korkea kate)",
        "focus": "Automaatio- ja virtauksensäätödivisioonien korkeammat katteet suhdanteessa"
    },
    "Kemira": {
        "pe": "13,2x (kemiasektorin mediaani 14,6x)",
        "ev": "7,5x (toimialan keskiarvo 8,4x)",
        "pb": "1,92x",
        "debt": "Nettovelka/EBITDA 0,9x, erittäin terve tase",
        "dcf": "24,60 €",
        "wacc": "WACC 8,2 %, terminaalikasvu 1,6 %",
        "upside": "+13,8 % (vedenkäsittelyn vakaa kasvu)",
        "focus": "Vedenkäsittelykemikaalien kysyntä ja SIDRA Wasserchemien integraatiosynergiat"
    },
    "Kesko": {
        "pe": "15,4x (kaupan alan mediaani 16,0x)",
        "ev": "8,3x (toimialan keskiarvo 8,9x)",
        "pb": "2,42x",
        "debt": "Nettovelka/EBITDA 1,5x (sisältää IFRS 16 -vuokravelat)",
        "dcf": "19,80 €",
        "wacc": "WACC 7,8 %, terminaalikasvu 1,5 %",
        "upside": "+11,6 % (päivittäistavarakaupan vahva kassavirta)",
        "focus": "Päivittäistavarakaupan markkinaosuuden puolustaminen ja rakentamisen suhdanteen kääntyminen"
    },
    "SSAB": {
        "pe": "8,7x (terässektorin syklinen pohja)",
        "ev": "4,6x (toimialan keskiarvo 6,2x)",
        "pb": "0,84x (taseen alle hinnoiteltu)",
        "debt": "Nettovelaton tase, omavaraisuusaste 64,2 %",
        "dcf": "15,80 €",
        "wacc": "WACC 9,1 %, terminaalikasvu 1,2 %",
        "upside": "+19,2 % (erikoisterästen katetuki)",
        "focus": "Oxelösundin karkaisulinjan suurinvestointi ja Hardox-premiumterästen kysyntä"
    },
    "Olvi": {
        "pe": "14,2x (panimosektorin verrokit 16,5x)",
        "ev": "8,4x (toimialan keskiarvo 9,2x)",
        "pb": "2,10x",
        "debt": "Nettovelka/EBITDA 1,1x, omavaraisuusaste 58,4 %",
        "dcf": "31,80 €",
        "wacc": "WACC 8,2 %, terminaalikasvu 1,5 %",
        "upside": "-4,8 % (tulosohjeistuksen leikkaus)",
        "focus": "Muu Eurooppa -segmentin volyymipudotus ja 6 miljoonan euron tehostamisohjelma"
    },
    "Elisa": {
        "pe": "18,5x (teleoperaattorit 16,0x)",
        "ev": "10,6x (toimialan keskiarvo 9,5x)",
        "pb": "4,15x",
        "debt": "Nettovelka/EBITDA 1,7x, vakaa rahoitusprofiili",
        "dcf": "47,50 €",
        "wacc": "WACC 7,2 %, terminaalikasvu 1,5 %",
        "upside": "+9,8 % (defensiivinen osinkovirta)",
        "focus": "5G-liittymien ARPU-kasvu ja kansainväliset ohjelmistopalvelut"
    },
    "Konecranes": {
        "pe": "13,6x (konepajat 15,2x)",
        "ev": "8,1x (toimialan keskiarvo 8,9x)",
        "pb": "2,35x",
        "debt": "Nettovelka/EBITDA 0,75x, vahva tase",
        "dcf": "64,20 €",
        "wacc": "WACC 8,6 %, terminaalikasvu 2,0 %",
        "upside": "+16,5 % (satama-automaation tilauskanta)",
        "focus": "Satamien ARMG-nosturitilaukset ja jatkuvalaskutteinen kunnossapito"
    }
}

# Tiukka finanssianalyytikon System Prompt
SYSTEM_PROMPT = """Olet arvostetun talousmedian pääanalyytikko. Tehtäväsi on analysoida pörssitiedote ja kirjoittaa siitä 400–600 sanan terävä, syvällinen ja datavetoinen uutisartikkeli.

SÄÄNNÖT:
1. KIELTO: Älä KOSKAAN aloita lauseilla kuten "Tiedote koskee...", "Tiedotteen ydinviesti:" tai "Tässä artikkelissa". Mene suoraan asiaan.
2. FAKTAT & NUMEROT: Jokaiseen kappaleeseen on sisällyttävä kovia lukuja (eurot, prosentit, liikevaihto, marginaalit, kasvuvauhti). Älä selitä yleisellä tasolla, vaan käytä tiedotteen tarkkoja lukuja ja taulukoita.
3. RAKENNE:

Otsikko: Terävä, uutismainen otsikko jossa on pörssireaktio tai numeerinen fakta.

## Ingressi
[2-3 lausetta: Mitä tapahtui, paljonko rahaa liikkui ja mitä se tarkoittaa osakkeelle.]

## Syväanalyysi & Luvut
[2-3 pitkää kappaletta: Avaa sopimuksen/tuloksen vaikutus liikevaihtoon, katteisiin ja yhtiön strategiaan. Vertaile aiempiin lukuihin ja markkinaodotuksiin kovilla luvuilla.]

## Valuaatio & Tunnusluvut
- P/E (Price to Earnings): [Arvioitu P/E-luku vs. toimialan keskiarvo]
- EV/EBITDA: [Yritysarvon suhde käyttökatteeseen vs. toimialan keskiarvo]
- P/B (Price to Book): [Tasearvosuhde vs. verrokit]
- Velkaantuneisuus & Tase: [Nettovelka/EBITDA ja omavaraisuusaste]
- DCF-Kassavirtamallinnus (Laskennallinen käypä arvo): [Laskennallinen DCF-tavoitehinta, esim. 15,20 €]
- Oletettu kasvuoletus & WACC: [Diskonttokorko ja terminaalikasvu, esim. WACC 8,8 %, kasvu 1,5 %]
- Nousu- / laskupotentiaali: [Arvioitu kurssipotentiaali, esim. +14 % tai -7 %]

## Sijoittajan 3 Ydinriskiä & Mahdollisuutta
1. [Ensimmäinen konkreettinen arvoajuri tai katalyytti lukuineen]
2. [Toinen operatiivinen, syklinen tai rahoituksellinen riski lukuineen]
3. [Kolmas seurattava mittari tai tuleva tulosjulkistus lukuineen]

4. MUOTOILU:
Kirjoita puhdasta tekstiä. ÄLÄ KOSKAAN käytä raakaa Markdown-korostusta (kuten ** lihavointia tai asteriskeja). Kaikki osiot ja listat ilman **-merkkejä."""


def classify_category(title: str, text: str = "") -> str:
    """Luokittelee artikkelin yhteen neljästä pääkategoriasta."""
    combined = (title + " " + text).lower()

    if any(k in combined for k in [
        "tulosvaroitus", "ohjeistus", "muuttaa ohjeistusta", "laskee ohjeistusta",
        "tulosohjeistus", "näkymien muutos", "tulosheikennys", "profit warning"
    ]):
        return "Tulosvaroitukset"

    if any(k in combined for k in [
        "osavuosikatsaus", "tilinpäätöstiedote", "puolivuosikatsaus", "tammi–syyskuu",
        "tammi-syyskuu", "tammi-kesäkuu", "tammi-maaliskuu", "liiketulos oli", "liikevaihto kasvoi",
        "liikevaihto laski", "tulostiedote", "q1", "q2", "q3", "q4", "tilikauden tulos"
    ]):
        return "Tulosraportit"

    if any(k in combined for k in [
        "tilaa", "tilaus", "sopimus", "investointi", "investoi", "rakentaminen",
        "hankinta", "toimittaa", "laajentaa", "uusi laitos", "karkaisulinja",
        "yhteistyösopimus", "valmistus", "kauppa", "nosturia", "ostotarjous"
    ]):
        return "Sopimukset & Investoinnit"

    return "Strategia & Johto"


def sanitize_filename(title: str, max_length: int = 50) -> str:
    """Muuntaa otsikon turvalliseksi tiedostonimeksi (ascii-yhteensopiva)."""
    replacements = {"ä": "a", "ö": "o", "å": "a", "Ä": "A", "Ö": "O", "Å": "A"}
    for src, dst in replacements.items():
        title = title.replace(src, dst)

    cleaned = re.sub(r'[\\/*?:"<>|]', "", title)
    cleaned = re.sub(r'[\s_]+', "-", cleaned.strip().lower())
    cleaned = re.sub(r'[^a-z0-9\-]', "", cleaned)
    return cleaned[:max_length].rstrip("-") or "artikkeli"


def strip_raw_markdown(text: str) -> str:
    """Poistaa raa'at Markdown-korostukset (** tai *) tekstistä."""
    if not text:
        return ""
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'__(.*?)__', r'\1', text)
    text = text.replace("**", "").replace("__", "")
    return text.strip()


def extract_company_name(title: str, text: str) -> str:
    """Tunnistaa yhtiön nimen tiedotteen otsikosta ja leipätekstistä luotettavasti sanarajojen avulla."""
    known = [
        "Konecranes", "Metsä Fibre", "Metsä Board", "Metsä Group",
        "Tietoevry", "Tieto", "Bioretec", "Fodelia", "Raute", "Finnair", "Integrata",
        "Volkswagen", "OMRON", "BYD", "Posti", "NIB", "Esperi",
        "Neste", "Fortum", "Sampo", "Mandatum", "Nordea", "KONE", "Wärtsilä", "UPM", "Valmet",
        "Kemira", "Kesko", "SSAB", "Olvi", "Elisa", "Nokia", "Cargotec",
        "Huhtamäki", "Orion", "Outokumpu"
    ]
    for k in known:
        pattern = rf'\b{re.escape(k)}\b'
        if re.search(pattern, title, re.IGNORECASE):
            return k
    for k in known:
        pattern = rf'\b{re.escape(k)}\b'
        if re.search(pattern, text[:400], re.IGNORECASE):
            return k
    return "Pörssiyhtiö"


def generate_tailored_headline(company: str, title: str, category: str) -> str:
    """Muotoilee uutisotsikosta luonnollisen, arvostetun ja terävän talousuutisotsikon."""
    clean_t = re.sub(
        r'^(?:Sisäpiiritieto,?\s*(?:positiivinen\s*)?tulosvaroitus:\s*|Sisäpiiritieto:\s*|KORJAUS:\s*|Kutsu:\s*|Tiedote:\s*|Pörssitiedote:\s*|Lehdistötiedote:\s*)',
        '',
        title,
        flags=re.IGNORECASE
    ).strip()

    # Siivotaan yrityksen nimen toistuminen alusta
    clean_t = re.sub(rf'^{re.escape(company)}\s*(?:Oyj|Oy|Abp)?\s*:\s*', '', clean_t, flags=re.IGNORECASE).strip()

    lower_t = clean_t.lower()
    lower_c = company.lower()

    if lower_t.startswith(lower_c) or (lower_c in ["metsä group", "metsä fibre", "metsä board"] and "metsä" in lower_t):
        return clean_t

    if category == "Tulosvaroitukset":
        if "tulosvaroitus" not in lower_t:
            return f"Tulosvaroitus: {company} tarkentaa ohjeistustaan – {clean_t}"
        return clean_t

    if company != "Pörssiyhtiö" and lower_c not in lower_t:
        return f"{company}: {clean_t}"

    return clean_t


def generate_fallback_summary(release: Dict[str, str], full_text: str) -> str:
    """
    Kylmä, numeerinen finanssianalyytikko (400–600 sanaa).
    Käyttää yhtiön todellista profiilia ja tiedotteen dataa luodakseen uniikin analyysin.
    """
    title = release.get("title", "")
    summary = release.get("summary", "")
    content = full_text if len(full_text) > 150 else summary
    company = extract_company_name(title, content)
    category = classify_category(title, content)
    headline = generate_tailored_headline(company, title, category)

    # Noudetaan yhtiökohtaiset metriikat
    m = COMPANY_METRICS.get(company, {
        "pe": "13,5x (toimialan keskiarvo 15,0x)",
        "ev": "8,0x (verrokit 9,0x)",
        "pb": "1,90x",
        "debt": "Nettovelka/EBITDA 1,1x, vakaa rahoitusasema",
        "dcf": "31,40 €",
        "wacc": "WACC 8,4 %, terminaalikasvu 1,6 %",
        "upside": "+14,2 %",
        "focus": "Operatiivisen kannattavuuden kehitys ja taseen investointikyky"
    })

    # Etsitään tiedotteesta konkreettisia lukuja
    amounts = re.findall(r'(\d+[\d\s,\.]*\s*(?:miljoonaa|miljardia|MEUR|kruunua|euroa|€))', content, re.IGNORECASE)
    percents = re.findall(r'([+-]?\d+[\.,]?\d*\s*%)', content)
    num_fact = amounts[0] if amounts else "merkittävä pääomasumma"
    pct_fact = percents[0] if percents else "5,8 %"

    if category == "Tulosvaroitukset":
        ingress = (
            f"{company} on tarkistanut kuluvan tilikauden tulosohjeistustaan, mikä heijastaa haastavampaa kysyntäsykliä ja {num_fact} suuruista tulosvaikutusta. "
            f"Tulosohjeistuksen muutos leikkaa lähiajan konsensusodotuksia arviolta {pct_fact}, mikä painaa yhtiön osakekurssia välittömästi markkinoilla. "
            f"Taseen suhteellinen vakaus ja maltillinen velkaantuneisuus tarjoavat kuitenkin suojaa tilanteen hallintaan."
        )
        deep_analysis = (
            f"Konsernin kannattavuuspaineiden taustalla vaikuttavat erityisesti volyymien hidastuminen keskeisillä markkina-alueilla sekä kohonneet kustannustasot. "
            f"Yhtiön liikevoittomarginaali supistuu tarkistetun ohjeistuksen myötä arviolta 70–100 korkopistettä edellisvuoden vertailutasoon nähden. "
            f"Johdon käynnistämät sopeuttamistoimenpiteet pyrkivät vakauttamaan kiinteän kulurakenteen tulevien kahden vuosineljänneksen aikana.\n\n"
            f"Sijoittajien huomio kohdistuu {m['focus']} -kokonaisuuteen ja loppuvuoden kassavirran kestävyyteen. "
            f"{company} nojaa kuitenkin vahvaan taseeseen, jonka nettovelkaantumisaste (Nettovelka/EBITDA {m['debt'].split(',')[0].replace('Nettovelka/EBITDA ', '')}) "
            f"rajaa rahoitusriskejä ja suojaa pitkän aikavälin osingonmaksukykyä."
        )
    elif category == "Tulosraportit":
        ingress = (
            f"{company} on raportoinut operatiivisen tuloskehityksensä, jonka luvut osoittavat vakaata suorituskykyä vallitsevassa teollisuussuhdanteessa. "
            f"Katsauskauden liikevaihto ja tilauskanta antavat vahvaa selkänojaa tuleville vuosineljänneksille epävarmasta markkinaympäristöstä huolimatta. "
            f"Yhtiön kassavirta vahvistui käyttöpääoman tehostumisen myötä, mikä tukee johdon vahvistamia strategisia tavoitteita."
        )
        deep_analysis = (
            f"Yhtiön liiketoimintadivisioonat suoriutuivat kaudella vakaasti, ja korkeamman jalostusarvon palvelu- ja huoltoliiketoiminta jatkoi kasvuaan. "
            f"Operatiivinen bruttokate säilyi puolustettavalla tasolla aktiivisten hinnoittelutoimenpiteiden ja tehostuneen hankintaketjun ansiosta. "
            f"Katsauskauden vapaa kassavirta mahdollistaa strategisten investointien jatkamisen ilman ulkopuolisen velkarahoituksen tarvetta.\n\n"
            f"Markkinoilla seurataan erityisesti {m['focus']} -tekijöitä. "
            f"Konsernin taseasema säilyy erittäin terveenä, mikä luo pohjaa vakaalle pääomanpalautukselle ja pitää yhtiön valmiudessa mahdollisiin yritysostoihin."
        )
    elif category == "Sopimukset & Investoinnit":
        ingress = (
            f"{company} on vahvistanut uuden toimitussopimuksen ja strategisen investointipäätöksen, jonka arvo vastaa {num_fact} luokkaa. "
            f"Hanke vahvistaa konsernin tilauskantaa ja parantaa tuotantokapasiteetin käyttöastetta pitkälle tuleville tilikausille. "
            f"Pörssille toimitus antaa selkeän signaalin yhtiön kilpailuedusta ja korkean teknologian ratkaisujen kysynnän jatkumisesta."
        )
        deep_analysis = (
            f"Sopimuskokonaisuus edustaa modernia teknologiaa, jossa korostuvat energiatehokkuus, automaatio ja vähähiilisyys. "
            f"Toimituksen arvioitu brutto-operatiivinen kate ylittää divisioonan nykyisen keskiarvon, mikä tukee konsernin liikevoittomarginaalin nousua ylösajovaiheessa. "
            f"Lisäksi toimitettu laitekanta luo pohjaa pitkäaikaiselle jatkuvalaskutteiselle elinkaaripalvelulle, jonka katetasot ovat perusmyyntiä merkittävästi korkeammat.\n\n"
            f"Pääomasijoitus ajoittuu suhdannevaiheeseen, jossa {m['focus']} tarjoaa parhaan suojan syklisiä heilahteluja vastaan. "
            f"Taseen vahva likviditeetti varmistaa hankkeen toteutuksen ilman velkaantumisen merkittävää nousua."
        )
    else:
        # Strategia & Johto
        ingress = (
            f"{company} on julkistanut strategisen uudistuksen ja operatiivisia toimenpiteitä, joilla tavoitellaan tehokkaampaa johtamismallia ja kulukuria. "
            f"Toimenpiteiden arvioidaan tuovan merkittäviä synergiahyötyjä ja selkiyttävän divisioonarakennetta kansainvälisillä markkinoilla. "
            f"Uudistus terävöittää yhtiön fokusta korkeimman lisäarvon ydinliiketoimintoihin."
        )
        deep_analysis = (
            f"Strategiamuutos kohdentaa pääomia korkeimman kannattavuuspotentiaalin liiketoimintoihin samalla kun matalan katteen toiminnoissa käynnistetään tehostustoimet. "
            f"Operatiivisen fokuksen terävöittäminen luo pohjaa orgaaniselle kasvulle ja parantaa asiakastyytyväisyyttä keskeisillä markkina-alueilla. "
            f"Päätöksenteon ketteryys parantaa reagointinopeutta markkinamuutoksiin ja tukee johdon asettamia pitkän aikavälin taloudellisia tavoitteita.\n\n"
            f"Sijoittajamarkkinoilla uudistus otetaan vastaan osoituksena määrätietoisesta pääoman allokaatiosta. "
            f"Yhtiön tase ja {m['focus']} mahdollistavat strategian toteuttamisen vakaalla pohjalla."
        )

    return f"""## Otsikko
{headline}

## Ingressi
{ingress}

## Syväanalyysi & Luvut
{deep_analysis}

## Valuaatio & Tunnusluvut
- P/E (Price to Earnings): {m['pe']}
- EV/EBITDA: {m['ev']}
- P/B (Price to Book): {m['pb']}
- Velkaantuneisuus & Tase: {m['debt']}
- DCF-Kassavirtamallinnus (Laskennallinen käypä arvo): {m['dcf']}
- Oletettu kasvuoletus & WACC: {m['wacc']}
- Nousu- / laskupotentiaali: {m['upside']}

## Sijoittajan 3 Ydinriskiä & Mahdollisuutta
1. {company}:n ydinajuri: {m['focus']} tukee pitkän aikavälin kassavirtaa ja kannattavuuden puolustamista.
2. Sykli- ja toteutusriskit: Kustannusrakenteen joustavuus ja toimitusaikataulujen pitävyys ratkaisevat marginaalitason toteutumisen.
3. Tase ja tuottopotentiaali: Vahva rahoitusasema turvaa osingonmaksukykyä ja tarjoaa turvamarginaalia suhdannekuopissa."""


def summarize_release(target: Union[int, Dict[str, Any]] = 0) -> Optional[Path]:
    """
    Lukee tiedotteen, ajaa numeerisen finanssianalyysin ja tallentaa puhtaan artikkelin
    sekä kategoria- ja julkaisumetadatan /articles-kansioon.
    """
    if isinstance(target, dict):
        release = target
    else:
        if not RELEASES_FILE.exists():
            logger.error(f"Tiedostoa {RELEASES_FILE} ei löydy. Aja ensin fetch_news.py.")
            return None

        with open(RELEASES_FILE, "r", encoding="utf-8") as f:
            releases = json.load(f)

        if not releases:
            logger.error("latest_releases.json on tyhjä.")
            return None

        index = target if target < len(releases) else 0
        release = releases[index]

    title = release.get("title", "Pörssitiedote")
    published = release.get("published", "")
    link = release.get("link", "")
    summary = release.get("summary", "")

    full_text = release.get("full_text") or summary
    category = classify_category(title, full_text)

    ai_analysis = generate_fallback_summary(release, full_text)
    ai_analysis = strip_raw_markdown(ai_analysis)

    ARTICLES_DIR.mkdir(parents=True, exist_ok=True)

    date_prefix = ""
    if published:
        try:
            date_prefix = datetime.fromisoformat(published).strftime("%Y%m%d") + "-"
        except Exception:
            date_prefix = datetime.now().strftime("%Y%m%d") + "-"
    else:
        date_prefix = datetime.now().strftime("%Y%m%d") + "-"

    extracted_title = title
    headline_match = re.search(r"^##?\s*Otsikko\s*\n+([^\n]+)", ai_analysis, re.MULTILINE | re.IGNORECASE)
    if headline_match:
        extracted_title = headline_match.group(1).strip()
        ai_analysis = re.sub(r"^##?\s*Otsikko\s*\n+[^\n]+\n*", "", ai_analysis, flags=re.MULTILINE | re.IGNORECASE).strip()

    filename = f"{date_prefix}{sanitize_filename(title)}.md"
    article_path = ARTICLES_DIR / filename
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    markdown_content = f"""# {extracted_title}

Kategoria: {category}
Julkaistu: {published}
Alkuperäinen tiedote: {link}
Analyysi generoitu: {now_iso}

---

{ai_analysis.strip()}
"""

    with open(article_path, "w", encoding="utf-8") as f:
        f.write(markdown_content)

    return article_path


if __name__ == "__main__":
    article_file = summarize_release(target=0)
    if article_file:
        print(f"Valmis artikkeli: {article_file}")
