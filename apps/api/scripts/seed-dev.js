const { seedWithMode } = require('./seed-core');

seedWithMode('dev').catch((error) => {
  console.error('❌ Seed dev zakończył się błędem:', error);
  process.exit(1);
});
