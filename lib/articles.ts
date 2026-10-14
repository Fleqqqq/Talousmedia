import fs from "fs";
import path from "path";

export interface ArticleData {
  id: string;
  title: string;
  company: string;
  category: string;
  published: string;
  sourceLink: string;
  quickSummary: string;
  businessImpact?: string;
  freeSectionMd: string;
  paidSectionMd: string;
  metrics: {
    revenue?: string;
    ebit?: string;
    debt?: string;
  };
  valuation: {
    pe?: string;
    evEbitda?: string;
    pb?: string;
    comment?: string;
  };
  dcf: {
    fairValue?: string;
    growthAndWacc?: string;
    upside?: string;
    base?: string;
    bull?: string;
    bear?: string;
  };
  keyPoints: string[];
}

const ARTICLES_DIR = path.join(process.cwd(), "articles");

export function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .trim();
}

function extractCompanyFromTitle(title: string): string {
  const upper = title.toUpperCase();
  const known = [
    { key: "KONECRANES", name: "Konecranes" },
    { key: "METSÄ FIBRE", name: "Metsä Fibre" },
    { key: "METSÄ BOARD", name: "Metsä Board" },
    { key: "METSÄ GROUP", name: "Metsä Group" },
    { key: "METSÄ", name: "Metsä Group" },
    { key: "TIETOEVRY", name: "Tietoevry" },
    { key: "TIETO", name: "Tietoevry" },
    { key: "BIORETEC", name: "Bioretec" },
    { key: "FODELIA", name: "Fodelia" },
    { key: "RAUTE", name: "Raute" },
    { key: "FINNAIR", name: "Finnair" },
    { key: "INTEGRATA", name: "Integrata" },
    { key: "VOLKSWAGEN", name: "Volkswagen" },
    { key: "OMRON", name: "OMRON" },
    { key: "BYD", name: "BYD" },
    { key: "POSTI", name: "Posti" },
    { key: "NIB", name: "NIB" },
    { key: "ESPERI", name: "Esperi" },
    { key: "NESTE", name: "Neste" },
    { key: "FORTUM", name: "Fortum" },
    { key: "SAMPO", name: "Sampo" },
    { key: "MANDATUM", name: "Mandatum" },
    { key: "NORDEA", name: "Nordea" },
    { key: "KONE", name: "KONE" },
    { key: "WÄRTSILÄ", name: "Wärtsilä" },
    { key: "WARTSILA", name: "Wärtsilä" },
    { key: "UPM", name: "UPM" },
    { key: "VALMET", name: "Valmet" },
    { key: "KEMIRA", name: "Kemira" },
    { key: "KESKO", name: "Kesko" },
    { key: "SSAB", name: "SSAB" },
    { key: "OLVI", name: "Olvi" },
    { key: "ELISA", name: "Elisa" },
    { key: "NOKIA", name: "Nokia" },
    { key: "CARGOTEC", name: "Cargotec" },
    { key: "HUHTAMÄKI", name: "Huhtamäki" },
    { key: "ORION", name: "Orion" },
  ];

  for (const item of known) {
    const regex = new RegExp(`\\b${item.key}\\b`, "i");
    if (regex.test(upper)) {
      return item.name;
    }
  }

  const match = title.match(/^([A-ZÅÄÖa-zåäö0-9\s\-]+?)(?::|\s+(?:Oy|Oyj|Abp))/);
  if (match && match[1].trim().length < 30) {
    return match[1].trim();
  }

  return "Pörssiyhtiö";
}

