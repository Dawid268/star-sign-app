const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { createStrapi } = require('@strapi/strapi');

async function main() {
  const appDir = path.join(__dirname, '..');
  const distDir = path.join(appDir, 'dist');

  console.log('🚀 Inicjowanie Strapi...');
  const app = await createStrapi({ appDir, distDir }).load();

  const promptFilePath = '/home/dawid/Pobrane/prompty-karty-zodiaku-flux2.md';
  console.log(`📖 Odczytywanie promptów z: ${promptFilePath}`);

  if (!fs.existsSync(promptFilePath)) {
    console.error('❌ Plik z promptami nie istnieje!');
    process.exit(1);
  }

  const content = fs.readFileSync(promptFilePath, 'utf8');

  // Prosty parser dla pliku MD
  const signs = [
    'Baran',
    'Byk',
    'Bliźnięta',
    'Rak',
    'Lew',
    'Panna',
    'Waga',
    'Skorpion',
    'Strzelec',
    'Koziorożec',
    'Wodnik',
    'Ryby',
  ];

  const cardsToGenerate = [];

  for (const sign of signs) {
    // Szukamy sekcji dla danego znaku
    const signRegex = new RegExp(
      `### ${sign}.*?\\n\\n\`\`\`text\\n([\\s\\S]*?)\\n\`\`\``,
      'i',
    );
    const match = content.match(signRegex);

    if (match) {
      const rawPrompt = match[1];

      // Wyciąganie metadanych z tagów [TAG: ...]
      const glyph = (rawPrompt.match(/\[GLYPH:\s*(.*?)]/) || [])[1] || '';
      const namePl = (rawPrompt.match(/\[NAZWA_PL:\s*(.*?)]/) || [])[1] || sign;
      const colorMotif =
        (rawPrompt.match(/\[KOLOR_MOTYWU:\s*(.*?)]/) || [])[1] || '';
      const constellation =
        (rawPrompt.match(/\[KONSTELACJA:\s*(.*?)]/) || [])[1] || '';

      // Wyciąganie właściwego opisu (wszystko po kropce zamykającej tagi)
      let specificPrompt = rawPrompt.replace(/\[.*?\]/g, '').trim();
      if (specificPrompt.startsWith('.'))
        specificPrompt = specificPrompt.substring(1).trim();

      // Dodajemy wersję PREMIUM (Wersja 3 z pliku) - tłumaczymy na ENG dla lepszych efektów Fluxa
      const premiumSuffix =
        "The overall design must look like an exceptionally luxurious premium collector card, mesmerizing from the first glance, spectacular, emotional, highly polished, with a strong 'wow' effect and a sense of visual awe.";

      cardsToGenerate.push({
        cardName: namePl,
        specificPrompt: `${specificPrompt} ${premiumSuffix}`,
        glyph,
        colorMotif,
        constellation,
      });
    }
  }

  console.log(
    `🎯 Przygotowano ${cardsToGenerate.length} kart do wygenerowania.`,
  );

  const orchestrator = app.service('api::tarot-card.orchestrator');

  try {
    // UWAGA: Ta metoda generuje obrazy sekwencyjnie i przerywa przy pierwszym błędzie
    const results = await orchestrator.generateAllCards(cardsToGenerate);
    console.log('✨ WSZYSTKIE KARTY WYGENEROWANE POMYŚLNIE!');
    console.table(results);
  } catch (error) {
    console.error('❌ PROCES PRZERWANY ZE WZGLĘDU NA BŁĄD:');
    console.error(error.message);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
