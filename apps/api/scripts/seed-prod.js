const { seedWithMode } = require('./seed-core');

seedWithMode('prod').catch((error) => {
  console.error('❌ Seed prod zakończył się błędem:', error);
  process.exit(1);
});
