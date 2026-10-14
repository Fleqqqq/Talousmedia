import Link from "next/link";
import { getAllArticles, ArticleData } from "@/lib/articles";
import { getCompanyVisuals } from "@/lib/visuals";
import CompanyLogo from "@/components/CompanyLogo";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams?: { cat?: string };
}

export default function HomePage({ searchParams }: HomePageProps) {
  const rawArticles = getAllArticles();
  const selectedCategory = searchParams?.cat || "Kaikki";

  if (rawArticles.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-neutral-400 font-mono text-sm">
        Ei uutisia saatavilla. Aja{" "}
        <code className="text-white">python generate_archive.py</code> generoidaksesi analyysit.
      </div>
    );
  }

  // ── Deduplication ──────────────────────────────────────────────────────────
  const uniqueArticles: ArticleData[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  for (const art of rawArticles) {
    const t = art.title.toLowerCase().trim();
    if (!seenIds.has(art.id) && !seenTitles.has(t)) {
      seenIds.add(art.id);
      seenTitles.add(t);
      uniqueArticles.push(art);
    }
  }

  // ── Category filter ────────────────────────────────────────────────────────
  const categoryCounts: Record<string, number> = {
    Kaikki: uniqueArticles.length,
    Tulosraportit: uniqueArticles.filter((a) => a.category === "Tulosraportit").length,
    Tulosvaroitukset: uniqueArticles.filter((a) => a.category === "Tulosvaroitukset").length,
    "Sopimukset & Investoinnit": uniqueArticles.filter(
      (a) => a.category === "Sopimukset & Investoinnit"
    ).length,
    "Strategia & Johto": uniqueArticles.filter((a) => a.category === "Strategia & Johto").length,
  };

  const displayArticles =
    selectedCategory === "Kaikki"
      ? uniqueArticles
      : uniqueArticles.filter((a) => a.category === selectedCategory);

  const lead = displayArticles[0] || uniqueArticles[0];
  const secondaries = displayArticles.slice(1, 3);
  const sidebarArticles = displayArticles.slice(3, 9);
  const gridArticles = displayArticles.slice(9);

  const leadV = getCompanyVisuals(lead.company, lead.title, lead.id);

  // ── Category badge style ───────────────────────────────────────────────────
  function badge(cat: string) {
    if (cat === "Tulosvaroitukset")
      return { label: "TULOSVAROITUS", cls: "text-rose-400 border-rose-800/60 bg-rose-950/20" };
    if (cat === "Tulosraportit")
      return { label: "TULOS", cls: "text-sky-400 border-sky-800/60 bg-sky-950/20" };
    if (cat === "Sopimukset & Investoinnit")
      return { label: "SOPIMUS", cls: "text-emerald-400 border-emerald-800/60 bg-emerald-950/20" };
    return { label: "STRATEGIA", cls: "text-neutral-400 border-neutral-700 bg-neutral-900/30" };
  }

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* ── Kategoriapalkki ───────────────────────────────────────────────── */}
      <nav className="flex items-center space-x-1 overflow-x-auto pb-4 mb-8 border-b border-neutral-800 text-[11px] font-mono scrollbar-none">
        {["Kaikki", "Tulosraportit", "Tulosvaroitukset", "Sopimukset & Investoinnit", "Strategia & Johto"].map(
          (cat) => {
            const active = selectedCategory === cat;
            const href = cat === "Kaikki" ? "/" : `/?cat=${encodeURIComponent(cat)}`;
            return (
              <Link
                key={cat}
                href={href}
                className={`px-3 py-1.5 whitespace-nowrap border transition ${
                  active
                    ? "bg-white text-black font-bold border-white"
                    : "bg-transparent text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-600"
                }`}
              >
                {cat.toUpperCase()}
                <span className={`ml-1.5 text-[10px] ${active ? "text-neutral-600" : "text-neutral-600"}`}>
                  ({categoryCounts[cat] || 0})
                </span>
              </Link>
            );
          }
        )}
      </nav>

      {/* ── Päärivi: Lead (55%) + Kakkosuutiset (25%) + Lista (20%) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 pb-10 border-b border-neutral-800">

        {/* ── PÄÄUUTINEN ──────────────────────────────────────────────────── */}
        <article className="lg:col-span-7 lg:pr-8 lg:border-r lg:border-neutral-800 flex flex-col justify-between mb-10 lg:mb-0">
          <div>
            <Link href={`/article/${lead.id}`} className="group block mb-4 overflow-hidden border border-neutral-800 bg-neutral-900 relative">
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={leadV.heroImage}
                  alt={lead.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
                />
              </div>
              <div className="absolute top-3 left-3 bg-black/80 border border-neutral-700 px-2.5 py-1 flex items-center space-x-2">
                <CompanyLogo src={leadV.logoUrl} alt={lead.company} className="w-3.5 h-3.5 object-contain" />
                <span className="text-[11px] font-mono font-bold text-white">{leadV.ticker}</span>
              </div>
              <div className="absolute top-3 right-3">
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${badge(lead.category).cls}`}>
                  {badge(lead.category).label}
                </span>
              </div>
            </Link>

            <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400 mb-2">
              <span className="text-white font-bold">{lead.company}</span>
              <span>·</span>
              <span>{lead.published ? new Date(lead.published).toLocaleDateString("fi-FI") : ""}</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-[28px] font-bold leading-tight text-white mb-3 hover:text-neutral-200 transition">
              <Link href={`/article/${lead.id}`}>{lead.title}</Link>
            </h1>

            <p className="text-neutral-300 text-sm leading-relaxed mb-4 line-clamp-3">
              {lead.quickSummary}
            </p>

            <div className="flex flex-wrap gap-2 mb-5 text-[11px] font-mono">
              {lead.valuation.pe && (
                <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300">
                  P/E {lead.valuation.pe.split(" ")[0]}
                </span>
              )}
              {lead.valuation.evEbitda && (
                <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300">
                  EV/EBITDA {lead.valuation.evEbitda.split(" ")[0]}
                </span>
              )}
              {lead.dcf.fairValue && (
                <span className="px-2 py-0.5 bg-neutral-900 border border-emerald-900 text-emerald-400 font-bold">
                  DCF {lead.dcf.fairValue}
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/article/${lead.id}`}
            className="inline-flex items-center px-4 py-2.5 bg-white hover:bg-neutral-100 text-black text-xs font-mono font-bold uppercase tracking-wider transition"
          >
            Lue syväanalyysi ja DCF-malli →
          </Link>
        </article>

        {/* ── KAKKOSUUTISET + SIVULISTA ────────────────────────────────────── */}
        <div className="lg:col-span-5 lg:pl-8 flex flex-col space-y-0">

          {/* Kaksi secondary-artikkelia kuvilla */}
          <div className="space-y-0 divide-y divide-neutral-800 pb-6 border-b border-neutral-800">
            {secondaries.map((story) => {
              const v = getCompanyVisuals(story.company, story.title, story.id);
              const b = badge(story.category);
              return (
                <article key={story.id} className="group py-5 first:pt-0 flex items-start space-x-4">
                  <Link href={`/article/${story.id}`} className="w-28 h-20 shrink-0 overflow-hidden border border-neutral-800 bg-neutral-900 block">
                    <img
                      src={v.heroImage}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-neutral-400 mb-1">
                      <span className="text-white font-bold">{story.company}</span>
                      <span className={`px-1.5 border text-[9px] ${b.cls}`}>{b.label}</span>
                    </div>
                    <h2 className="font-serif text-sm font-bold text-neutral-100 group-hover:text-white leading-snug line-clamp-2 mb-1.5">
                      <Link href={`/article/${story.id}`}>{story.title}</Link>
                    </h2>
                    <div className="flex items-center space-x-2 text-[10px] font-mono">
                      {story.valuation.pe && (
                        <span className="text-neutral-500">P/E {story.valuation.pe.split(" ")[0]}</span>
                      )}
                      {story.dcf.fairValue && (
                        <span className="text-emerald-400 font-bold">DCF {story.dcf.fairValue}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Viimeiset uutiset — siisti tekstilista, ei kellonaikoja */}
          <div className="pt-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold mb-3">
              Viimeisimmät tiedotteet
            </div>
            <div className="divide-y divide-neutral-800/60">
              {sidebarArticles.map((story) => {
                const v = getCompanyVisuals(story.company, story.title, story.id);
                return (
                  <div key={story.id} className="py-2.5 group">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        href={`/article/${story.id}`}
                        className="font-serif text-xs text-neutral-300 group-hover:text-white leading-snug line-clamp-2 flex-1"
                      >
                        {story.title}
                      </Link>
                      <span className="text-[9px] font-mono text-neutral-600 shrink-0">{v.ticker}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Uutisruudukko ─────────────────────────────────────────────────── */}
      {gridArticles.length > 0 && (
        <div className="pt-10">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-800">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-200">
              {selectedCategory === "Kaikki" ? "Kaikki analyysit" : selectedCategory}
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">{gridArticles.length} kpl</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gridArticles.map((story) => {
              const v = getCompanyVisuals(story.company, story.title, story.id);
              const b = badge(story.category);
              return (
                <article
                  key={story.id}
                  className="group flex flex-col border border-neutral-800 bg-neutral-900/30 hover:border-neutral-600 transition"
                >
                  <Link href={`/article/${story.id}`} className="block overflow-hidden relative">
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={v.heroImage}
                        alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border ${b.cls}`}>
                        {b.label}
                      </span>
                    </div>
                  </Link>

                  <div className="p-3 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5 text-[10px] font-mono text-neutral-400 mb-1.5">
                        <CompanyLogo src={v.logoUrl} alt={story.company} className="w-3 h-3 object-contain" />
                        <span className="text-white font-bold">{story.company}</span>
                        <span>·</span>
                        <span>{story.published ? new Date(story.published).toLocaleDateString("fi-FI") : ""}</span>
                      </div>

                      <h4 className="font-serif text-sm font-bold text-neutral-100 group-hover:text-white leading-snug line-clamp-2 mb-2">
                        <Link href={`/article/${story.id}`}>{story.title}</Link>
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[10px] font-mono mt-2">
                      <div className="flex items-center space-x-1.5">
                        {story.valuation.pe && (
                          <span className="text-neutral-500">P/E {story.valuation.pe.split(" ")[0]}</span>
                        )}
                        {story.dcf.fairValue && (
                          <span className="text-emerald-400 font-bold">DCF {story.dcf.fairValue}</span>
                        )}
                      </div>
                      <Link href={`/article/${story.id}`} className="text-neutral-500 hover:text-white transition">
                        Lue →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
