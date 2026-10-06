import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, Inject, Input, PLATFORM_ID, inject } from '@angular/core';

@Component({
  selector: 'app-blog-reading-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Top Progress Bar -->
    <div class="top-progress-container">
      <div class="top-progress-bar" [style.width.%]="progress"></div>
    </div>

    <!-- Floating Reading Pill (Desktop & Mobile) -->
    <div class="floating-progress-pill" [class.visible]="isVisible">
      <span class="pill-title">PART {{ activePart }} OF {{ totalParts }}</span>
      <div class="pill-dots">
        @for (dot of [1, 2, 3, 4]; track dot) {
          <span
            class="dot"
            [class.active]="dot === activePart"
            [class.completed]="dot < activePart"
          ></span>
        }
      </div>
      <span class="pill-pct">{{ progress }}%</span>
    </div>
  `,
  styles: [`
    .top-progress-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: transparent;
      z-index: 1000;
      pointer-events: none;
    }
    .top-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--ocean));
      transition: width 100ms ease-out;
    }

    .floating-progress-pill {
      position: fixed;
      bottom: var(--s-5);
      right: var(--s-5);
      z-index: 990;
      background: var(--surface);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-pill);
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: var(--shadow-lg);
      transform: translateY(100px);
      opacity: 0;
      transition: all var(--dur-normal) var(--ease-out);
    }
    .floating-progress-pill.visible {
      transform: translateY(0);
      opacity: 1;
    }

    .pill-title {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
    }

    .pill-dots {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--rule-strong);
      transition: all var(--dur-fast) ease;
    }
    .dot.active {
      background: var(--accent);
      transform: scale(1.4);
    }
    .dot.completed {
      background: var(--accent-ink);
    }

    .pill-pct {
      font-size: var(--t-micro);
      font-weight: 700;
      color: var(--ink-3);
      font-mono: monospace;
    }

    @media (max-width: 640px) {
      .floating-progress-pill {
        bottom: var(--s-4);
        right: var(--s-4);
        padding: 6px 12px;
        gap: 8px;
      }
    }
  `]
})
export class BlogReadingProgressComponent {
  @Input() activePart: number = 1;
  @Input() totalParts: number = 4;

  progress: number = 0;
  isVisible: boolean = false;

  private platformId = inject(PLATFORM_ID);

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (docHeight > 0) {
      this.progress = Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100)));
    } else {
      this.progress = 0;
    }

    this.isVisible = scrollTop > 250;
  }
}
