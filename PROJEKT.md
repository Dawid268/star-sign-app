# Star Sign — Założenia Projektu

> Wersja: 1.0  
> Data: 2026-04-27  
> Status: Draft

---

## 1. Opis Projektu

**Star Sign** to nowoczesna platforma contentowa skierowana do kobiet, łącząca estetykę premium z treściami z zakresu astrologii, numerologii, tarota i mistycyzmu. Projekt realizowany jest jako **headless blog** — czyli oddzielony backend CMS od warstwy prezentacji.

Platforma dostarcza użytkowniczkom:

- Horoskopy dzienne, tygodniowe, miesięczne i roczne dla każdego z 12 znaków zodiaku
- Artykuły edukacyjne i rozrywkowe z zakresu astrologii, numerologii, tarota, kryształów i rytuałów
- Interaktywne narzędzia (Karta Dnia Tarot, Kalkulator Numerologiczny, Kalkulator Natal Chart)
- Personalizowane doświadczenie po zalogowaniu (zapamiętany znak zodiaku, historia)
- Społeczność i newsletter z cotygodniowymi przepowiedniami

---

## 2. Cel Biznesowy

| Cel                           | Opis                                                             | Horyzont   |
| ----------------------------- | ---------------------------------------------------------------- | ---------- |
| Budowanie marki               | Stworzyć rozpoznawalną markę w niszy astrologicznej dla Polek    | 0–6 mies.  |
| Pozyskanie ruchu organicznego | 50 000 sesji/mies. z SEO (horoskopy + artykuły)                  | 6 mies.    |
| Budowanie listy mailingowej   | 5 000 subskrybentów newslettera                                  | 6 mies.    |
| Monetyzacja                   | Pierwsze przychody z reklam i sprzedaży e-booków                 | 6–12 mies. |
| Subskrypcja premium           | Platforma premium z natal chart i spersonalizowanymi horoskopami | 12+ mies.  |

---

## 3. Grupa Docelowa

### 3.1 Persony Użytkowniczek

---

#### 🌙 Persona 1 — Zofia, "Kosmiczna"

- **Wiek:** 22–30 lat
- **Miejsce:** duże miasto (Warszawa, Kraków, Wrocław)
- **Status:** studentka lub młody profesjonalista
- **Kanały:** Instagram, TikTok, Pinterest
- **Zachowanie:** codziennie rano sprawdza horoskop jak scrolluje IG stories; lubi estetyczne treści; ceni „vibe" i design
- **Potrzeba:** szybki, piękny horoskop dzienny jako poranny rytuał
- **Frustracja:** stare, brzydkie portale horoskopowe wyglądające jak z lat 2005
- **Decyzja:** zostaje jeśli strona jest piękna i szybko ładuje horoskop

---

#### ☀️ Persona 2 — Marta, "Zainteresowana"

- **Wiek:** 30–42 lata
- **Miejsce:** małe i średnie miasta oraz suburbia
- **Status:** pracująca mama lub singielka w karierze
- **Kanały:** Facebook, Google, newsletter
- **Zachowanie:** szuka w Google „horoskop tygodniowy Waga", czyta dłuższe artykuły przy kawie
- **Potrzeba:** praktyczne wskazówki (miłość, praca, finanse) w kontekście astrologicznym
- **Frustracja:** powierzchowne, krótkie treści bez głębi; spam reklamowy
- **Decyzja:** zostaje subskrybentką jeśli newsletter jest wartościowy i nienatarczywy

---

#### ⭐ Persona 3 — Klaudia, "Zaawansowana"

- **Wiek:** 25–38 lat
- **Miejsce:** cała Polska, też diaspora za granicą
- **Status:** praktykująca astrologia, może prowadzi własny Instagram o duchowości
- **Kanały:** YouTube, podcasty, fora tematyczne
- **Zachowanie:** szuka głębokich analiz tranzytów, retrogradacji Merkurego, progresji; interesuje ją natal chart
- **Potrzeba:** merytoryczne artykuły, narzędzia do obliczania, archiwum treści
- **Frustracja:** brak polskojęzycznych, zaawansowanych materiałów; niska jakość treści „generowanych przez AI"
- **Decyzja:** zostaje płatną użytkowniczką jeśli content jest autentyczny i głęboki

---

### 3.2 Wspólne Cechy Demograficzne

- **Płeć:** kobiety (85–90% docelowej grupy)
- **Wiek:** 20–45 lat (core: 25–35)
- **Język:** polska (MVP), opcjonalnie angielski (faza 2)
- **Zainteresowania towarzyszące:** wellness, self-care, mindfulness, kryształy, medytacja, manifestacja
- **Urządzenie:** 70% mobile, 30% desktop (kluczowe: mobile-first)

---

## 4. Propozycja Wartości (Value Proposition)

> _"Star Sign to pierwsze w Polsce premium-design'owe, autentyczne centrum astrologiczne dla kobiet — gdzie piękno spotyka się z głębią."_

**Co nas wyróżnia:**

