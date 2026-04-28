const { seedWithMode } = require('./seed-core');

seedWithMode('stg').catch((error) => {
  console.error('❌ Seed stg zakończył się błędem:', error);
  process.exit(1);
});
