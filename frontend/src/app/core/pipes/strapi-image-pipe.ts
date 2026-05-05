import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'strapiImage',
  standalone: true,
})
export class StrapiImagePipe implements PipeTransform {
  transform(url: string | undefined | null): string {
    if (!url) {
      return '';
    }

    if (url.startsWith('http')) {
      return url;
    }

    return `${environment.apiUrl}${url}`;
  }
}
