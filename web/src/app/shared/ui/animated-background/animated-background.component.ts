import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, PLATFORM_ID, ViewChild, computed, effect, inject, input } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { BackgroundVariant, VARIANT_PRESETS } from './animated-background.config';

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  pulse: number;
}

/**
 * Reusable ambient background: a slow CSS gradient field, an optional
 * technical grid, and a lightweight canvas node network. Purely decorative
 * (aria-hidden, pointer-events: none on the host) and SSR-safe — all
 * browser-only work is gated behind isPlatformBrowser and only runs after
 * the view is attached.
 */
@Component({
  selector: 'app-animated-background',
  standalone: true,
  template: `
    <div class="bg-field" aria-hidden="true"></div>
    @if (preset().showGrid) {
      <div class="bg-grid" aria-hidden="true"></div>
    }
    <canvas #canvas class="bg-canvas" aria-hidden="true"></canvas>
  `,
  styleUrl: './animated-background.component.css',
})
export class AnimatedBackgroundComponent implements AfterViewInit, OnDestroy {
  variant = input<BackgroundVariant>('default');
  preset = computed(() => VARIANT_PRESETS[this.variant()]);

  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private platformId = inject(PLATFORM_ID);
  private theme = inject(ThemeService);
  private host = inject(ElementRef<HTMLElement>);

  private ctx?: CanvasRenderingContext2D | null;
  private nodes: NetworkNode[] = [];
  private rafId = 0;
  private reduceMotion = false;
  private isVisible = true;
  private mouse = { x: -9999, y: -9999 };
  private colors = { dot: 'rgba(0,0,0,.35)', line: 'rgba(0,0,0,.1)', pulse: 'rgba(236,153,0,.85)' };
  private intersectionObserver?: IntersectionObserver;
  private reduceMotionQuery?: MediaQueryList;

  private readonly onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
  private readonly onResize = () => this.setupCanvas();
  private readonly onReduceMotionChange = (e: MediaQueryListEvent) => {
    this.reduceMotion = e.matches;
    this.restartLoop();
  };

  constructor() {
    effect(() => {
      this.theme.mode();
      if (isPlatformBrowser(this.platformId) && this.ctx) {
        this.recomputeColors();
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduceMotion = this.reduceMotionQuery.matches;
    this.reduceMotionQuery.addEventListener('change', this.onReduceMotionChange);

    this.setupCanvas();
    this.recomputeColors();

    if (this.preset().enableMouseInteraction && window.innerWidth > 768) {
      window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    }
    window.addEventListener('resize', this.onResize, { passive: true });

    this.intersectionObserver = new IntersectionObserver((entries) => {
      this.isVisible = entries[0]?.isIntersecting ?? true;
      this.restartLoop();
    });
    this.intersectionObserver.observe(this.host.nativeElement);

    this.restartLoop();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.rafId);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('resize', this.onResize);
      this.reduceMotionQuery?.removeEventListener('change', this.onReduceMotionChange);
    }
    this.intersectionObserver?.disconnect();
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const rect = this.host.nativeElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, rect.width * dpr);
    canvas.height = Math.max(1, rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    this.ctx = canvas.getContext('2d');
    this.ctx?.scale(dpr, dpr);
    this.seedNodes(rect.width, rect.height);
  }

  private seedNodes(width: number, height: number): void {
    const preset = this.preset();
    const isMobile = width < 640;
    const count = isMobile ? preset.nodeCountMobile : preset.nodeCountDesktop;
    this.nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * preset.speed,
      vy: (Math.random() - 0.5) * preset.speed,
      r: 1.2 + Math.random() * 1.4,
      pulse: 0,
    }));
  }

  private recomputeColors(): void {
    const styles = getComputedStyle(document.documentElement);
    const ink = styles.getPropertyValue('--ink').trim() || '#0a1b33';
    const accent = styles.getPropertyValue('--accent').trim() || '#ec9900';
    const dark = this.theme.effective() === 'dark';
    this.colors = {
      dot: this.hexToRgba(ink, dark ? 0.55 : 0.32),
      line: this.hexToRgba(ink, dark ? 0.16 : 0.09),
      pulse: this.hexToRgba(accent, 0.85),
    };
  }

  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
      return;
    }
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  private restartLoop(): void {
    cancelAnimationFrame(this.rafId);
    if (!this.isVisible) return;
    if (this.reduceMotion) {
      this.drawFrame(false);
      return;
    }
    const loop = () => {
      this.drawFrame(true);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private drawFrame(advance: boolean): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = this.ctx;
    if (!canvas || !ctx) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const preset = this.preset();
    ctx.clearRect(0, 0, width, height);

    for (const node of this.nodes) {
      if (advance) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;
        if (node.pulse > 0) node.pulse = Math.max(0, node.pulse - 0.02);
        else if (Math.random() < preset.pulseChance) node.pulse = 1;

        if (preset.enableMouseInteraction) {
          const dx = node.x - this.mouse.x;
          const dy = node.y - this.mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 90) {
            const push = (90 - dist) / 90;
            node.x += (dx / (dist || 1)) * push * 0.6;
            node.y += (dy / (dist || 1)) * push * 0.6;
          }
        }
      }
    }

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < preset.linkDistance) {
          ctx.strokeStyle = this.colors.line;
          ctx.globalAlpha = 1 - dist / preset.linkDistance;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    for (const node of this.nodes) {
      ctx.beginPath();
      ctx.fillStyle = node.pulse > 0 ? this.colors.pulse : this.colors.dot;
      ctx.globalAlpha = node.pulse > 0 ? 0.5 + node.pulse * 0.5 : 1;
      ctx.arc(node.x, node.y, node.r + node.pulse * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
