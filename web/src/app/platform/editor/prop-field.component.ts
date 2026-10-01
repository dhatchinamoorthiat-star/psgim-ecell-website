import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PropSpec } from './editor.types';
import { ImageProp } from '../../shared/blocks/block.types';

/**
 * Renders exactly one scalar/image prop control from its `ContentBlockType`
 * schema (`string`/`url`/`int`/`bool`/`image`) — never a raw-HTML/CSS/JS
 * field, only what the schema declares (task §9: "Never provide raw CSS,
 * raw HTML, raw JS"). `object`/`list` props are composed by
 * `EditorInspectorComponent` out of repeated instances of this component,
 * not handled here.
 */
@Component({
  selector: 'app-prop-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pf-field be-prop-field">
      <label [for]="fieldId">{{ label }}{{ spec.required ? ' *' : '' }}</label>
      @switch (spec.type) {
        @case ('bool') {
          <label class="pf-check">
            <input
              [id]="fieldId"
              type="checkbox"
              [checked]="asBool()"
              (change)="emitBool($event)"
            />
            {{ label }}
          </label>
        }
        @case ('int') {
          <input
            [id]="fieldId"
            class="pf-input"
            type="number"
            [value]="value ?? ''"
            (input)="emitInt($event)"
          />
        }
        @case ('url') {
          <input
            [id]="fieldId"
            class="pf-input"
            type="text"
            [value]="value ?? ''"
            (input)="emitString($event)"
            placeholder="/page/ or https://…"
          />
        }
        @case ('image') {
          <div class="be-image-field">
            <div class="be-image-field-row">
              <select
                class="pf-select"
                [value]="imageValue()?.source ?? 'external'"
                (change)="setImageSource($event)"
              >
                <option value="external">External URL</option>
                <option value="media">Media library</option>
              </select>
              @if ((imageValue()?.source ?? 'external') === 'external') {
                <input
                  class="pf-input"
                  type="text"
                  placeholder="https://…"
                  [value]="imageValue()?.url ?? ''"
                  (input)="setImageField('url', $event)"
                />
              } @else {
                <button type="button" class="pf-btn pf-btn-sm" (click)="pickMedia.emit()">
                  {{ imageValue()?.asset_id ? 'Change media…' : 'Choose media…' }}
                </button>
              }
            </div>
            <input
              class="pf-input"
              type="text"
              placeholder="Alt text (required before publish)"
              [value]="imageValue()?.alt ?? ''"
              (input)="setImageField('alt', $event)"
            />
          </div>
        }
        @default {
          @if (multiline()) {
            <textarea
              [id]="fieldId"
              class="pf-textarea"
              rows="4"
              [value]="value ?? ''"
              [attr.maxlength]="spec.max_length ?? null"
              (input)="emitString($event)"
            ></textarea>
          } @else if (spec.enum) {
            <select
              [id]="fieldId"
              class="pf-select"
              [value]="value ?? ''"
              (change)="emitString($event)"
            >
              @for (opt of spec.enum; track opt) {
                <option [value]="opt">{{ opt }}</option>
              }
            </select>
          } @else {
            <input
              [id]="fieldId"
              class="pf-input"
              type="text"
              [value]="value ?? ''"
              [attr.maxlength]="spec.max_length ?? null"
              (input)="emitString($event)"
            />
          }
        }
      }
    </div>
  `,
})
export class PropFieldComponent {
  @Input({ required: true }) name = '';
  @Input({ required: true }) spec!: PropSpec;
  @Input() value: unknown;
  @Output() valueChange = new EventEmitter<unknown>();
  @Output() pickMedia = new EventEmitter<void>();

  get fieldId(): string {
    return `pf-${this.name}`;
  }
  get label(): string {
    return this.name.replace(/_/g, ' ');
  }

  multiline(): boolean {
    return !!this.spec.max_length && this.spec.max_length > 200;
  }

  imageValue(): ImageProp | null {
    return (this.value as ImageProp | null) ?? null;
  }

  asBool(): boolean {
    return this.value === true;
  }

  emitBool(e: Event): void {
    this.valueChange.emit((e.target as HTMLInputElement).checked);
  }

  emitInt(e: Event): void {
    const raw = (e.target as HTMLInputElement).value;
    this.valueChange.emit(raw === '' ? null : Number(raw));
  }

  emitString(e: Event): void {
    this.valueChange.emit(
      (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value,
    );
  }

  setImageSource(e: Event): void {
    const source = (e.target as HTMLSelectElement).value as 'external' | 'media';
    const current = this.imageValue();
    this.valueChange.emit({ source, alt: current?.alt ?? '' });
  }

  setImageField(field: 'url' | 'alt', e: Event): void {
    const current = this.imageValue() ?? { source: 'external' as const };
    this.valueChange.emit({ ...current, [field]: (e.target as HTMLInputElement).value });
  }
}
