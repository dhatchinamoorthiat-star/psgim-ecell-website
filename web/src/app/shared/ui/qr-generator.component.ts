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

export interface QrPreset {
  label: string;
  value: string;
}

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

        <div class="qr-options" *ngIf="advanced">
          <label class="qr-option">
            <span class="chip" style="cursor:default">Export size</span>
            <select class="qr-select" [value]="exportSize()" (change)="onExportSizeChange($event)">
              <option value="512">512 px — screen, WhatsApp</option>
              <option value="1024">1024 px — slides, posters</option>
              <option value="2048">2048 px — large print</option>
            </select>
          </label>
          <label class="qr-option">
            <span class="chip" style="cursor:default">Centre mark</span>
            <select class="qr-select" [value]="withLogo() ? 'on' : 'off'" (change)="onLogoToggle($event)">
              <option value="on">With E-Cell mark</option>
              <option value="off">Plain code</option>
            </select>
          </label>
        </div>

        <ng-container *ngIf="presets.length; else singlePreset">
          <div class="qr-options" *ngIf="presets.length">
            <span class="chip" style="cursor:default">Quick fill</span>
          </div>
          <div class="hero-actions" style="margin-top: var(--s-2)">
            <button type="button" class="chip" *ngFor="let p of presets" (click)="setValue(p.value)">
              {{ p.label }}
            </button>
          </div>
        </ng-container>
        <ng-template #singlePreset>
          <div class="hero-actions" style="margin-top: var(--s-3)">
            <button type="button" class="btn btn-ghost" (click)="setValue(preset)" *ngIf="preset">
              Use {{ presetLabel }}
            </button>
          </div>
        </ng-template>

        <p class="qr-hint" *ngIf="advanced">
          Codes use the highest error-correction level, so the mark in the middle does not stop them scanning.
          <br />
          <strong>Always test the finished code with a phone before it goes to print.</strong>
        </p>
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
  /** Multiple quick-fill buttons (e.g. Website / Events / NEC 2026 / Join
   *  the Cell). Takes over from the single preset button above when set. */
  @Input() presets: QrPreset[] = [];
  /** Shows the export-size and centre-mark controls — off by default so
   *  smaller embeds (e.g. the NEC page's inline generator) stay compact. */
  @Input() advanced = false;

  @ViewChild('qrCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  private qr = inject(QrService);
  private platformId = inject(PLATFORM_ID);
  private debounceHandle: ReturnType<typeof setTimeout> | undefined;

  readonly value = signal('');
  readonly ok = signal(false);
  readonly message = signal('');
  readonly copyLabel = signal('Copy image');
  readonly exportSize = signal(1024);
  readonly withLogo = signal(true);
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

  onExportSizeChange(event: Event): void {
    this.exportSize.set(Number((event.target as HTMLSelectElement).value));
    this.renderNow();
  }

  onLogoToggle(event: Event): void {
    this.withLogo.set((event.target as HTMLSelectElement).value === 'on');
    this.renderNow();
  }

  setValue(v: string): void {
    this.value.set(v);
    this.renderNow();
  }

  private renderNow(): void {
    if (!this.canvasRef) return;
    const result = this.qr.render(this.canvasRef.nativeElement, this.value(), this.exportSize(), this.withLogo());
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
