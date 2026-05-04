import { StrapiImagePipe } from './strapi-image-pipe';
import { environment } from '../../../environments/environment';

describe('StrapiImagePipe', () => {
  let pipe: StrapiImagePipe;

  beforeEach(() => {
    pipe = new StrapiImagePipe();
  });

  it('should return empty string for null/undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return same URL if it starts with http', () => {
    const url = 'https://example.com/img.png';
    expect(pipe.transform(url)).toBe(url);
  });

  it('should prepend apiUrl if it is a relative path', () => {
    const url = '/uploads/img.png';
    expect(pipe.transform(url)).toBe(`${environment.apiUrl}${url}`);
  });
});
