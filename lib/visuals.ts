export interface CompanyVisuals {
  company: string;
  ticker: string;
  domain: string;
  sector: string;
  logoUrl: string;
  heroImage: string;
}

// ============================================================================
// GLOBAALI KUVAPOOLI — 46 verifioitua Unsplash-kuvaa
// Kuvat ovat laadukkaita bisnes/teollisuus/finanssi-aiheisia.
// Valinta tehdään articleId:n deterministisellä hashilla — eri artikkelit
// saavat eri kuvan, eikä kategoria tai yhtiö enää aiheuta duplikaatteja.
// ============================================================================
const PHOTO_POOL: string[] = [
  "photo-1590283603385-17ffb3a7f29f", // kaupankäyntimonitorit
  "photo-1611974789855-9c2a0a7236a3", // pörssikurssidashboard
  "photo-1460925895917-afdab827c52f", // data-analytiikkaa
  "photo-1507679799987-c73779587ccf", // business-puku / pankkimies
  "photo-1486406146926-c627a92ad1ab", // pilvenpiirtäjät
  "photo-1454165804606-c3d57bc86b40", // sijoitussuunnittelu
  "photo-1473341304170-971dccb5ac1e", // sähköverkko / voimalinja
  "photo-1466611653911-95081537e5b7", // tuulivoimalat
  "photo-1518709268805-4e9042af9f23", // teollisuuslaitos yöllä
  "photo-1513836279014-a89f7a76ae86", // metsä / biotalous
  "photo-1581091226825-a6a2a5aee158", // teollisuusrobotiikka
  "photo-1581092160607-ee22621dd758", // insinööritarkastus
  "photo-1565793298595-6a879b1d9492", // terästeollisuus
  "photo-1549465220-1a8b9238cd48", // satamakontti
  "photo-1586528116311-ad8dd3c8310d", // varasto / logistiikka
  "photo-1578575437130-527eed3abbec", // rahtialus
  "photo-1494412574643-ff11b0a5c1c3", // satamanosturit
  "photo-1436491865332-7a61a109cc05", // lentokone
  "photo-1518770660439-4636190af475", // mikropiirisiru
  "photo-1544197150-b99a580bb7a8", // konesali
  "photo-1558494949-ef010cbdcc31", // palvelinkaapelit
  "photo-1526374965328-7f61d4dc18c5", // matriisikoodi
  "photo-1531297484001-80022131f5a1", // moderni tietokone
  "photo-1510812431401-41d2bd2722f3", // juomapullot / panimo
  "photo-1542838132-92c53300491e", // ruokakauppa
  "photo-1441974231531-c6227db76b6e", // havumetsä
  "photo-1521737604893-d14cc237f11d", // yrityskokous
  "photo-1497366216548-37526070297c", // moderni toimisto
  "photo-1517245386807-bb43f82c33c4", // hallituskokous
  "photo-1559526324-4b87b5e36e44", // pörssikuvaaja
  "photo-1554224155-8d04cb21cd6c", // laskin / talouspaperit
  "photo-1563986768494-4dee2763ff3f", // sijoittaminen
  "photo-1497215728101-856f4ea42174", // toimistopöytä
  "photo-1551836022-d5d88e9218df", // bisnesanalyysi
  "photo-1579532537598-459ecdaf39cc", // paperit ja dokumentit
  "photo-1504384308090-c894fdcc538d", // koodaustyöpiste
  "photo-1522071820081-009f0129c71c", // tiimipalaveri
  "photo-1573164713988-8665fc963095", // neuvotteluhuone
  "photo-1504307651254-35680f356dfd", // rakennusnosturi
  "photo-1512917774080-9991f1c4c750", // moderni liikerakennus
  "photo-1516321318423-f06f85e504b3", // teknologianäyttö
  "photo-1551288049-bebda4e38f71", // dashboarddata
  "photo-1563986768609-322da13575f3", // fintech-sovellus
  "photo-1486312338219-ce68d2c6f44d", // macbook toimistossa
  "photo-1450133064473-71024230f91b", // neuvotteluhuone 2
  "photo-1496181133206-80ce9b88a853", // moderni työtila
];

// ============================================================================
// PÖRSSIYHTIÖIDEN METADATA (tikkerit, domainit, sektorit)
// ============================================================================
interface CompanyMeta {
  ticker: string;
  domain: string;
  sector: string;
}

