import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Input, PLATFORM_ID, inject } from '@angular/core';

@Component({
  selector: 'app-blog-share-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="share-bar">
      <span class="share-label">SHARE</span>

      <button (click)="shareLinkedIn()" class="share-btn linkedin" title="Share on LinkedIn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
        </svg>
      </button>

      <button (click)="shareWhatsApp()" class="share-btn whatsapp" title="Share on WhatsApp">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c4.55 0 8.24 3.69 8.24 8.24 0 4.55-3.69 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.19 8.19 0 0 1-1.26-4.37c0-4.55 3.69-8.24 8.25-8.24m-3.51 4.67c-.19 0-.5.07-.76.36-.26.29-.99.97-.99 2.37s1.02 2.75 1.16 2.94c.14.19 2 3.06 4.85 4.29.68.29 1.21.46 1.63.6.68.22 1.3.19 1.79.12.55-.08 1.69-.69 1.93-1.36.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.34s-1.69-.83-1.95-.93c-.26-.1-.45-.15-.64.15-.19.29-.74.93-.91 1.12-.17.19-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.08-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.65-.49-.17 0-.37-.01-.56-.01z"/>
        </svg>
      </button>

      <button (click)="copyLink()" class="share-btn copy" title="Copy Article Link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>

      @if (copied) {
        <span class="copied-toast">Link Copied!</span>
      }
    </div>
  `,
  styles: [`
    .share-bar {
      display: flex;
      align-items: center;
      gap: var(--s-2);
      position: relative;
    }
    .share-label {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--ink-3);
      margin-right: 4px;
    }
    .share-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 1px solid var(--rule-strong);
      background: var(--surface);
      color: var(--ink-2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--dur-fast) ease;
    }
    .share-btn:hover {
      border-color: var(--accent);
      color: var(--accent-ink);
      background: var(--accent-soft);
      transform: translateY(-2px);
    }
    .copied-toast {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--ink);
      color: var(--on-accent);
      font-size: var(--t-micro);
      font-weight: 800;
      padding: 4px 8px;
      border-radius: var(--r-sm);
      white-space: nowrap;
      animation: fadeIn 200ms ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translate(-50%, 5px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
  `]
})
export class BlogShareBarComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) slug!: string;

  copied = false;
  private platformId = inject(PLATFORM_ID);

  private getUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      return window.location.href;
    }
    return `https://psgim-ecell.pages.dev/blogs/${this.slug}`;
  }

  shareLinkedIn(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = encodeURIComponent(this.getUrl());
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }

  shareWhatsApp(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const text = encodeURIComponent(`Check out "${this.title}" on NEC E-Cell:\n${this.getUrl()}`);
    const shareUrl = `https://api.whatsapp.com/send?text=${text}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }

  copyLink(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(this.getUrl()).then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 2500);
      });
    }
  }
}
