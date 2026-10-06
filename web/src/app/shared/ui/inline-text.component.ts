import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

export type InlineTextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

/**
 * A single text node that becomes directly click-and-type editable when
 * `editable` is true (the visual editor's canvas) and renders as a plain
 * tag with zero extra behaviour otherwise (the public site) — so whatever
 * CSS the surrounding block already relies on (`.hero h1`, `.lede`, …)
 * keeps applying unchanged. `display: contents` on the host keeps this
 * component invisible to layout; it exists only to hold the
 * contenteditable wiring once instead of duplicating it in every block
 * that has editable text.
 *
 * Plain text only: paste is forced to plain text and Enter either commits
 * (single-line fields like headings) or inserts a line break (paragraphs),
 * matching the schema's plain-string prop types — never rich HTML.
 */
@Component({
  selector: 'ui-inline-text',
  standalone: true,
  host: { style: 'display: contents' },
  styles: `
    /* Only ever matches when editable (contenteditable is set), i.e. the
       editor canvas — the public site never sets this attribute. */
    [contenteditable='true'] {
      cursor: text;
      border-radius: 2px;
      outline: 1px dashed transparent;
      outline-offset: 2px;
      transition: outline-color 120ms ease, background-color 120ms ease;
    }
    [contenteditable='true']:hover {
      outline-color: color-mix(in srgb, var(--accent) 50%, transparent);
    }
    [contenteditable='true']:focus {
      outline: 2px solid var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
    }
  `,
  template: `
    @switch (tag) {
      @case ('h1') {
        <h1
          #el
          [class]="className"
          [attr.style]="styleAttr || null"
          [attr.contenteditable]="editable || null"
          (blur)="commit()"
          (keydown)="onKeydown($event)"
          (paste)="onPaste($event)"
        ></h1>
      }
      @case ('h2') {
        <h2
          #el
          [class]="className"
          [attr.style]="styleAttr || null"
          [attr.contenteditable]="editable || null"
          (blur)="commit()"
          (keydown)="onKeydown($event)"
          (paste)="onPaste($event)"
        ></h2>
      }
      @case ('h3') {
        <h3
          #el
          [class]="className"
          [attr.style]="styleAttr || null"
          [attr.contenteditable]="editable || null"
          (blur)="commit()"
          (keydown)="onKeydown($event)"
          (paste)="onPaste($event)"
        ></h3>
      }
      @case ('span') {
        <span
          #el
          [class]="className"
          [attr.style]="styleAttr || null"
          [attr.contenteditable]="editable || null"
          (blur)="commit()"
          (keydown)="onKeydown($event)"
          (paste)="onPaste($event)"
        ></span>
      }
      @default {
        <p
          #el
          [class]="className"
          [attr.style]="styleAttr || null"
          [attr.contenteditable]="editable || null"
          (blur)="commit()"
          (keydown)="onKeydown($event)"
          (paste)="onPaste($event)"
        ></p>
      }
    }
  `,
})
export class InlineTextComponent implements OnChanges, AfterViewInit {
  @Input() tag: InlineTextTag = 'p';
  @Input() value = '';
  @Input() editable = false;
  @Input() className = '';
  /** Matches this codebase's convention of inline `style="…"` for one-off
   * color/size tweaks rather than new utility classes. */
  @Input() styleAttr = '';
  /** Enter commits instead of inserting a newline — for one-line fields
   * (headings, button labels), never for multi-paragraph body text. */
  @Input() singleLine = false;
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('el') private elRef?: ElementRef<HTMLElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['tag']) {
      this.syncText();
    }
  }

  ngAfterViewInit(): void {
    this.syncText();
  }

  private syncText(): void {
    const el = this.elRef?.nativeElement;
    // Never clobber text mid-edit — only sync from the outside (e.g. undo)
    // when this field isn't the one currently focused.
    if (el && document.activeElement !== el && el.textContent !== this.value) {
      el.textContent = this.value;
    }
  }

  commit(): void {
    const el = this.elRef?.nativeElement;
    if (!el) return;
    const next = el.textContent ?? '';
    if (next !== this.value) this.valueChange.emit(next);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.singleLine && event.key === 'Enter') {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    const selection = document.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
  }
}
