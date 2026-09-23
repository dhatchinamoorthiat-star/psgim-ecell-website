import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { site } from '../data/site.data';

export interface SeoOptions {
  title: string;
  description: string;
  path: string;
  robots?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private titleService = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);

  set(opts: SeoOptions): void {
    const fullTitle = opts.path === '/' ? site.title : `${opts.title} — PSGIM E-Cell`;
    const url = site.url + opts.path;

    this.titleService.setTitle(fullTitle);

    this.setTag('name', 'description', opts.description);
    this.setTag('name', 'robots', opts.robots ?? 'index, follow');

    this.setTag('property', 'og:type', 'website');
    this.setTag('property', 'og:site_name', site.name);
    this.setTag('property', 'og:title', fullTitle);
    this.setTag('property', 'og:description', opts.description);
    this.setTag('property', 'og:url', url);
    this.setTag('property', 'og:image', `${site.url}/og.png`);
    this.setTag('property', 'og:image:width', '1200');
    this.setTag('property', 'og:image:height', '630');
    this.setTag('property', 'og:image:alt', site.title);

    this.setTag('name', 'twitter:card', 'summary_large_image');
    this.setTag('name', 'twitter:title', fullTitle);
    this.setTag('name', 'twitter:description', opts.description);
    this.setTag('name', 'twitter:image', `${site.url}/og.png`);

    this.setCanonical(url);
  }

  private setTag(attr: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attr]: key, content } as any);
  }

  private setCanonical(url: string): void {
    const head = this.doc.head;
    let link: HTMLLinkElement | null = head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
