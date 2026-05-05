import { AstrologyService } from './astrology.service';

describe('AstrologyService', () => {
  let service: AstrologyService;

  beforeEach(() => {
    service = new AstrologyService();
  });

  it('should correctly identify Sun Sign for all zodiac signs', () => {
    const testCases = [
      { date: new Date(2024, 2, 21), expected: 'Baran' },
      { date: new Date(2024, 3, 19), expected: 'Baran' },
      { date: new Date(2024, 3, 20), expected: 'Byk' },
      { date: new Date(2024, 4, 20), expected: 'Byk' },
      { date: new Date(2024, 4, 21), expected: 'Bliźnięta' },
      { date: new Date(2024, 5, 20), expected: 'Bliźnięta' },
      { date: new Date(2024, 5, 21), expected: 'Rak' },
      { date: new Date(2024, 6, 22), expected: 'Rak' },
      { date: new Date(2024, 6, 23), expected: 'Lew' },
      { date: new Date(2024, 7, 22), expected: 'Lew' },
      { date: new Date(2024, 7, 23), expected: 'Panna' },
      { date: new Date(2024, 8, 22), expected: 'Panna' },
      { date: new Date(2024, 8, 23), expected: 'Waga' },
      { date: new Date(2024, 9, 22), expected: 'Waga' },
      { date: new Date(2024, 9, 23), expected: 'Skorpion' },
      { date: new Date(2024, 10, 21), expected: 'Skorpion' },
      { date: new Date(2024, 10, 22), expected: 'Strzelec' },
      { date: new Date(2024, 11, 21), expected: 'Strzelec' },
      { date: new Date(2024, 11, 22), expected: 'Koziorożec' },
      { date: new Date(2024, 0, 19), expected: 'Koziorożec' },
      { date: new Date(2024, 0, 20), expected: 'Wodnik' },
      { date: new Date(2024, 1, 18), expected: 'Wodnik' },
      { date: new Date(2024, 1, 19), expected: 'Ryby' },
      { date: new Date(2024, 2, 20), expected: 'Ryby' },
    ];

    testCases.forEach(({ date, expected }) => {
      expect(service.getSunSign(date)).toBe(expected);
    });
  });

  it('should handle edge cases in rising sign (undefined time parts)', () => {
    const date = new Date(1990, 2, 21);
    expect(service.getRisingSign(date, '')).toBeTruthy();
    expect(service.getRisingSign(date, ':')).toBeTruthy();
  });

  it('should estimate Moon Sign', () => {
    const date = new Date(1990, 4, 15);
    const sign = service.getMoonSign(date);
    expect(sign).toBeTruthy();
    expect(typeof sign).toBe('string');
  });

  it('should calculate Rising Sign based on time', () => {
    const date = new Date(1990, 2, 21); // Sun in Aries
    // At 6:00 AM (Sunrise), Rising should be Aries
    expect(service.getRisingSign(date, '06:00')).toBe('Baran');
    // At 8:00 AM (2h later), Rising should be Taurus
    expect(service.getRisingSign(date, '08:00')).toBe('Byk');
    // At 6:00 PM (12h later), Rising should be Libra (opposite)
    expect(service.getRisingSign(date, '18:00')).toBe('Waga');
  });
});
