# Talousmedia – Finanssidata, AI-analyysi, Julkaisumoottori & Next.js Frontend

Datavetoisen modernin talousmedian kokonaisjärjestelmä:
1. **Python-taustajärjestelmä**:
   - `fetch_news.py` – Reaaliaikainen pörssitiedotteiden RSS-haku (Cision - Nasdaq Helsinki & yritystiedotteet).
   - `summarize.py` – 300–500 sanan kattava tekoälysijoittaja-analyysi, valuation-kertoimet (`P/E`, `EV/EBITDA`, `P/B`), automaattinen DCF-kassavirtamalli sekä sijoittajan 3 ydinriskiä ja mahdollisuutta.
   - `publish.py` – Julkaisumoottori Ghost CMS Admin API:lle ja Webhookeille virallisella `<!--members-only-->` paywall-rajauksella.
   - `scheduler.py` – Automaattinen ajastus arkipäivisin klo 09:00 ja 16:30 duplikaattisuojalla ja virheenhallinnalla.
   - `.github/workflows/workflow.yml` – Täysautomatisoitu GitHub Actions CI/CD.
2. **Next.js & Tailwind CSS Frontend**:
   - **BBC / Kauppalehti -lehtiasettelu (`app/page.tsx`)**: Pörssitikkeri, vasemman laidan suuri pääuutinen avainluvuilla, oikean laidan secondary stories sekä 3 sarakkeen ruudukko erotettuna ohuilla 1px linjoilla.
   - **Käyttäjähallinta (`@clerk/nextjs`)**: Yläkulman kirjautumistila (`Kirjaudu` / `Kokeile maksutta` tai käyttäjäprofiili).
   - **Maksumuuri & Sisältöhierarkia (`app/article/[id]/page.tsx`)**:
     - *Ilmainen osuus kaikille*: Otsikko, 3 lauseen Ingressi ja Liiketoimintavaikutus & Taustat.
     - *Maksullinen Premium-osuus*: Tunnuslukuvertailu, DCF-kassavirtamallinnus ja sijoittajatärpit sumennettuna (`blur`).
     - *Maksumuurikortti*: "Lue syväanalyysi ja DCF-laskelma tilaamalla Talousmedia Pro 4,99 €/kk".
   - **Tilausvirta (`Stripe Checkout`)**: Ohjaa suoraan Stripen ostosivulle (`/api/checkout`) ja takaisin sivustolle aktivoimaan tilauksen.

---

## Asennus ja käynnistys

### 1. Python-taustajärjestelmä
```powershell
pip install -r requirements.txt
```

### 2. Next.js Frontend
```powershell
npm install
npm run dev
```
Avaa selain osoitteessa [http://localhost:3000](http://localhost:3000).

Tuotantobuild:
```powershell
npm run build
npm run start
```

---

## Ympäristömuuttujat (`.env`)

Kopioi pohjaksi [.env.example](file:///c:/Users/mikael/Desktop/Talousmedia-backend/.env.example):
```env
# Tekoäly (Gemini tai OpenAI - vain toinen tarvitaan)
GEMINI_API_KEY=
OPENAI_API_KEY=

# Stripe Maksut (https://stripe.com - vain salainen avain tarvitaan)
STRIPE_SECRET_KEY=sk_test_...

# Clerk Käyttäjähallinta (valinnainen, https://clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```
*(Sovelluksessa on valmiina sisäänrakennettu simulaatio-/esikatselutila, joten käyttöliittymää, kirjautumistiloja ja maksumuurin avautumista voi testata heti myös ennen API-avaimien syöttämistä).*
