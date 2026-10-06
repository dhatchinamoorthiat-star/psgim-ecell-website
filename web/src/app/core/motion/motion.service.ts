import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class MotionService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly prefersReducedMotion = signal(false);

  constructor() {
    if (this.isBrowser && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion.set(mediaQuery.matches);
      
      const listener = (e: MediaQueryListEvent) => {
        this.prefersReducedMotion.set(e.matches);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else {
        mediaQuery.addListener(listener);
      }
    }
  }

  shouldAnimate(): boolean {
    return this.isBrowser && !this.prefersReducedMotion();
  }
}
