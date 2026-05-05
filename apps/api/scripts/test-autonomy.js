const path = require('path');
const appDir = path.join(__dirname, '..');
const distDir = path.join(appDir, 'dist');
require('dotenv').config({ path: path.join(appDir, '.env') });
const { createStrapi } = require('@strapi/strapi');

async function main() {
  console.log('🚀 Inicjowanie Strapi dla testu autonomii AICO...');
  const app = await createStrapi({ appDir, distDir }).load();

  try {
    console.log('--- AICO Autonomy Test ---');
    const count = await app.db
      .query('api::article.article')
      .count({ where: { image: { $null: true } } });
    console.log(`Znaleziono ${count} artykułów bez zdjęcia.`);

    // Uruchamiamy reconcile dla WSZYSTKICH brakujących
    // Ale możemy też wymusić dla konkretnego jeśli chcemy.

    const orchestratorService = app
      .plugin('ai-content-orchestrator')
      .service('orchestrator');
    console.log(
      'Dostępne metody orchestrator:',
      Object.keys(orchestratorService),
    );

    console.log('Uruchamiam reconcileArticleImages...');
    const result = await orchestratorService.reconcileArticleImages();
    console.log('Wynik naprawy:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('BŁĄD TESTU:', err);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

main();
