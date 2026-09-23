import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, PLATFORM_ID, inject } from '@angular/core';

@Directive({
  selector: '[countUp]',
  standalone: true,
})
export class CountUpDirective implements AfterViewInit, OnDestroy {
  @Input('countUp') target: number | null = null;
  @Input() countUpSuffix = '';

  private el = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || this.target === null) return;
    const host = this.el.nativeElement;
    const finalText = `${this.target}${this.countUpSuffix}`;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      host.textContent = finalText;
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.animate(host, finalText);
            this.observer?.unobserve(host);
          }
        }
      },
      { threshold: 0.6 },
    );
    this.observer.observe(host);
  }

  private animate(host: HTMLElement, finalText: string): void {
    const target = this.target!;
    const duration = 900;
    const start = performance.now();

    host.setAttribute('aria-hidden', 'true');
    host.setAttribute('aria-label', finalText);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(target * eased);
      host.textContent = `${value}${this.countUpSuffix}`;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        host.textContent = finalText;
        host.removeAttribute('aria-hidden');
      }
    };
    requestAnimationFrame(step);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
