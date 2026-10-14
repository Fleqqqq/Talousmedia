import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import ClerkWrapper from "@/components/ClerkWrapper";
import AuthHeader from "@/components/AuthHeader";

export const metadata: Metadata = {
  title: "TALOUSMEDIA – Finanssidata & Pörssiuutiset",
  description: "Riippumaton taloussanomalehti. Reaaliaikaiset pörssitiedotteet, analyysit ja DCF-arvonmääritykset.",
};

const TICKER_ITEMS = [
  { name: "OMX HELSINKI 25", val: "4 782,15", chg: "+0,84%", up: true },
  { name: "S&P 500", val: "5 815,20", chg: "+0,41%", up: true },
  { name: "EUR/USD", val: "1,0842", chg: "+0,12%", up: true },
  { name: "NOKIA", val: "3,82 €", chg: "+1,42%", up: true },
  { name: "WÄRTSILÄ", val: "18,45 €", chg: "+2,15%", up: true },
  { name: "SAMPO", val: "41,20 €", chg: "-0,32%", up: false },
  { name: "NESTE", val: "19,85 €", chg: "-1,10%", up: false },
  { name: "SSAB B", val: "5,42 €", chg: "+3,18%", up: true },
  { name: "BRENT CRUDE", val: "76,80 $", chg: "-0,45%", up: false },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi" className="dark">
      <body className="min-h-screen bg-[#0C0D0E] text-neutral-200 antialiased font-sans flex flex-col">
        <ClerkWrapper>
          {/* Sivun aivan yläreunaan tumma, kapea pörssitikkeri */}
          <div className="bg-[#070708] border-b border-neutral-800 text-[11px] py-1 overflow-hidden select-none">
            <div className="animate-ticker flex items-center space-x-8">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 font-mono">
                  <span className="text-neutral-400 font-semibold">{item.name}</span>
                  <span className="text-neutral-100">{item.val}</span>
                  <span className={item.up ? "text-emerald-400" : "text-rose-400"}>
                    {item.chg}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pääheader (BBC & Kauppalehti -sanomalehtityyli) */}
          <header className="bg-[#0C0D0E] border-b border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14">
                {/* Vasen: Tekstilogo TALOUSMEDIA */}
                <div className="flex items-center space-x-8">
                  <Link
                    href="/"
                    className="text-xl sm:text-2xl font-serif font-black tracking-wider text-white uppercase hover:text-neutral-200 transition"
                  >
                    TALOUSMEDIA
                  </Link>

                  {/* Osiot (Uutiset, Pörssi, Analyysit, Tulosraportit) */}
                  <nav className="hidden md:flex items-center space-x-6 text-xs uppercase tracking-wider font-medium text-neutral-300">
                    <Link href="/" className="hover:text-white transition pb-0.5 border-b-2 border-white">
                      Uutiset
                    </Link>
                    <Link href="/" className="text-neutral-400 hover:text-white transition">
                      Pörssi
                    </Link>
                    <Link href="/" className="text-neutral-400 hover:text-white transition">
                      Analyysit
                    </Link>
                    <Link href="/" className="text-neutral-400 hover:text-white transition">
                      Tulosraportit
                    </Link>
                  </nav>
                </div>

                {/* Oikea laita: Clerk-käyttäjähallinta (Kirjaudu / Kokeile maksutta tai Käyttäjäprofiili) */}
                <div className="flex items-center space-x-4">
                  <AuthHeader />
                </div>
              </div>
            </div>
          </header>

          {/* Pääsisältö */}
          <main className="flex-1">{children}</main>

          {/* Sanomalehden alatunniste */}
          <footer className="bg-[#070708] border-t border-neutral-800 mt-20 text-xs text-neutral-500 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-[11px]">
              <div>
                <span className="text-neutral-300 font-serif font-bold uppercase tracking-wider mr-2">TALOUSMEDIA</span>
                <span>© {new Date().getFullYear()} Talousmedia Oy. Kaikki oikeudet pidätetään.</span>
              </div>
              <div className="text-neutral-600">
                Pörssikurssit ja tiedotteet: Nasdaq Helsinki, Cision & GlobeNewswire.
              </div>
            </div>
          </footer>
        </ClerkWrapper>
      </body>
    </html>
  );
}