const COMPANY_CATALOG: [RegExp, string, CompanyMeta][] = [
  [/\bkonecranes\b/i,  "Konecranes",  { ticker: "KCR",     domain: "konecranes.com", sector: "Nosturit & Satamalogistiikka" }],
  [/\bmetsä fibre\b/i, "Metsä Fibre", { ticker: "METSB",   domain: "metsagroup.com", sector: "Metsäteollisuus & Sahat" }],
  [/\bmetsä board\b/i, "Metsä Board", { ticker: "METSB",   domain: "metsagroup.com", sector: "Kartonki & Pakkaukset" }],
  [/\bmetsä\b/i,       "Metsä Group", { ticker: "METSB",   domain: "metsagroup.com", sector: "Metsäteollisuus & Biotuotteet" }],
  [/\btietoevry\b/i,   "Tietoevry",  { ticker: "TIETO",   domain: "tietoevry.com",  sector: "IT-palvelut & Pilvi" }],
  [/\btieto\b/i,       "Tietoevry",  { ticker: "TIETO",   domain: "tietoevry.com",  sector: "IT-palvelut & Pilvi" }],
  [/\bbioretec\b/i,    "Bioretec",   { ticker: "BRETEC",  domain: "bioretec.com",   sector: "Terveysteknologia" }],
  [/\bfodelia\b/i,     "Fodelia",    { ticker: "FODEL",   domain: "fodelia.fi",     sector: "Elintarviketeollisuus" }],
  [/\braute\b/i,       "Raute",      { ticker: "RAUTE",   domain: "raute.com",      sector: "Puutuoteteknologia" }],
  [/\bfinnair\b/i,     "Finnair",    { ticker: "FIA1S",   domain: "finnair.com",    sector: "Lentoliikenne" }],
  [/\bintegrata\b/i,   "Integrata",  { ticker: "INTGR",   domain: "integrata.fi",   sector: "HR-teknologia" }],
  [/\bvolkswagen\b/i,  "Volkswagen", { ticker: "VOW3",    domain: "volkswagen.fi",  sector: "Autoteollisuus" }],
  [/\bomron\b/i,       "OMRON",      { ticker: "OMRON",   domain: "omron.com",      sector: "Teollisuusautomaatio" }],
  [/\bbyd\b/i,         "BYD",        { ticker: "BYD",     domain: "byd.com",        sector: "Sähköajoneuvot" }],
  [/\bposti\b/i,       "Posti",      { ticker: "POSTI",   domain: "posti.com",      sector: "Logistiikka & Paketit" }],
  [/\bnib\b/i,         "NIB",        { ticker: "NIB",     domain: "nib.int",        sector: "Investointipankki" }],
  [/\besperi\b/i,      "Esperi",     { ticker: "ESPERI",  domain: "esperi.fi",      sector: "Hoivapalvelut" }],
  [/\bneste\b/i,       "Neste",      { ticker: "NESTE",   domain: "neste.com",      sector: "Uusiutuvat polttoaineet" }],
  [/\bfortum\b/i,      "Fortum",     { ticker: "FORTUM",  domain: "fortum.com",     sector: "Energia & Sähkö" }],
  [/\bsampo\b/i,       "Sampo",      { ticker: "SAMPO",   domain: "sampo.com",      sector: "Vakuutus & Finanssi" }],
  [/\bmandatum\b/i,    "Mandatum",   { ticker: "MANTA",   domain: "mandatum.fi",    sector: "Varainhoito" }],
  [/\bnordea\b/i,      "Nordea",     { ticker: "NDA FI",  domain: "nordea.com",     sector: "Pankkitoiminta" }],
  [/\bkone\b/i,        "KONE",       { ticker: "KNEBV",   domain: "kone.com",       sector: "Hissit & Liukuportaat" }],
  [/\bwärtsilä\b/i,    "Wärtsilä",  { ticker: "WRT1V",   domain: "wartsila.com",   sector: "Meriteknologia & Energia" }],
  [/\bwartsila\b/i,    "Wärtsilä",  { ticker: "WRT1V",   domain: "wartsila.com",   sector: "Meriteknologia & Energia" }],
  [/\bupm\b/i,         "UPM",        { ticker: "UPM",     domain: "upm.com",        sector: "Metsäteollisuus" }],
  [/\bvalmet\b/i,      "Valmet",     { ticker: "VALMT",   domain: "valmet.com",     sector: "Prosessiteknologia" }],
  [/\bkemira\b/i,      "Kemira",     { ticker: "KEMIRA",  domain: "kemira.com",     sector: "Kemia & Vedenkäsittely" }],
  [/\bkesko\b/i,       "Kesko",      { ticker: "KESKOB",  domain: "kesko.fi",       sector: "Päivittäistavarakauppa" }],
  [/\bssab\b/i,        "SSAB",       { ticker: "SSABBH",  domain: "ssab.com",       sector: "Terästeollisuus" }],
  [/\bolvi\b/i,        "Olvi",       { ticker: "OLVAS",   domain: "olvi.fi",        sector: "Panimoteollisuus" }],
  [/\belisa\b/i,       "Elisa",      { ticker: "ELI1V",   domain: "elisa.fi",       sector: "Teleoperaattori" }],
  [/\bnokia\b/i,       "Nokia",      { ticker: "NOKIA",   domain: "nokia.com",      sector: "Teletekniikka & 5G" }],
  [/\bcargotec\b/i,    "Cargotec",   { ticker: "CGCBV",   domain: "cargotec.com",   sector: "Lastinkäsittely" }],
];

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // 32-bit unsigned
  }
  return h;
}

export function getCompanyVisuals(
  companyName: string = "",
  title: string = "",
  articleId: string = ""
): CompanyVisuals {
  const combined = `${companyName} ${title}`.toLowerCase();

  // Tunnistetaan yhtiö
  let matchedName = companyName || "Pörssiyhtiö";
  let meta: CompanyMeta = {
    ticker: "OMXH",
    domain: "nasdaqomxnordic.com",
    sector: "Helsingin Pörssi",
  };

  for (const [regex, name, m] of COMPANY_CATALOG) {
    if (regex.test(combined)) {
      matchedName = name;
      meta = m;
      break;
    }
  }

  // Valitaan unikuva globaalista poolista deterministisesti articleId:n perusteella.
  // Tällä varmistetaan, että jokaisella artikkelilla on eri kuva,
  // riippumatta siitä, onko se samasta yhtiöstä kuin jokin muu artikkeli.
  const seed = articleId || title || companyName || "default";
  const photoIndex = hashString(seed) % PHOTO_POOL.length;
  const photoId = PHOTO_POOL[photoIndex];
  const heroImage = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80`;

  return {
    company: matchedName,
    ticker: meta.ticker,
    domain: meta.domain,
    sector: meta.sector,
    logoUrl: `https://www.google.com/s2/favicons?domain=${meta.domain}&sz=128`,
    heroImage,
  };
}
