import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { QrService } from '../../core/services/qr.service';

@Component({
  selector: 'ui-qr-generator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="qr-tool">
      <div class="qr-controls">
        <label for="qrText" class="chip" style="cursor:default">Content</label>
        <textarea
          id="qrText"
          class="qr-field"
          rows="3"
          [value]="value()"
          (input)="onInput($event)"
          placeholder="Paste a URL or type text…"
        ></textarea>
        <div class="hero-actions" style="margin-top: var(--s-3)">
          <button type="button" class="btn btn-ghost" (click)="setValue(preset)" *ngIf="preset">
            Use {{ presetLabel }}
          </button>
        </div>
      </div>
      <div class="qr-canvas-wrap">
        <canvas #qrCanvas [hidden]="!ok()"></canvas>
        <p *ngIf="!ok()" class="pending-flag">No code yet — enter content to generate one</p>
        <p *ngIf="ok()" style="font-size: var(--t-xs); color: var(--ink-3)">{{ message() }}</p>
        <div class="hero-actions">
          <button type="button" class="btn btn-primary" (click)="download()" [disabled]="!ok()">Download PNG</button>
          <button type="button" class="btn btn-ghost" (click)="copy()" [disabled]="!ok() || !canCopy">
            {{ copyLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class QrGeneratorComponent implements AfterViewInit, OnDestroy {
  @Input() preset = '';
  @Input() presetLabel = 'preset link';
  @Input() prefill = '';

  @ViewChild('qrCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  private qr = inject(QrService);
  private platformId = inject(PLATFORM_ID);
  private debounceHandle: ReturnType<typeof setTimeout> | undefined;

  readonly value = signal('');
  readonly ok = signal(false);
  readonly message = signal('');
  readonly copyLabel = signal('Copy image');
  canCopy = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.canCopy = this.qr.supportsCopy();
    // The mark image loads async; if a code was already drawn before it
    // arrived (a fast typer, or a slow first fetch), redraw once so the
    // mark actually appears instead of being silently missing forever.
    this.qr.whenLogoReady(() => {
      if (this.value()) this.renderNow();
    });
    if (this.prefill) {
      this.setValue(this.prefill);
    }
  }

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value.set(target.value);
    clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => this.renderNow(), 180);
  }

  setValue(v: string): void {
    this.value.set(v);
    this.renderNow();
  }

  private renderNow(): void {
    if (!this.canvasRef) return;
    const result = this.qr.render(this.canvasRef.nativeElement, this.value());
    this.ok.set(result.ok);
    this.message.set(result.message);
  }

  download(): void {
    if (!this.canvasRef || !this.ok()) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.qr.filename(this.value()) + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, 'image/png');
  }

  copy(): void {
    if (!this.canvasRef || !this.ok() || !this.canCopy) return;
    const canvas = this.canvasRef.nativeElement;
    canvas.toBlob((blob) => {
      if (!blob) return;
      (navigator as any).clipboard
        .write([new (window as any).ClipboardItem({ 'image/png': blob })])
        .then(() => {
          this.copyLabel.set('Copied');
          setTimeout(() => this.copyLabel.set('Copy image'), 1600);
        })
        .catch(() => this.message.set('Copying failed — use Download instead.'));
    }, 'image/png');
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceHandle);
  }
}
