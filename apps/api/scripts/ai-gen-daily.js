const path = require('path');
const fs = require('fs');
const axios = require('axios');
const appDir = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(appDir, '.env') });
const { createStrapi } = require('@strapi/strapi');

// LISTA KART DNIA (Energii)
const dailyCards = [
  {
    name: 'Błazen',
    prompt:
      'A mystical traveler in iridescent robes stepping into a golden cosmic void, holding a glowing white rose.',
    color: 'iridescent pearl',
  },
  {
    name: 'Mag',
    prompt:
      'A master of elements wielding a floating crystalline staff, surrounded by spinning elemental orbs of fire, water, air, and earth.',
    color: 'electric blue and gold',
  },
  {
    name: 'Kapłanka',
    prompt:
      'A serene ethereal woman sitting between two massive pillars of black and white marble, holding a glowing silver scroll.',
    color: 'indigo and silver',
  },
  {
    name: 'Cesarzowa',
    prompt:
      'A majestic queen sitting on a throne of living emerald vines, surrounded by a lush astral garden under a pink nebula.',
    color: 'emerald and rose gold',
  },
  {
    name: 'Cesarz',
    prompt:
      'A powerful ruler sitting on a throne of jagged obsidian and glowing lava, holding a golden scepter with a sun orb.',
    color: 'crimson and ruby gold',
  },
  {
    name: 'Kapłan',
    prompt:
      'A wise spiritual figure standing before a massive golden stained-glass cathedral window in space, hands raised in blessing.',
    color: 'royal purple and gold',
  },
  {
    name: 'Kochankowie',
    prompt:
      'Two celestial beings made of light embracing under a massive radiant sun, surrounded by a swarm of golden butterflies.',
    color: 'warm amber and gold',
  },
  {
    name: 'Rydwan',
    prompt:
      'A golden chariot pulled by two ethereal sphinxes made of starlight and shadow, racing across a cosmic rainbow bridge.',
    color: 'vibrant gold and azure',
  },
  {
    name: 'Moc',
    prompt:
      'A graceful woman calmly closing the jaws of a massive lion made of pure solar fire and golden sparks.',
    color: 'solar orange and gold',
  },
  {
    name: 'Pustelnik',
    prompt:
      'A cloaked figure standing on a lonely moon peak, holding a lantern containing a trapped miniature supernova.',
    color: 'deep space blue and white',
  },
  {
    name: 'Koło Losu',
    prompt:
      'A massive intricate clockwork wheel made of gold and diamonds, spinning in the center of a spiral galaxy.',
    color: 'bright gold and diamond white',
  },
  {
    name: 'Sprawiedliwość',
    prompt:
      'A blindfolded figure holding a pair of burning golden scales and a sword made of frozen starlight.',
    color: 'pure white and gold',
  },
  {
    name: 'Wisielec',
    prompt:
      'A figure floating upside down in a state of deep meditation, surrounded by a halo of brilliant psychedelic light.',
    color: 'violet and neon teal',
  },
  {
    name: 'Śmierć',
    prompt:
      'A majestic skeletal figure in black armor riding a white horse made of mist, a black sun rising in the background.',
    color: 'black and cold silver',
  },
  {
    name: 'Umiarkowanie',
    prompt:
      'An angel with massive wings made of water pouring liquid light between two golden chalices in space.',
    color: 'soft sapphire and gold',
  },
  {
    name: 'Diabeł',
    prompt:
      'A massive winged figure made of shadow and chains, sitting on a throne of dark crystals with glowing red veins.',
    color: 'obsidian and dark red',
  },
  {
    name: 'Wieża',
    prompt:
      'A massive crystalline spire being struck by a bolt of cosmic lightning, disintegrating into shards of light.',
    color: 'electric purple and gold',
  },
  {
    name: 'Gwiazda',
    prompt:
      'A beautiful woman pouring water from two silver jars into an astral lake, seven giant stars shining above her.',
    color: 'shimmering silver and blue',
  },
  {
    name: 'Księżyc',
    prompt:
      'A giant mystical moon hanging over a path between two towers, two wolves howling made of lunar mist.',
    color: 'pale silver and indigo',
  },
  {
    name: 'Słońce',
    prompt:
      'A giant radiant sun with a human face, a child riding a white horse in a field of sunflowers under a golden sky.',
    color: 'brilliant yellow and gold',
  },
  {
    name: 'Sąd',
    prompt:
      'An angel blowing a golden trumpet, souls made of light rising from crystalline cocoons in a cosmic sea.',
    color: 'pure gold and white',
  },
  {
    name: 'Świat',
    prompt:
      'A figure dancing inside a wreath of laurel leaves, surrounded by the four elemental guardians in the corners of the cosmos.',
    color: 'iridescent opal and gold',
  },
];

async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function main() {
  const distDir = path.join(appDir, 'dist');
  console.log('🚀 Inicjowanie Strapi do generowania seryjnego Kart Dnia...');
  const app = await createStrapi({ appDir, distDir }).load();
  const orchestrator = app.service('api::tarot-card.orchestrator');

  const uploadDir = path.join(appDir, 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  console.log(`📋 Do wygenerowania: ${dailyCards.length} kart.`);

  for (const card of dailyCards) {
    const filename = `daily_${card.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l')
      .replace(/\s+/g, '_')}.webp`;
    const localPath = path.join(uploadDir, filename);

    if (fs.existsSync(localPath)) {
      console.log(`⏩ Pomijam ${card.name} (już istnieje).`);
      continue;
    }

    try {
      console.log(`🔮 Generowanie: ${card.name}...`);
      const imageUrl = await orchestrator.generateDailyCardSample(
        card.name,
        card.prompt,
        card.color,
      );

      console.log(`📥 Pobieranie obrazu dla ${card.name}...`);
      await downloadImage(imageUrl, localPath);
      console.log(`✅ Sukces dla ${card.name} (Zapisano jako: ${filename})`);

      // Krótka pauza dla stabilności
      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      console.error(`❌ BŁĄD przy ${card.name}:`, error.message);
      console.log('Przerywam, abyś mógł sprawdzić logi.');
      break;
    }
  }

  console.log('🏁 GENEROWANIE ZAKOŃCZONE.');
  await app.destroy();
  process.exit(0);
}

main();
