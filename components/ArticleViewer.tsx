"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ArticleData } from "@/lib/articles";
import { getCompanyVisuals } from "@/lib/visuals";
import CompanyLogo from "@/components/CompanyLogo";

interface ArticleViewerProps {
  article: ArticleData;
  recentArticles?: ArticleData[];
}

export default function ArticleViewer({ article, recentArticles = [] }: ArticleViewerProps) {
  const searchParams = useSearchParams();
  const isUrlSubscribed = searchParams.get("subscribed") === "true";

  const [isSubscribed, setIsSubscribed] = useState(isUrlSubscribed);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  useEffect(() => {
    if (isUrlSubscribed) {
      setIsSubscribed(true);
    }
  }, [isUrlSubscribed]);

  const visuals = getCompanyVisuals(article.company, article.title, article.id);

  // Etsitään toinen artikkeli "LUE MYÖS:" -nostoon (mieluiten sama yhtiö tai uusin muu)
  const sameCompanyArticle = recentArticles.find(
    (a) => a.company === article.company && a.id !== article.id
  );
  const relatedArticle = sameCompanyArticle || recentArticles.find((a) => a.id !== article.id);

  // Pilkotaan syväanalyysin leipäteksti kappaleiksi
  const bodyParagraphs = (article.businessImpact || "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const handleStripeCheckout = async () => {
    setIsLoadingCheckout(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Virhe Stripe Checkout -ohjauksessa:", err);
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">
      {/* Tilausvahvistuspalkki */}
      {isSubscribed && (
        <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center justify-between rounded-sm">
          <span>✓ Talousmedia Pro -tilaus aktivoitu. Koko syväanalyysi ja DCF-malli avattu.</span>
          <button
            onClick={() => setIsSubscribed(false)}
            className="text-neutral-400 hover:text-white underline text-[11px]"
          >
            Lukitse uudelleen (testi)
          </button>
        </div>
      )}

      {/* Navigointi ja pikatesti-kytkin */}
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-neutral-800 text-xs font-mono">
        <Link
          href="/"
          className="text-neutral-400 hover:text-white transition flex items-center space-x-1"
        >
          <span>←</span>
          <span>Takaisin uutisvirtaan</span>
        </Link>

        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-neutral-500 uppercase tracking-wider">
            {visuals.sector}
          </span>
          <button
            onClick={() => setIsSubscribed(!isSubscribed)}
            className="text-[11px] text-neutral-400 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-600 px-2 py-0.5 rounded-sm transition"
          >
            {isSubscribed ? "Tilaaja-tila päällä" : "Esikatsele tilaajana"}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* KAKSI-SARAKKEINEN ASETTELU (2-Column Layout)                    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* ============================================================ */}
        {/* VASEN PÄÄSARAKE (~70% leveydestä / lg:col-span-8)            */}
        {/* ============================================================ */}
        <main className="lg:col-span-8 min-w-0">
          <article>
            {/* Yläkategoria & Yhtiöbadge */}
            <div className="flex items-center space-x-3 text-xs font-mono text-neutral-400 mb-3">
              <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-200 font-bold uppercase tracking-wider text-[10px] rounded-sm">
                {visuals.ticker}
              </span>
              <span className="text-white font-bold tracking-wide">{article.company}</span>
              <span>•</span>
              <span>Pörssitiedote</span>
              <span>•</span>
              <span>
                {article.published ? new Date(article.published).toLocaleString("fi-FI") : "Tänään"}
              </span>
            </div>

            {/* Pääotsikko */}
            <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight mb-4">
              {article.title}
            </h1>

            {/* Byline & Toimitustieto */}
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono py-3 mb-6 border-y border-neutral-800">
              <div className="flex items-center space-x-3">
                <CompanyLogo
                  src={visuals.logoUrl}
                  alt={article.company}
                  className="w-5 h-5 rounded-full bg-neutral-800 object-contain"
                />
                <span className="text-neutral-300">Toimitus • Talousmedia Finanssianalyysi</span>
              </div>
              {article.sourceLink && (
                <a
                  href={article.sourceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white underline"
                >
                  Alkuperäinen pörssitiedote ↗
                </a>
              )}
            </div>

            {/* Artikkelikuva */}
            <figure className="mb-8">
              <div className="overflow-hidden border border-neutral-800 bg-neutral-900 aspect-[16/9] max-h-[420px]">
                <img
                  src={visuals.heroImage}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </figure>

            {/* Ingressi (suurempi, elegantti leipätekstin aloitus ilman leimoja) */}
            <div className="mb-6 pb-6 border-b border-neutral-800">
              <p className="font-serif text-lg sm:text-xl text-neutral-100 font-normal leading-relaxed">
                {article.quickSummary}
              </p>
            </div>

            {/* Ensimmäinen leipätekstikappale */}
            {bodyParagraphs.length > 0 && (
              <div className="space-y-5 text-neutral-300 text-base leading-relaxed font-sans mb-6">
                <h2 className="text-xl font-bold font-serif text-white mt-6 mb-3">
                  Tuloskehitys ja investoinnin taustat
                </h2>
                <p>{bodyParagraphs[0]}</p>
              </div>
            )}

            {/* Toinen leipätekstikappale */}
            {bodyParagraphs.length > 1 && (
              <div className="space-y-5 text-neutral-300 text-base leading-relaxed font-sans mb-6">
                <p>{bodyParagraphs[1]}</p>
              </div>
            )}

            {/* Hienovarainen "LUE MYÖS:" -nostolaatikko */}
            {relatedArticle && (
              <div className="my-8 p-4 bg-neutral-900/60 border-l-2 border-neutral-400 flex items-start space-x-3 rounded-r-sm">
                <span className="text-[11px] font-mono font-bold tracking-widest text-neutral-300 uppercase shrink-0 mt-0.5">
                  LUE MYÖS:
                </span>
                <Link
                  href={`/article/${relatedArticle.id}`}
                  className="text-sm font-serif font-medium text-white hover:underline leading-snug"
                >
                  {relatedArticle.title}
                </Link>
              </div>
            )}

            {/* ======================================================== */}
            {/* MAKSUMUURI JA HÄIVYTYS (FADE-OUT PAYWALL)                 */}
            {/* ======================================================== */}
            {!isSubscribed ? (
              <div className="relative mt-8">
                {/* Haalistuva kappale ja pehmeä häivytys toisen kappaleen jälkeen */}
                <div className="relative overflow-hidden max-h-32 select-none pointer-events-none">
                  {bodyParagraphs.length > 2 && (
                    <p className="text-neutral-400 text-base leading-relaxed font-sans opacity-50 blur-[0.5px]">
                      {bodyParagraphs[2]}
                    </p>
                  )}
                  {/* Pehmeä liukuväri häivytykseen */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0C]/80 to-[#0A0A0C]" />
                </div>

                {/* Erottuva ja arvokas Premium-tilauskortti */}
                <div className="mt-4 bg-[#0E0E12] border border-neutral-700 p-6 sm:p-8 rounded-sm shadow-2xl relative">
                  <div className="flex items-center space-x-2 text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-bold mb-3">
                    <span className="w-2 h-2 rounded-full bg-white inline-block" />
                    <span>Talousmedia Pro • Lukuoikeus</span>
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-3 leading-snug">
                    Tilaa Talousmedia Pro 4,99 €/kk ja lue koko syväanalyysi
                  </h3>

                  <p className="text-neutral-400 text-sm leading-relaxed mb-6 font-sans">
                    Tämä artikkeli on osa Talousmedia Pron maksullista sijoittajapalvelua. Tilaajana saat heti pääsyn yhtiön täyteen DCF-kassavirtamalliin, P/E- ja EV/EBITDA -toimialaverrokkeihin sekä kaikkiin Helsingin pörssin syväanalyyseihin.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono text-neutral-300 mb-6 pb-6 border-b border-neutral-800">
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Automaattinen DCF-käypä arvo</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>P/E, EV/EBITDA & P/B -verrokit</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Sijoittajan 3 kriittisintä riskiä</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Ei määräaikaa – peru milloin vain</span>
                    </div>
                  </div>

                  <button
                    onClick={handleStripeCheckout}
                    disabled={isLoadingCheckout}
                    className="w-full bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-sm transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isLoadingCheckout ? (
                      <span>Ohjataan Stripe-maksusivulle...</span>
                    ) : (
                      <span>Tilaa Talousmedia Pro (4,99 €/kk) →</span>
                    )}
                  </button>

                  <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                    <span>✓ Turvallinen Stripe Checkout</span>
                    <button
                      onClick={() => setIsSubscribed(true)}
                      className="text-neutral-400 hover:text-white underline"
                    >
                      Esikatsele tilaajana (pikatesti)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* TILAAJAN TÄYSI NÄKYMÄ: Kaikki luvut, mallinnus ja tärpit auki */
              <div className="mt-8 space-y-10">
                {/* Loput leipätekstikappaleet */}
                {bodyParagraphs.slice(2).map((paragraph, index) => (
                  <p key={index} className="text-neutral-300 text-base leading-relaxed font-sans">
                    {paragraph}
                  </p>
                ))}

                {/* Valuaatio & Tunnusluvut */}
                <div className="pt-6 border-t border-neutral-800">
                  <h2 className="text-xl font-bold font-serif text-white mb-4">
                    Valuaatio ja toimialan tunnusluvut
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                    <div className="border border-neutral-800 p-4 bg-[#0a0a0b]">
                      <div className="text-neutral-500 uppercase text-[10px]">P/E (Price to Earnings)</div>
                      <div className="text-white text-base font-bold mt-1.5">
                        {article.valuation.pe || "8,7x – 10,2x"}
                      </div>
                    </div>
                    <div className="border border-neutral-800 p-4 bg-[#0a0a0b]">
                      <div className="text-neutral-500 uppercase text-[10px]">EV/EBITDA</div>
                      <div className="text-white text-base font-bold mt-1.5">
                        {article.valuation.evEbitda || "4,6x – 5,4x"}
                      </div>
                    </div>
                    <div className="border border-neutral-800 p-4 bg-[#0a0a0b]">
                      <div className="text-neutral-500 uppercase text-[10px]">P/B (Price to Book)</div>
                      <div className="text-white text-base font-bold mt-1.5">
                        {article.valuation.pb || "0,84x"}
                      </div>
                    </div>
                    <div className="border border-neutral-800 p-4 bg-[#0a0a0b]">
                      <div className="text-neutral-500 uppercase text-[10px]">Velkaantuneisuus & Tase</div>
                      <div className="text-white text-sm font-bold mt-1.5">
                        {article.metrics.debt || "Vahva omavaraisuusaste"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* DCF-Kassavirtamallinnus */}
                <div className="pt-6 border-t border-neutral-800">
                  <h2 className="text-xl font-bold font-serif text-white mb-4">
                    DCF-kassavirtamallinnus
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                    <div className="border border-neutral-800 p-4 bg-[#0a0a0b]">
                      <div className="text-neutral-400 uppercase text-[10px]">Laskennallinen käypä arvo</div>
                      <div className="text-white text-xl font-bold mt-1">
                        {article.dcf.fairValue || "15,80 €"}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1">DCF-tavoitehinta</div>
                    </div>
                    <div className="border border-neutral-800 p-4 bg-[#0a0a0b]">
                      <div className="text-neutral-400 uppercase text-[10px]">Oletettu kasvuoletus & WACC</div>
                      <div className="text-white text-base font-bold mt-1">
                        {article.dcf.growthAndWacc || "WACC 9,1 %, kasvu 1,2 %"}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1">Pääoman keskikustannus</div>
                    </div>
                    <div className="border border-neutral-800 p-4 bg-[#0a0a0b]">
                      <div className="text-neutral-400 uppercase text-[10px]">Nousu- / Laskupotentiaali</div>
                      <div className="text-emerald-400 text-xl font-bold mt-1">
                        {article.dcf.upside || "+19,2 %"}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1">Suhteessa nykykurssiin</div>
                    </div>
                  </div>
                </div>

                {/* Sijoittajan 3 Ydinriskiä & Mahdollisuutta */}
                <div className="pt-6 border-t border-neutral-800">
                  <h2 className="text-xl font-bold font-serif text-white mb-4">
                    Sijoittajan 3 ydinriskiä ja mahdollisuutta
                  </h2>
                  <ul className="space-y-4 font-sans text-sm text-neutral-300">
                    {article.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start space-x-3.5 bg-neutral-900/40 border border-neutral-800/80 p-3.5 rounded-sm">
                        <span className="font-mono text-xs font-bold text-white bg-neutral-800 px-2 py-0.5 rounded-sm shrink-0 mt-0.5">
                          0{index + 1}
                        </span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </article>
        </main>

        {/* ============================================================ */}
        {/* OIKEA SIVUPALKKI (~30% leveydestä / lg:col-span-4)           */}
        {/* 'Luetuimmat & Tuoreet pörssitiedotteet'                      */}
        {/* ============================================================ */}
        <aside className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-neutral-800 lg:pl-8 pt-8 lg:pt-0">
          <div className="sticky top-6 space-y-8">
            {/* Pörssin tilannekuva mini-widget */}
            <div className="border border-neutral-800 p-4 bg-[#0a0a0c]">
              <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-bold mb-3 flex items-center justify-between">
                <span>Pörssitilanne</span>
                <span className="text-emerald-400 text-[10px] border border-emerald-800 px-1.5 py-0.5 rounded">
                  Helsinki
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                  <span className="text-neutral-400">OMX Helsinki 25</span>
                  <span className="text-emerald-400 font-bold">5 120,40 (+0,42 %)</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                  <span className="text-neutral-400">S&P 500</span>
                  <span className="text-emerald-400 font-bold">5 815,20 (+0,28 %)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">EUR / USD</span>
                  <span className="text-neutral-300 font-bold">1,0895 (-0,12 %)</span>
                </div>
              </div>
            </div>

            {/* Luetuimmat & Tuoreet pörssitiedotteet -sivupalkki */}
            <div>
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-neutral-800">
                <span className="w-2 h-2 bg-white inline-block" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Luetuimmat & Tuoreet Tiedotteet
                </h3>
              </div>

              <div className="divide-y divide-neutral-800/80">
                {recentArticles.slice(0, 7).map((item, idx) => {
                  const itemVisuals = getCompanyVisuals(item.company, item.title, item.id);
                  return (
                    <Link
                      key={item.id}
                      href={`/article/${item.id}`}
                      className="py-3.5 group flex items-start space-x-3 transition block"
                    >
                      <div className="font-mono text-neutral-600 group-hover:text-white text-xs font-bold w-4 shrink-0 mt-0.5">
                        0{idx + 1}
                      </div>
                      <CompanyLogo
                        src={itemVisuals.logoUrl}
                        alt={item.company}
                        className="w-5 h-5 rounded-full bg-neutral-800 shrink-0 mt-0.5 object-contain"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                          <span className="text-neutral-200 font-bold">{item.company}</span>
                          <span>•</span>
                          <span>
                            {item.published
                              ? new Date(item.published).toLocaleDateString("fi-FI")
                              : "Tänään"}
                          </span>
                        </div>
                        <h4 className="text-xs font-serif text-neutral-300 group-hover:text-white leading-snug font-medium line-clamp-2">
                          {item.title}
                        </h4>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sivupalkin tilausnosto */}
            <div className="p-4 bg-gradient-to-br from-neutral-900 to-[#0A0A0C] border border-neutral-800 text-center">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                Talousmedia Pro
              </div>
              <div className="font-serif text-sm font-bold text-white mb-2">
                Helsingin pörssin kassavirtamallit
              </div>
              <p className="text-xs text-neutral-400 mb-3 font-sans">
                Vain 4,99 €/kk ilman määräaikaa.
              </p>
              <button
                onClick={handleStripeCheckout}
                disabled={isLoadingCheckout}
                className="w-full bg-neutral-100 hover:bg-white text-black font-mono font-bold text-[11px] py-2 px-3 rounded-sm transition uppercase"
              >
                Tilaa lukuoikeus →
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