1. **Design na poziomie zachodnich platform** — estetyka rodem z Chani App i The Pattern
2. **Treści tworzone przez astrologów** — nie generowane masowo przez AI
3. **Pełna ekosystem tematyczny** — od horoskopów przez numerologię po tarot w jednym miejscu
4. **Silna personalizacja** — zapamiętany znak, historia, spersonalizowany natal chart
5. **Społeczność** — newsletter jako medium dla dedykowanej społeczności

---

## 5. Zakres MVP (Minimum Viable Product)

### Co jest w MVP:

- ✅ Strona główna z sekcją horoskopów i artykułów
- ✅ Horoskopy dzienne, tygodniowe, miesięczne, roczne × 12 znaków
- ✅ Blog — lista artykułów z podziałem na kategorie
- ✅ Strona szczegółowa artykułu z SEO
- ✅ Profil każdego znaku zodiaku (strona statyczna)
- ✅ Karta Dnia Tarot (losowanie + opis)
- ✅ Kalkulator Numerologiczny (liczba życiowa)
- ✅ Newsletter signup (integracja z MailerLite/Brevo)
- ✅ Responsywność (mobile-first)
- ✅ SEO techniczne (SSR, sitemap, structured data)

### Co NIE jest w MVP:

- ❌ Logowanie użytkowniczek i konta
- ❌ Subskrypcja premium
- ❌ Natal Chart Calculator (zaawansowany)
- ❌ Komentarze i społeczność
- ❌ Aplikacja mobilna
- ❌ Wielojęzyczność (i18n)
- ❌ Sklep / e-booki

---

## 6. Stack Technologiczny

| Warstwa              | Technologia                                | Uzasadnienie                                            |
| -------------------- | ------------------------------------------ | ------------------------------------------------------- |
| **Frontend**         | Angular 18+ z SSR (Angular Universal)      | SEO-first, reaktywny, signals, lazy loading             |
| **Backend / CMS**    | Strapi v5 (headless CMS)                   | Polskie panele redakcyjne, REST + GraphQL, elastyczność |
| **Baza danych**      | PostgreSQL 16                              | Relacyjna, stabilna, Strapi-native                      |
| **Cache**            | Redis (horoskopy dzienne)                  | 24h TTL, unikamy zbędnych zapytań do bazy               |
| **Media**            | Cloudinary                                 | Optymalizacja obrazów, transformacje on-the-fly         |
| **Hosting Frontend** | Vercel                                     | SSR support dla Angular, edge network                   |
| **Hosting Strapi**   | Railway / self-hosted Docker na VPS        | Pełna kontrola, tańsze niż Strapi Cloud                 |
| **Newsletter**       | MailerLite lub Brevo                       | GDPR-friendly, polskie wsparcie                         |
| **Analityka**        | Google Analytics 4 + Consent Mode          | Standard rynkowy                                        |
| **Wyszukiwarka**     | Algolia (faza 2) lub natywne Strapi search | Szybkie wyszukiwanie treści                             |

---

## 7. Architektura Contentu (Strapi CMS)

### Typy Treści

| Content Type        | Opis                        | Przykład                              |
| ------------------- | --------------------------- | ------------------------------------- |
| `Horoscope`         | Horoskop dla znaku i okresu | Baran, dzienny, 2026-04-27            |
| `Article`           | Artykuł redakcyjny          | "Mercury w Retrograde"                |
| `ArticleCategory`   | Kategoria artykułu          | Astrologia, Tarot, Numerologia        |
| `TarotCard`         | Karta tarota z opisem       | "Głupiec — The Fool"                  |
| `DailyTarotDraw`    | Karta dnia z przesłaniem    | 2026-04-27, Głupiec, wiadomość        |
| `ZodiacSign`        | Profil znaku zodiaku        | Baran — cechy, symbol, planeta        |
| `NumerologyProfile` | Profil liczby życiowej      | Liczba 7 — charakter, miłość, kariera |
| `Author`            | Autorka / astrologka        | Imię, bio, specjalizacja              |
| `Tag`               | Tag tematyczny              | retrogradacja, pełnia-księżyca        |

---

## 8. Struktura URL (Routing)

```
/                                    → Strona główna
/horoskopy                           → Hub horoskopów
/horoskopy/dzienne                   → Horoskopy dzienne (lista 12 znaków)
/horoskopy/dzienne/[znak]            → Horoskop dzienny konkretnego znaku
/horoskopy/tygodniowe/[znak]         → Horoskop tygodniowy
/horoskopy/miesieczne/[znak]         → Horoskop miesięczny
/horoskopy/roczne/[znak]             → Horoskop roczny
/znaki/[znak]                        → Profil znaku zodiaku
/artykuly                            → Lista artykułów
/artykuly/[kategoria]                → Artykuły wg kategorii
/artykuly/[kategoria]/[slug]         → Artykuł szczegółowy
/tarot                               → Hub tarota
/tarot/karta-dnia                    → Karta Dnia Tarot
/numerologia                         → Kalkulator numerologiczny
/numerologia/liczba/[n]              → Profil liczby życiowej
/newsletter                          → Strona zapisu do newslettera
/o-nas                               → O projekcie i autorach
```

