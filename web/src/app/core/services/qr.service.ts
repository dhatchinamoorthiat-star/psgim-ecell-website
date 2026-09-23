import { Injectable } from '@angular/core';

declare global {
  interface Window {
    qrcode: any;
  }
}

const INK = '#0a1b33';
const PAPER = '#ffffff';
const QUIET = 4;
const LOGO_RATIO = 0.22;

export interface QrRenderResult {
  ok: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class QrService {
  private logo: HTMLImageElement | null = null;
  private logoReady = false;
  /** Fired once, when the mark image finishes loading. render() draws
   *  synchronously against whatever logoReady is *at that instant* — on a
   *  cold load the first call can land before the image arrives, and
   *  without this nothing ever asks for a second render, so the QR is
   *  stuck without its mark for the rest of the session. Callers should
   *  re-render once this fires. */
  private onLogoReady: (() => void) | null = null;

  private ensureLogo(): void {
    if (this.logo) return;
    this.logo = new Image();
    this.logo.onload = () => {
      this.logoReady = true;
      this.onLogoReady?.();
    };
    this.logo.src = '/logo@2x.png';
  }

  /** Registers the one callback to run when the mark becomes available.
   *  Idempotent against repeat calls from the same component instance. */
  whenLogoReady(cb: () => void): void {
    this.onLogoReady = cb;
  }

  supportsCopy(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      (navigator as any).clipboard &&
      (window as any).ClipboardItem &&
      window.isSecureContext
    );
  }

  render(canvas: HTMLCanvasElement, value: string, targetSize = 1024, withLogo = true): QrRenderResult {
    const trimmed = value.trim();
    if (!trimmed) {
      return { ok: false, message: '' };
    }
    if (typeof window === 'undefined' || !window.qrcode) {
      return { ok: false, message: 'QR engine still loading — try again in a moment.' };
    }
    this.ensureLogo();

    if (window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs['UTF-8']) {
      window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
    }

    let qr: any;
    try {
      qr = window.qrcode(0, 'H');
      qr.addData(trimmed);
      qr.make();
    } catch {
      return { ok: false, message: 'That is too long to encode. Shorten the text, or link to a page that holds it.' };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return { ok: false, message: 'Canvas not available.' };

    const count = qr.getModuleCount();
    const total = count + QUIET * 2;
    const scale = Math.max(1, Math.floor(targetSize / total));
    const side = scale * total;

    canvas.width = side;
    canvas.height = side;

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, side, side);

    ctx.fillStyle = INK;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale);
        }
      }
    }

    if (withLogo && this.logoReady && this.logo) {
      const box = Math.round(count * LOGO_RATIO) * scale;
      const plate = box + scale * 2;
      const px = Math.round((side - plate) / 2);
      const py = Math.round((side - plate) / 2);

      ctx.fillStyle = PAPER;
      this.roundedRect(ctx, px, py, plate, plate, Math.round(scale * 1.5));
      ctx.fill();

      const ratio = this.logo.naturalWidth / this.logo.naturalHeight || 1;
      let h = box;
      let w = Math.round(h * ratio);
      if (w > box) {
        w = box;
        h = Math.round(w / ratio);
      }
      ctx.drawImage(this.logo, Math.round((side - w) / 2), Math.round((side - h) / 2), w, h);
    }

    canvas.setAttribute('aria-label', 'QR code for ' + (trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed));

    return {
      ok: true,
      message: `${side} × ${side} px · ${count} × ${count} modules · error correction H${
        withLogo && !this.logoReady ? ' · mark still loading' : ''
      }`,
    };
  }

  filename(value: string): string {
    let base = value;
    try {
      if (/^https?:\/\//i.test(value)) {
        const u = new URL(value);
        base = u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '').replace(/\//g, '-');
      }
    } catch {
      /* not a URL */
    }
    base = base
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 48)
      .replace(/^-+|-+$/g, '');
    return 'ecell-qr-' + (base || 'code');
  }

  private roundedRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
}
