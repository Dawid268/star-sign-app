async function seedTarot() {
  const cards = [
    {
      name: 'Głupiec',
      arcana: 'Wielkie Arkana · 0',
      meaning_upright: 'Nowy początek, spontaniczność, wiara we wszechświat.',
      description:
        'Karta Głupca oznacza moment w Twoim życiu, kiedy stoisz na krawędzi nowej przygody. Nie bój się zaryzykować.',
      symbol: '🃏',
      slug: 'glupiec',
    },
    {
      name: 'Mag',
      arcana: 'Wielkie Arkana · I',
      meaning_upright: 'Manifestacja, sprawczość, pewność siebie, kreatywność.',
      description:
        'Mag przypomina Ci, że masz wszystkie narzędzia potrzebne do osiągnięcia sukcesu. Skoncentruj swoją wolę.',
      symbol: '🪄',
      slug: 'mag',
    },
    {
      name: 'Kapłanka',
      arcana: 'Wielkie Arkana · II',
      meaning_upright: 'Intuicja, tajemnica, podświadomość, sny.',
      description:
        'Wsłuchaj się w swój wewnętrzny głos. Nie wszystko jest widoczne na pierwszy rzut oka.',
      symbol: '🌙',
      slug: 'kaplanka',
    },
    {
      name: 'Cesarzowa',
      arcana: 'Wielkie Arkana · III',
      meaning_upright: 'Obfitość, kobiecość, płodność, piękno natury.',
      description:
        'Czas na tworzenie i cieszenie się zmysłowymi przyjemnościami życia.',
      symbol: '👑',
      slug: 'cesarzowa',
    },
    {
      name: 'Kochankowie',
      arcana: 'Wielkie Arkana · VI',
      meaning_upright: 'Wybór, relacje, harmonia wartości.',
      description:
        'Podejmij decyzję sercem. Ta karta symbolizuje ważne połączenie lub wybór ścieżki życiowej.',
      symbol: '❤️',
      slug: 'kochankowie',
    },
  ];

  for (const card of cards) {
    try {
      const response = await fetch('http://localhost:1337/api/tarot-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: card }),
      });
      const result = await response.json();
      if (response.ok) {
        console.log(`Zasiano kartę tarota: ${card.name}`, result.data.id);
      } else {
        console.error(
          `Nie udało się zasiać karty tarota ${card.name}:`,
          result.error,
        );
      }
    } catch (error) {
      console.error(
        `Nie udało się zasiać karty tarota ${card.name}:`,
        error.message,
      );
    }
  }
}

seedTarot();
