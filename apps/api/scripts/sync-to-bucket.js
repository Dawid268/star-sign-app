const path = require('path');
const fs = require('fs');
const appDir = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(appDir, '.env') });
const { createStrapi } = require('@strapi/strapi');

async function main() {
  const distDir = path.join(appDir, 'dist');

  console.log('🚀 Inicjowanie Strapi do synchronizacji z bucketem...');
  const app = await createStrapi({ appDir, distDir }).load();

  try {
    // 1. Pobranie wszystkich assetów tarotowych z katalogu mediów
    console.log('🔍 Szukanie kart tarota w katalogu AICO...');
    const assets = await app.entityService.findMany(
      'plugin::ai-content-orchestrator.media-asset',
      {
        filters: {
          purpose: 'horoscope_sign',
        },
        populate: ['asset'],
      },
    );

    if (!assets || assets.length === 0) {
      console.log('❌ Nie znaleziono żadnych assetów do synchronizacji.');
      return;
    }

    console.log(
      `📦 Znaleziono ${assets.length} assetów. Rozpoczynam migrację na bucket...`,
    );
    const uploadService = app.plugin('upload').service('upload');

    for (const entry of assets) {
      const localFile = entry.asset;

      if (!localFile) {
        console.log(
          `⚠️ Asset ${entry.label} nie ma powiązanego pliku. Pomijam.`,
        );
        continue;
      }

      // Sprawdzamy czy plik jest lokalny (provider to 'local')
      if (localFile.provider !== 'local') {
        console.log(
          `✅ Asset ${entry.label} jest już na ${localFile.provider}. Pomijam.`,
        );
        continue;
      }

      console.log(`🔄 Migracja: ${entry.label} (${localFile.name})...`);

      const publicDir = path.join(appDir, 'public');
      const localPath = path.join(publicDir, localFile.url);

      if (!fs.existsSync(localPath)) {
        console.error(`❌ Nie znaleziono pliku na dysku: ${localPath}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(localPath);

      // Wgrywamy ponownie - jeśli R2_UPLOAD_ENABLED=true w .env, to poleci na bucket
      const uploadedFiles = await uploadService.upload({
        data: {
          fileInfo: {
            alternativeText: localFile.alternativeText,
            caption: localFile.caption,
            name: localFile.name,
          },
        },
        files: {
          filepath: localPath,
          originalFilename: localFile.name,
          name: localFile.name,
          type: localFile.mime,
          size: fileBuffer.length,
        },
      });

      const newFile = Array.isArray(uploadedFiles)
        ? uploadedFiles[0]
        : uploadedFiles;

      if (newFile && newFile.id) {
        console.log(`📦 Strapi użyło dostawcy: ${newFile.provider}`);

        if (
          newFile.provider === 'local' &&
          process.env.R2_UPLOAD_ENABLED === 'true'
        ) {
          console.warn(
            '⚠️ OSTRZEŻENIE: Flaga R2 jest włączona, ale Strapi nadal używa lokalnego storage!',
          );
        }

        // Aktualizacja assetu w AICO
        await app.entityService.update(
          'plugin::ai-content-orchestrator.media-asset',
          entry.id,
          {
            data: {
              asset: newFile.id,
              notes:
                (entry.notes || '') +
                ` | Migrated to ${newFile.provider} at ${new Date().toISOString()}`,
            },
          },
        );

        console.log(
          `✨ Sukces! ${entry.label} jest teraz na ${newFile.provider} (ID: ${newFile.id})`,
        );
      }
    }

    console.log('🏁 SYNCHRONIZACJA ZAKOŃCZONA.');
  } catch (error) {
    console.error('❌ BŁĄD PODCZAS SYNCHRONIZACJI:', error);
  } finally {
    await app.destroy();
    process.exit(0);
  }
}

main();
