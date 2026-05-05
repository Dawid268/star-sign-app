const path = require('path');
const appDir = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(appDir, '.env') });
const { createStrapi } = require('@strapi/strapi');

async function main() {
  const distDir = path.join(appDir, 'dist');

  console.log('🚀 Inicjowanie Strapi do INTELIGENTNEGO mapowania mediów...');
  const app = await createStrapi({ appDir, distDir }).load();

  const signs = [
    'baran',
    'byk',
    'bliznieta',
    'rak',
    'lew',
    'panna',
    'waga',
    'skorpion',
    'strzelec',
    'koziorozec',
    'wodnik',
    'ryby',
  ];

  const signsMapping = {
    baran: 'Baran',
    byk: 'Byk',
    bliznieta: 'Bliźnięta',
    rak: 'Rak',
    lew: 'Lew',
    panna: 'Panna',
    waga: 'Waga',
    skorpion: 'Skorpion',
    strzelec: 'Strzelec',
    koziorozec: 'Koziorożec',
    wodnik: 'Wodnik',
    ryby: 'Ryby',
  };

  try {
    console.log('🔍 Przeszukiwanie Biblioteki Mediów...');

    const files = await app.entityService.findMany('plugin::upload.file', {
      filters: {
        $or: [
          { name: { $startsWith: 'tarot_' } },
          { name: { $startsWith: 'daily_' } },
        ],
      },
    });

    console.log(`📦 Znaleziono ${files.length} potencjalnych plików.`);
    let mappedCount = 0;
    const skippedFiles = [];

    for (const file of files) {
      const purpose = file.name.startsWith('daily_')
        ? 'daily_card'
        : 'horoscope_sign';
      const prefix = purpose === 'daily_card' ? 'daily_' : 'tarot_';

      const regex = new RegExp(`${prefix}([a-z0-9ąćęłńóśźż_\\-]+)`, 'i');
      const nameMatch = file.name.match(regex);

      if (!nameMatch) {
        skippedFiles.push(file.name);
        continue;
      }

      const rawSlug = nameMatch[1].toLowerCase().split('_')[0];
      const normalizedSlug = rawSlug
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ł/g, 'l');

      const isZodiac =
        purpose === 'horoscope_sign' && signs.includes(normalizedSlug);
      const isDaily = purpose === 'daily_card';

      if (isZodiac || isDaily) {
        mappedCount++;
        const displayName = isZodiac
          ? signsMapping[normalizedSlug]
          : rawSlug.charAt(0).toUpperCase() + rawSlug.slice(1);

        // asset_key MUSI być unikalny w bazie, więc dodajemy ID pliku lub timestamp
        const assetKey = `${prefix}${normalizedSlug}_${file.id}`;

        console.log(
          `🎯 Mapowanie [${purpose}]: ${displayName} (klucz: ${assetKey})`,
        );

        // Sprawdzamy, czy ten KONKRETNY plik jest już zmapowany (żeby nie dublować)
        const alreadyMapped = await app.entityService.findMany(
          'plugin::ai-content-orchestrator.media-asset',
          {
            filters: { asset: file.id },
          },
        );

        if (alreadyMapped && alreadyMapped.length > 0) {
          console.log(`ℹ️  Plik ${file.name} jest już w katalogu. Pomijam.`);
          continue;
        }

        // Tworzenie nowego wpisu w Media Catalog
        const keywords = [normalizedSlug, purpose.replace('_', ' ')];
        if (isZodiac) keywords.push('zodiac', 'horoscope', 'sign');
        if (isDaily) keywords.push('tarot', 'daily card', 'reading');

        await app.entityService.create(
          'plugin::ai-content-orchestrator.media-asset',
          {
            data: {
              asset_key: assetKey,
              label: `${purpose === 'daily_card' ? 'Karta Dnia' : 'Karta Zodiaku'}: ${displayName}`,
              purpose: purpose,
              sign_slug: normalizedSlug,
              active: true,
              asset: file.id,
              keywords: keywords,
              mapping_source: 'manual',
              mapping_confidence: 1.0,
              priority: 10,
              notes: `Astral Variant | Mapped at ${new Date().toISOString()}`,
            },
          },
        );

        // 3. Aktualizacja pola image w modelach (opcjonalnie, dla tradycyjnego API)
        if (isDaily) {
          const cards = await app.entityService.findMany(
            'api::tarot-card.tarot-card',
            { filters: { slug: normalizedSlug } },
          );
          if (cards.length > 0)
            await app.entityService.update(
              'api::tarot-card.tarot-card',
              cards[0].id,
              { data: { image: file.id } },
            );
        } else if (isZodiac) {
          const signsList = await app.entityService.findMany(
            'api::zodiac-sign.zodiac-sign',
            { filters: { slug: normalizedSlug } },
          );
          if (signsList.length > 0)
            await app.entityService.update(
              'api::zodiac-sign.zodiac-sign',
              signsList[0].id,
              { data: { image: file.id } },
            );
        }

        console.log(`✅ Sukces: ${displayName}`);
      }
    }

    console.log(`\n🏁 MAPOWANIE ZAKOŃCZONE. Zmapowano: ${mappedCount} plików.`);
  } catch (error) {
    console.error('❌ BŁĄD MAPOWANIA:', error);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

main();
