import { Injectable } from '@angular/core';

export interface NatalChart {
  sun: string;
  moon: string;
  rising: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AstrologyService {
  private readonly signs = [
    'Baran',
    'Byk',
    'Bliźnięta',
    'Rak',
    'Lew',
    'Panna',
    'Waga',
    'Skorpion',
    'Strzelec',
    'Koziorożec',
    'Wodnik',
    'Ryby',
  ];

  /**
   * Calculates Sun, Moon, and Rising signs.
   * Note: This is a simplified calculation for MVP purposes.
   */
  public calculateNatalChart(
    birthDate: Date,
    birthTime: string | null,
    birthPlace: string,
  ): NatalChart {
    return {
      sun: this.getSunSign(birthDate),
      moon: this.getMoonSign(birthDate),
      rising: birthTime ? this.getRisingSign(birthDate, birthTime) : null,
    };
  }

  public getSunSign(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
      return 'Baran';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Byk';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
      return 'Bliźnięta';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Rak';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Lew';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
      return 'Panna';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
      return 'Waga';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
      return 'Skorpion';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
      return 'Strzelec';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
      return 'Koziorożec';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
      return 'Wodnik';
    return 'Ryby';
  }

  public getMoonSign(date: Date): string {
    // Simplified lunar cycle calculation: 27.32 days
    // Epoch: 1970-01-01 was a Moon in Libra (approx)
    const epoch = new Date(1970, 0, 1).getTime();
    const now = date.getTime();
    const diff = (now - epoch) / (1000 * 60 * 60 * 24);
    const cycle = 27.321661;
    const position = (diff % cycle) / cycle;
    const signIndex = Math.floor(position * 12);

    // Adjusted index for Libra start in 1970
    return this.signs[(signIndex + 6) % 12];
  }

  public getRisingSign(date: Date, time: string): string {
    // Rising sign depends heavily on the hour and the Sun sign
    // At sunrise, the Rising sign is the same as the Sun sign
    // The zodiac rotates 360 degrees in 24 hours (1 sign every 2 hours)

    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = (hours || 0) * 60 + (minutes || 0);

    // Assume average sunrise at 6:00 AM
    const minutesFromSunrise = (totalMinutes - 360 + 1440) % 1440;
    const signsShifted = Math.floor(minutesFromSunrise / 120);

    const sunSignIndex = this.signs.indexOf(this.getSunSign(date));
    return this.signs[(sunSignIndex + signsShifted) % 12];
  }
}
