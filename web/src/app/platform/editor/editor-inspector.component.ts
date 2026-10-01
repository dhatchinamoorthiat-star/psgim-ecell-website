import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BlockNode } from '../../shared/blocks/block.types';
import { ContentBlockTypeDef, PropSpec } from './editor.types';
import { PropFieldComponent } from './prop-field.component';

/**
 * The right-side contextual inspector (task §9). Every control here comes
 * directly from the selected block's `ContentBlockType.json_schema` — the
 * same schema the backend validates against — so the inspector can never
 * offer a field the server would reject, and never exposes raw CSS/HTML/JS
 * regardless of what a block type happens to declare. Content/Layout
 * grouping: scalar/text/image props render under "Content", `int`/`enum`
 * props (columns, alignment, variants) render under "Layout" — the same
 * schema, just two headings, since Phase 2A's schema doesn't yet tag a
 * prop's category explicitly.
 */
@Component({
  selector: 'app-editor-inspector',
  standalone: true,
  imports: [CommonModule, PropFieldComponent],
  template: `
    @if (!block) {
      <div class="be-empty">
        <p class="pf-muted">Select a block to edit its content.</p>
      </div>
    } @else if (blockType) {
      <div class="be-inspector">
        <h2 class="pf-nav-label">{{ blockType.label }}</h2>

        <section class="be-inspector-section">
          <h3>Content</h3>
          @for (entry of contentProps(); track entry[0]) {
            <ng-container
              [ngTemplateOutlet]="propRow"
              [ngTemplateOutletContext]="{ $implicit: entry }"
            />
          }
        </section>

        @if (layoutProps().length) {
          <section class="be-inspector-section">
            <h3>Layout</h3>
            @for (entry of layoutProps(); track entry[0]) {
              <ng-container
                [ngTemplateOutlet]="propRow"
                [ngTemplateOutletContext]="{ $implicit: entry }"
              />
            }
          </section>
        }

        <ng-template #propRow let-entry>
          @if (entry[1].type === 'list') {
            <div class="be-list-field">
              <label>{{ entry[0] }}</label>
              @if (entry[1].item_type === 'object') {
                @for (item of listValue(entry[0]); track $index) {
                  <div class="be-list-item pf-card">
                    @for (
                      sub of objectEntries(entry[1].item_schema?.properties ?? {});
                      track sub[0]
                    ) {
                      <app-prop-field
                        [name]="sub[0]"
                        [spec]="sub[1]"
                        [value]="item[sub[0]]"
                        (valueChange)="updateListItemField(entry[0], $index, sub[0], $event)"
                        (pickMedia)="
                          pickMedia.emit({ prop: entry[0], index: $index, field: sub[0] })
                        "
                      />
                    }
                    <button
                      type="button"
                      class="pf-btn pf-btn-sm pf-btn-danger"
                      (click)="removeListItem(entry[0], $index)"
                    >
                      Remove
                    </button>
                  </div>
                }
                <button
                  type="button"
                  class="pf-btn pf-btn-sm"
                  (click)="addObjectListItem(entry[0], entry[1])"
                >
                  + Add item
                </button>
              } @else {
                @for (item of listValue(entry[0]); track $index) {
                  <div class="be-list-item-row">
                    <input
                      class="pf-input"
                      type="text"
                      [value]="item ?? ''"
                      (input)="updateListScalar(entry[0], $index, $event)"
                    />
                    <button
                      type="button"
                      class="be-icon-btn be-icon-btn-danger"
                      (click)="removeListItem(entry[0], $index)"
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                }
                <button
                  type="button"
                  class="pf-btn pf-btn-sm"
                  (click)="addScalarListItem(entry[0])"
                >
                  + Add
                </button>
              }
            </div>
          } @else if (entry[1].type === 'object') {
            <div class="be-object-field pf-card">
              <label>{{ entry[0] }}</label>
              @for (sub of objectEntries(entry[1].properties ?? {}); track sub[0]) {
                <app-prop-field
                  [name]="sub[0]"
                  [spec]="sub[1]"
                  [value]="objectValue(entry[0])[sub[0]]"
                  (valueChange)="updateObjectField(entry[0], sub[0], $event)"
                />
              }
            </div>
          } @else {
            <app-prop-field
              [name]="entry[0]"
              [spec]="entry[1]"
              [value]="block.props[entry[0]]"
              (valueChange)="updateProp(entry[0], $event)"
              (pickMedia)="pickMedia.emit({ prop: entry[0] })"
            />
          }
        </ng-template>
      </div>
    }
  `,
})
export class EditorInspectorComponent {
  @Input() block: BlockNode | null = null;
  @Input() blockType: ContentBlockTypeDef | null = null;

  @Output() propsChange = new EventEmitter<Record<string, unknown>>();
  @Output() pickMedia = new EventEmitter<{ prop: string; index?: number; field?: string }>();

  private static readonly LAYOUT_PROP_NAMES = new Set([
    'columns',
    'alignment',
    'sort',
    'limit',
    'ratio',
  ]);

  objectEntries(props: Record<string, PropSpec>): [string, PropSpec][] {
    return Object.entries(props);
  }

  contentProps(): [string, PropSpec][] {
    if (!this.blockType) return [];
    return Object.entries(this.blockType.json_schema.props).filter(
      ([name]) => !EditorInspectorComponent.LAYOUT_PROP_NAMES.has(name),
    );
  }

  layoutProps(): [string, PropSpec][] {
    if (!this.blockType) return [];
    return Object.entries(this.blockType.json_schema.props).filter(([name]) =>
      EditorInspectorComponent.LAYOUT_PROP_NAMES.has(name),
    );
  }

  listValue(name: string): any[] {
    const v = this.block?.props[name];
    return Array.isArray(v) ? v : [];
  }

  objectValue(name: string): Record<string, unknown> {
    const v = this.block?.props[name];
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }

  updateProp(name: string, value: unknown): void {
    this.propsChange.emit({ [name]: value });
  }

  updateObjectField(name: string, field: string, value: unknown): void {
    this.propsChange.emit({ [name]: { ...this.objectValue(name), [field]: value } });
  }

  updateListScalar(name: string, index: number, e: Event): void {
    const list = [...this.listValue(name)];
    list[index] = (e.target as HTMLInputElement).value;
    this.propsChange.emit({ [name]: list });
  }

  updateListItemField(name: string, index: number, field: string, value: unknown): void {
    const list = [...this.listValue(name)];
    list[index] = { ...list[index], [field]: value };
    this.propsChange.emit({ [name]: list });
  }

  addScalarListItem(name: string): void {
    this.propsChange.emit({ [name]: [...this.listValue(name), ''] });
  }

  addObjectListItem(name: string, spec: PropSpec): void {
    const blank: Record<string, unknown> = {};
    for (const [field, fieldSpec] of Object.entries(spec.item_schema?.properties ?? {})) {
      blank[field] = fieldSpec.type === 'bool' ? false : fieldSpec.type === 'int' ? null : '';
    }
    this.propsChange.emit({ [name]: [...this.listValue(name), blank] });
  }

  removeListItem(name: string, index: number): void {
    const list = [...this.listValue(name)];
    list.splice(index, 1);
    this.propsChange.emit({ [name]: list });
  }
}
