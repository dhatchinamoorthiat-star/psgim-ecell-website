import { DefaultUrlSerializer, UrlSerializer, UrlTree } from '@angular/router';

/**
 * The site's content and links use trailing-slash paths (/about/) to match the
 * static-site convention the old build used. Angular's router matches path
 * segments exactly, so normalize by stripping a trailing slash (except the
 * root '/') before parsing.
 */
export class TrailingSlashUrlSerializer extends DefaultUrlSerializer {
  override parse(url: string): UrlTree {
    if (url.length > 1 && url.endsWith('/')) {
      const [path, hash] = url.split('#');
      const [pathOnly, query] = path.split('?');
      let trimmed = pathOnly.replace(/\/+$/, '');
      if (trimmed === '') trimmed = '/';
      let rebuilt = trimmed;
      if (query) rebuilt += '?' + query;
      if (hash) rebuilt += '#' + hash;
      return super.parse(rebuilt);
    }
    return super.parse(url);
  }
}

export const trailingSlashUrlSerializerProvider = { provide: UrlSerializer, useClass: TrailingSlashUrlSerializer };