export function getAllArticles(): ArticleData[] {
  if (!fs.existsSync(ARTICLES_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => b.localeCompare(a)); // Uusin ensin

  const articles: ArticleData[] = [];

  for (const file of files) {
    const fullPath = path.join(ARTICLES_DIR, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const id = file.replace(/\.md$/, "");

    const article = parseArticleMarkdown(id, content);
    articles.push(article);
  }

  return articles;
}

export function getArticleById(id: string): ArticleData | null {
  const fullPath = path.join(ARTICLES_DIR, `${id}.md`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const content = fs.readFileSync(fullPath, "utf-8");
  return parseArticleMarkdown(id, content);
}

function parseArticleMarkdown(id: string, content: string): ArticleData {
  // Otsikko
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const rawTitle = titleMatch ? titleMatch[1].trim() : "Pörssianalyysi";
  const title = stripMarkdown(rawTitle);

  // Julkaisuaika
  const pubMatch = content.match(/(?:\*\*|\b)Julkaistu:(?:\*\*)?\s*(.+)$/m);
  const published = pubMatch ? stripMarkdown(pubMatch[1]) : "";

  // Alkuperäinen linkki
  const linkMatch =
    content.match(/(?:\*\*|\b)Alkuperäinen tiedote:(?:\*\*)?\s*\[.*?\]\((.*?)\)/m) ||
    content.match(/(?:\*\*|\b)Alkuperäinen tiedote:(?:\*\*)?\s*(https?:\/\/[^\s]+)/m);
  const sourceLink = linkMatch ? linkMatch[1].trim() : "";

  // Kategoria
  const catMatch = content.match(/(?:\*\*|\b)Kategoria:(?:\*\*)?\s*(.+)$/m);
  let category = catMatch ? stripMarkdown(catMatch[1]) : "";
  if (!category) {
    const combined = (title + " " + content).toLowerCase();
    if (combined.includes("tulosvaroitus") || combined.includes("ohjeistus") || combined.includes("profit warning")) {
      category = "Tulosvaroitukset";
    } else if (
      combined.includes("osavuosikatsaus") ||
      combined.includes("tilinpäätös") ||
      combined.includes("liiketulos oli") ||
      combined.includes("tammi–syyskuu") ||
      combined.includes("tammi-syyskuu") ||
      combined.includes("q1") ||
      combined.includes("q2") ||
      combined.includes("q3") ||
      combined.includes("q4")
    ) {
      category = "Tulosraportit";
    } else if (
      combined.includes("tilaa") ||
      combined.includes("tilaus") ||
      combined.includes("sopimus") ||
      combined.includes("investointi") ||
      combined.includes("rakentaminen") ||
      combined.includes("toimittaa")
    ) {
      category = "Sopimukset & Investoinnit";
    } else {
      category = "Strategia & Johto";
    }
  }

  const company = extractCompanyFromTitle(title);

  // Erotellaan ilmainen ja maksullinen osio
  const paywallMarkers = [
    "## Valuaatio & Tunnusluvut",
    "## Tunnuslukuvertailu",
    "## DCF-Kassavirtamallinnus",
    "## Syvälliset luvut & Odotukset",
    "## Tärkeimmät tunnusluvut"
  ];

  let freePart = content;
  let paidPart = "";

  for (const marker of paywallMarkers) {
    if (content.includes(marker)) {
      const splitIndex = content.indexOf(marker);
      freePart = content.substring(0, splitIndex).trim();
      paidPart = content.substring(splitIndex).trim();
      break;
    }
  }

  // 1. Ingressi (Otsikko & Ingressi TAI Ingressi TAI Yhtiön nimi & Tulos pähkinänkuoressa)
  let quickSummary = "";
  const ingressMatch =
    content.match(/## Ingressi\s+([\s\S]+?)(?=##|$)/i) ||
    content.match(/## Otsikko & Ingressi\s+([\s\S]+?)(?=##|$)/i) ||
    content.match(/## Yhtiön nimi & Tulos pähkinänkuoressa\s+([\s\S]+?)(?=##|$)/i);
  if (ingressMatch) {
    quickSummary = stripMarkdown(ingressMatch[1].trim());
  }

  // 2. Syväanalyysi & Luvut TAI Liiketoimintavaikutus & Taustat
  let businessImpact = "";
  const impactMatch =
    content.match(/## Syväanalyysi & Luvut\s+([\s\S]+?)(?=##|$)/i) ||
    content.match(/## Liiketoimintavaikutus & Taustat\s+([\s\S]+?)(?=##|$)/i);
  if (impactMatch) {
    businessImpact = stripMarkdown(impactMatch[1].trim());
  }

  // 3. Tunnusluvut & Tunnuslukuvertailu / Valuaatio
  const peMatch = content.match(/- (?:\*\*)?P\/E[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const evMatch = content.match(/- (?:\*\*)?EV\/EBITDA[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const pbMatch = content.match(/- (?:\*\*)?P\/B[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const debtMatch = content.match(/- (?:\*\*)?Velkaantuneisuus[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const revMatch = content.match(/- (?:\*\*)?Liikevaihto[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const ebitMatch = content.match(/- (?:\*\*)?Liikevoitto[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const valComMatch = content.match(/- (?:\*\*)?Arvostuskommentti[^*:\n]*(?:\*\*)?:\s*(.+)$/im);

  // 4. DCF-Kassavirtamallinnus
  const dcfFairValueMatch =
    content.match(/- (?:\*\*)?DCF.*?Laskennallinen käypä arvo[^*:\n]*(?:\*\*)?:\s*(.+)$/im) ||
    content.match(/- (?:\*\*)?Laskennallinen käypä arvo[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const dcfGrowthMatch = content.match(/- (?:\*\*)?Oletettu kasvuoletus[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const dcfUpsideMatch = content.match(/- (?:\*\*)?Nousu- \/ laskupotentiaali[^*:\n]*(?:\*\*)?:\s*(.+)$/im);

  // Perinteisemmät Base/Bull/Bear
  const baseMatch = content.match(/- (?:\*\*)?Perusskenaario[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const bullMatch = content.match(/- (?:\*\*)?Härkäskenaario[^*:\n]*(?:\*\*)?:\s*(.+)$/im);
  const bearMatch = content.match(/- (?:\*\*)?Karhuskenaario[^*:\n]*(?:\*\*)?:\s*(.+)$/im);

  // 5. Sijoittajan 3 Ydinriskiä ja Mahdollisuutta (tai 3 tärppiä)
  const keyPoints: string[] = [];
  const pointsMatch =
    content.match(/## Sijoittajan 3 Ydinriskiä & Mahdollisuutta\s+([\s\S]+?)$/i) ||
    content.match(/## Sijoittajan 3 Ydinriskiä ja Mahdollisuutta\s+([\s\S]+?)$/i) ||
    content.match(/## Sijoittajan 3 kriittisintä tärppiä\s+([\s\S]+?)$/i);

  if (pointsMatch) {
    const lines = pointsMatch[1].split("\n");
    for (const line of lines) {
      const pMatch = line.match(/^\d+\.\s*(.+)$/);
      if (pMatch) {
        keyPoints.push(stripMarkdown(pMatch[1]));
      }
    }
  }

  return {
    id,
    title,
    company,
    category,
    published,
    sourceLink,
    quickSummary,
    businessImpact: businessImpact || undefined,
    freeSectionMd: freePart,
    paidSectionMd: paidPart,
    metrics: {
      revenue: revMatch ? stripMarkdown(revMatch[1]) : undefined,
      ebit: ebitMatch ? stripMarkdown(ebitMatch[1]) : undefined,
      debt: debtMatch ? stripMarkdown(debtMatch[1]) : undefined,
    },
    valuation: {
      pe: peMatch ? stripMarkdown(peMatch[1]) : undefined,
      evEbitda: evMatch ? stripMarkdown(evMatch[1]) : undefined,
      pb: pbMatch ? stripMarkdown(pbMatch[1]) : undefined,
      comment: valComMatch ? stripMarkdown(valComMatch[1]) : undefined,
    },
    dcf: {
      fairValue: dcfFairValueMatch ? stripMarkdown(dcfFairValueMatch[1]) : undefined,
      growthAndWacc: dcfGrowthMatch ? stripMarkdown(dcfGrowthMatch[1]) : undefined,
      upside: dcfUpsideMatch ? stripMarkdown(dcfUpsideMatch[1]) : undefined,
      base: baseMatch ? stripMarkdown(baseMatch[1]) : undefined,
      bull: bullMatch ? stripMarkdown(bullMatch[1]) : undefined,
      bear: bearMatch ? stripMarkdown(bearMatch[1]) : undefined,
    },
    keyPoints: keyPoints.length > 0 ? keyPoints : [
      "Strategisen investoinnin tuottovaikutus ja takaisinmaksuaika",
      "Kysyntä- ja sykliriskit vallitsevassa teollisuussuhdanteessa",
      "Osinkotuotto ja vapaan kassavirran kehitys tulevilla kvartaaleilla"
    ]
  };
}
