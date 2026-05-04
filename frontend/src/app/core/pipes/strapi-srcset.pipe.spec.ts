import { StrapiSrcsetPipe } from './strapi-srcset-pipe';
import { environment } from '../../../environments/environment';

describe('StrapiSrcsetPipe', () => {
  let pipe: StrapiSrcsetPipe;

  beforeEach(() => {
    pipe = new StrapiSrcsetPipe();
  });

  it('should return empty string if no image', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return full URL if no formats', () => {
    const img = { url: '/uploads/test.jpg' };
    expect(pipe.transform(img)).toBe(`${environment.apiUrl}/uploads/test.jpg`);
  });

  it('should generate correct srcset with multiple formats', () => {
    const img = {
      url: '/uploads/original.jpg',
      width: 2000,
      formats: {
        large: { url: '/uploads/large.jpg', width: 1000 },
        small: { url: '/uploads/small.jpg', width: 500 },
      },
    };

    const result = pipe.transform(img);
    expect(result).toContain(`${environment.apiUrl}/uploads/large.jpg 1000w`);
    expect(result).toContain(`${environment.apiUrl}/uploads/small.jpg 500w`);
    expect(result).toContain(
      `${environment.apiUrl}/uploads/original.jpg 2000w`,
    );
  });

  it('should handle absolute URLs correctly', () => {
    const img = {
      url: 'https://cdn.example.com/test.jpg',
      formats: {
        thumbnail: { url: 'https://cdn.example.com/thumb.jpg', width: 150 },
      },
    };

    const result = pipe.transform(img);
    expect(result).toContain('https://cdn.example.com/thumb.jpg 150w');
    expect(result).toContain('https://cdn.example.com/test.jpg 2000w');
  });
});
