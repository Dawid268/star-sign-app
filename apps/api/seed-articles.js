const axios = require('axios');

async function seedArticles() {
  const articles = [
    {
      title: 'Tajemnice Twojego Znaku Zodiaku',
      slug: 'tajemnice-znaku-zodiaku',
      content: 'Poznaj głębsze znaczenie swojego znaku zodiaku i dowiedz się, jak gwiazdy wpływają na Twoje życie codzienne.',
      publishedAt: new Date().toISOString()
    },
    {
      title: 'Jak czytać karty Tarota?',
      slug: 'jak-czytac-tarota',
      content: 'Przewodnik dla początkujących po świecie Tarota. Dowiedz się, co oznaczają poszczególne arkana.',
      publishedAt: new Date().toISOString()
    },
    {
      title: 'Horoskop na nadchodzący miesiąc',
      slug: 'horoskop-nadchodzacy-miesiac',
      content: 'Sprawdź, co przygotował dla Ciebie los w nadchodzących tygodniach. Pełna analiza dla każdego znaku.',
      publishedAt: new Date().toISOString()
    }
  ];

  for (const article of articles) {
    try {
      await axios.post('http://localhost:1337/api/articles', { data: article });
      console.log(`Zasiano artykuł: ${article.title}`);
    } catch (error) {
      console.error(`Nie udało się zasiać artykułu ${article.title}:`, error.response?.data || error.message);
    }
  }
}

seedArticles();