---

## 9. SEO i Content Strategy

### Filar 1 — Horoskopy (ruch transakcyjny)

- 12 znaków × 4 okresy = **48 unikalnych stron horoskopowych** aktualizowanych regularnie
- Structured data: `Article` + `WebPage` Schema.org
- Tagi: `<title>Horoskop dzienny Baran — Star Sign | {data}</title>`
- Canonical URL z datą

### Filar 2 — Artykuły (ruch informacyjny / evergreen)

- Cel: minimum **3 artykuły tygodniowo** (mix: ponadczasowe + aktualne)
- Kategorie: Astrologia, Numerologia, Tarot, Kryształy, Rytuały, Pełnia Księżyca
- Długość: 800–2500 słów (zależnie od tematu)
- Wewnętrzne linkowanie: artykuł → horoskop → profil znaku

### Filar 3 — Narzędzia (ruch branded)

- Kalkulator Numerologiczny (długi czas na stronie → dobry dla SEO)
- Karta Dnia Tarot (daily return users)
- Natal Chart Calculator (faza 2, high-value keyword)

---

## 10. Monetyzacja (roadmapa)

### Faza 1: 0–6 miesięcy (Budowanie)

- Reklamy Google AdSense (pasywne, niska priorytet)
- Afiliacja: polecane książki, kryształy, kursy
- Budowanie listy mailingowej

### Faza 2: 6–12 miesięcy (Pierwsze Przychody)

- **Star Sign Premium** — 29 PLN/mies. lub 249 PLN/rok
  - Horoskopy spersonalizowane (na podstawie daty urodzenia)
  - Dostęp do natal chart calculator
  - Ekskluzywne artykuły i rytuały
  - Archiwum horoskopów miesięcznych i rocznych
- **E-booki** — 9–49 PLN (Rocznik Astrologiczny, Przewodnik po Tarota, etc.)

### Faza 3: 12+ miesięcy (Skalowanie)

- Marketplace konsultacji z certyfikowanymi astrologami
- Aplikacja mobilna (iOS/Android — React Native lub PWA)
- Ekspansja na rynek angielski

---

## 11. Kluczowe Ryzyka

| Ryzyko                                | Prawdopodobieństwo | Wpływ  | Mitygacja                                      |
| ------------------------------------- | ------------------ | ------ | ---------------------------------------------- |
| Niska jakość treści horoskopów        | Średnie            | Wysoki | Zatrudnienie prawdziwego astrologa             |
| Konkurencja z istniejącymi portalami  | Niskie             | Średni | Differentiator: design + jakość                |
| Słabe SEO na starcie                  | Wysokie            | Wysoki | SSR w Angular + content plan od dnia 1         |
| Wysokie koszty hostingu przy wzroście | Średnie            | Średni | Cache Redis, Cloudinary CDN, Vercel edge       |
| GDPR / cookies consent                | Niskie             | Wysoki | Consent mode, polityka prywatności, MailerLite |

---

## 12. Zespół i Role

| Rola                             | Odpowiedzialność                                        |
| -------------------------------- | ------------------------------------------------------- |
| **Frontend Developer**           | Angular app, komponenty, SSR, animations                |
| **Backend Developer**            | Strapi setup, content types, API, cache                 |
| **Content Manager / Astrolożka** | Horoskopy, artykuły, tarot opisy                        |
| **Redaktor**                     | Korekta, publikacja, SEO on-page                        |
| **(Opcjonalnie) UI/UX Designer** | Figma mockups, design system (pokryty przez Stitch MVP) |
| **(Opcjonalnie) DevOps**         | CI/CD, monitoring, Railway/VPS                          |

---

## 13. Definicja Sukcesu (6 miesięcy)

| KPI                           | Cel                            |
| ----------------------------- | ------------------------------ |
| Miesięczny ruch organiczny    | ≥ 50 000 sesji                 |
| Newsletter subskrybenci       | ≥ 5 000                        |
| Bounce rate                   | ≤ 45%                          |
| Avg. session duration         | ≥ 3 minuty                     |
| Lighthouse Performance Score  | ≥ 90                           |
| Core Web Vitals               | Passed (LCP < 2.5s, CLS < 0.1) |
| Artykuły opublikowane         | ≥ 120                          |
| Horoskopy (auto, miesięcznie) | ≥ 360 (12 znaków × 30 dni)     |
| Instagram followers           | ≥ 2 000                        |

---

## 14. Linki i Zasoby

| Zasób           | Link / Info                                    |
| --------------- | ---------------------------------------------- |
| Stitch Project  | ID: `1519172055150927000`                      |
| Design System   | Celestial Aura — violet/gold/rose, dark cosmic |
| Homepage Mockup | Screen ID: `de90d5f8b72a45ca9d22cfcfd8f70574`  |
| Repozytorium    | `/home/dawid/Projekty/star-sign`               |
| Inspiracje      | Chani App, The Pattern, Co-Star, Astro.com     |

---

_Dokument żywy — aktualizowany wraz z rozwojem projektu._
