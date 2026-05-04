const path = require('path');
const appDir = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(appDir, '.env') });
const { createStrapi } = require('@strapi/strapi');

async function main() {
  const distDir = path.join(appDir, 'dist');
  console.log('🚀 Inicjowanie Strapi do testu karty: Błazen...');
  const app = await createStrapi({ appDir, distDir }).load();

  const orchestrator = app.service('api::tarot-card.orchestrator');

  try {
    console.log('🔮 Generowanie karty: Błazen...');
    const specificPrompt =
      'A youthful mystical traveler in iridescent robes standing on the edge of a glowing nebula cliff, stepping into a cosmic void of golden light, holding a single white glowing rose, a small celestial dog made of stardust jumping at his feet.';

    const imageUrl = await orchestrator.generateDailyCardSample(
      'Błazen',
      specificPrompt,
      'iridescent pearl and golden stardust',
    );

    console.log('✨ KARTA WYGENEROWANA!');
    console.log('🔗 URL obrazu:', imageUrl);
  } catch (error) {
    console.error('❌ BŁĄD:', error);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

main();
