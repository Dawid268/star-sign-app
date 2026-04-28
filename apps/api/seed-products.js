async function seedProducts() {
  const products = [
    { name: 'Ametyst Intuicji', sku: 'AMETYST-INTUICJI', price: 49, currency: 'PLN', stock_status: 'in_stock', category: 'Kryształy', symbol: '💎', tag: 'Bestseller', description: 'Naturalny kryształ ametystu wspierający intuicję.' },
    { name: 'Świeca Intencji — Księżyc', sku: 'SWIECA-KSIEZYC', price: 89, currency: 'PLN', stock_status: 'in_stock', category: 'Świece', symbol: '🕯️', tag: 'Nowość', description: 'Ręcznie robiona świeca sojowa z intencją spokoju.' },
    { name: 'Zestaw Początkujący Tarot', sku: 'TAROT-STARTER', price: 120, currency: 'PLN', stock_status: 'in_stock', category: 'Karty', symbol: '🃏', tag: 'Zestaw', description: 'Klasyczna talia kart tarota wraz z przewodnikiem.' },
    { name: 'Naszyjnik Fazy Księżyca', sku: 'NASZYJNIK-FAZY-KSIEZYCA', price: 159, currency: 'PLN', stock_status: 'in_stock', category: 'Biżuteria', symbol: '🌙', description: 'Srebrny naszyjnik (próba 925) przedstawiający fazy księżyca.' },
    { name: 'Kadzidło Biała Szałwia', sku: 'KADZIDLO-BIALA-SZALWIA', price: 29, currency: 'PLN', stock_status: 'in_stock', category: 'Kadzidła', symbol: '🌿', tag: 'Bestseller', description: 'Pęczek białej szałwii do rytualnego oczyszczania przestrzeni.' }
  ];

  for (const product of products) {
    try {
      await fetch('http://localhost:1337/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: product })
      });
      console.log(`Zasiano produkt: ${product.name}`);
    } catch (error) {
      console.error(`Nie udało się zasiać produktu ${product.name}:`, error.message);
    }
  }
}

// Grant temporary create permission then run
// (Already done manually for articles, I'll do it for products now)
seedProducts();
