import { describe, expect, it } from 'vitest';

import {
  assertPremiumContentQuality,
  evaluatePremiumContentQuality,
} from './premium-quality';

const words = (prefix: string, count: number): string =>
  Array.from({ length: count }, (_, index) => `${prefix}${index}`).join(' ');

const validPremium = (count = 75): string => `
Relacje: ${words('relacja', count)}
Praca: ${words('praca', count)}
Energia dnia: ${words('energia', count)}
Rytuał: ${words('rytual', count)}
Pytanie refleksyjne: ${words('pytanie', count)}
`;

describe('premium quality validator', () => {
  it('rejects missing premium content', () => {
    const result = evaluatePremiumContentQuality({
      content: 'Darmowy horoskop',
      premiumContent: '',
      kind: 'horoscope-daily',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing_premium_content');
  });

  it('rejects short premium content without required sections', () => {
    const result = evaluatePremiumContentQuality({
      content: 'Darmowy horoskop',
      premiumContent: 'Krótki dopisek premium.',
      kind: 'horoscope-daily',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('missing_required_sections');
    expect(
      result.issues.some((issue) => issue.startsWith('premium_too_short')),
    ).toBe(true);
  });

  it('rejects copied free content', () => {
    const freeContent = words('free', 190);
    const result = evaluatePremiumContentQuality({
      content: freeContent,
      premiumContent: freeContent,
      kind: 'horoscope-daily',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('premium_copies_free_content');
  });

  it('accepts strict 2x premium content with required sections', () => {
    const result = evaluatePremiumContentQuality({
      content: words('free', 120),
      premiumContent: validPremium(40),
      kind: 'horoscope-daily',
    });

    expect(result.valid).toBe(true);
    expect(result.premiumWords).toBeGreaterThanOrEqual(result.minimumWords);
  });

  it('throws a quality_failed error for invalid content', () => {
    expect(() =>
      assertPremiumContentQuality({
        label: 'Baran',
        content: 'Darmowy horoskop',
        premiumContent: 'Za krótkie premium.',
        kind: 'horoscope-daily',
      }),
    ).toThrow(/Baran: quality_failed premiumContent/);
  });
});
