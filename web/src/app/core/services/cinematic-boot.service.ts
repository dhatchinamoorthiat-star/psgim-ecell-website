import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const SESSION_KEY = 'ecell-video-played';
const FLAG_CACHE = 'ecell-boot-v1';
const FLAG_KEY = '/__hard-refresh-flag__';

@Injectable({
  providedIn: 'root',
})
export class CinematicBootService {
  private platformId = inject(PLATFORM_ID);
  private inMemoryBooted = false;
  private hardRefreshFlag = false;
  private ready: Promise<void> = Promise.resolve();

  /** True once the boot sequence (video or typing-only) has already run during this SPA session — suppresses it on in-app navigation back to "/". */
  hasBooted(): boolean {
    return this.inMemoryBooted;
  }

  markAsBooted(): void {
    this.inMemoryBooted = true;
  }

  /**
   * Registers the hard-refresh-detecting service worker and resolves the
   * flag it may have left behind. Call once, as early as possible (an app
   * initializer), and await it before any component reads shouldPlayVideo().
   */
  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.ready = this.detectHardRefresh();
    await this.ready;
  }

  /**
   * Decides whether the full cinematic (video) should play:
   * - First load of the tab (no session flag) → always play the video.
   * - A hard refresh (cache bypassed, e.g. Cmd/Ctrl+Shift+R) → play it again.
   * - A normal refresh or in-app return to "/" → skip the video, type only.
   */
  shouldPlayVideo(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (!sessionStorage.getItem(SESSION_KEY)) return true;
    return this.hardRefreshFlag;
  }

  markVideoPlayed(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(SESSION_KEY, '1');
    }
  }

  private async detectHardRefresh(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
      this.hardRefreshFlag = this.isHardRefreshByTransferSize();
      return;
    }

    try {
      await navigator.serviceWorker.register('/boot-sw.js');

      const cache = await caches.open(FLAG_CACHE);
      const match = await cache.match(FLAG_KEY);
      if (match) {
        this.hardRefreshFlag = true;
        await cache.delete(FLAG_KEY);
      } else {
        // No service worker was controlling this navigation yet (e.g. the
        // very first time it's being installed) — fall back to the
        // heuristic rather than silently assuming "soft."
        this.hardRefreshFlag = this.isHardRefreshByTransferSize();
      }
    } catch {
      this.hardRefreshFlag = this.isHardRefreshByTransferSize();
    }
  }

  /** Best-effort fallback when the service worker can't be used: a hard refresh re-transfers the full document, where a soft refresh is normally served from cache or a small 304. Unreliable on dev servers that disable HTTP caching entirely. */
  private isHardRefreshByTransferSize(): boolean {
    try {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const nav = entries[0];
      if (!nav || nav.type !== 'reload') return false;
      return nav.transferSize > 1024;
    } catch {
      return false;
    }
  }
}
