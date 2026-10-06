import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { initials } from '../../../core/utils/initials';
import { ImageProp } from '../block.types';
import { BlockImageComponent } from './block-image.component';
import { BlockEditorHost } from '../block-editor-host';
import { InlineTextComponent } from '../../ui/inline-text.component';

interface TeamMember {
  name?: string;
  role?: string;
  org?: string;
  remit?: string;
  photo?: ImageProp | null;
}

interface TeamGridProps {
  heading?: string;
  members: TeamMember[];
}

/** Reuses `.avatar-initials` verbatim (`features/team/team.component.html`)
 * — the site has never rendered a real photo for anyone, only initials;
 * this stays consistent rather than introducing a photo path with nothing
 * behind it. A member with no `name` yet (a defined role, unfilled —
 * `team.data.ts`'s TeamRole) shows the role itself instead of blank
 * initials, never an invented placeholder name. Delegates photo rendering
 * to the shared `BlockImageComponent` (handles resolved `source: "media"`
 * as well as `source: "external"`).
 *
 * Heading and each member's name/role/org/remit are click-and-type
 * editable on the canvas via `ui-inline-text`. The `<h3>` falls back to
 * showing `role` when `name` is unfilled, so editing it edits whichever of
 * the two is actually displayed. Members are tracked by index rather than
 * `name || role` so editing that text doesn't tear the card down mid-edit. */
@Component({
  selector: 'block-team-grid',
  standalone: true,
  imports: [CommonModule, BlockImageComponent, InlineTextComponent],
  template: `
    <section class="section wrap">
      @if (props.heading || editorHost) {
        <div class="section-heading">
          <ui-inline-text
            tag="h2"
            [value]="props.heading || ''"
            [editable]="!!editorHost"
            [singleLine]="true"
            (valueChange)="editorHost?.updateProp?.(blockId, 'heading', $event)"
          />
        </div>
      }
      <div class="grid grid-3" style="margin-top: var(--s-6)">
        @for (m of props.members; track $index) {
          <div class="card team-member">
            @if (m.photo?.url) {
              <block-image
                [image]="{ ...m.photo!, alt: m.photo!.alt || m.name || '' }"
                imgClass="avatar-photo"
              />
            } @else {
              <div class="avatar-initials">{{ m.name ? initialsOf(m.name) : '—' }}</div>
            }
            <ui-inline-text
              tag="h3"
              [value]="m.name || m.role || ''"
              [editable]="!!editorHost"
              [singleLine]="true"
              (valueChange)="updateMember($index, m.name ? 'name' : 'role', $event)"
            />
            @if ((m.name && m.role) || (editorHost && m.name)) {
              <ui-inline-text
                tag="p"
                styleAttr="color: var(--ink-2)"
                [value]="m.role || ''"
                [editable]="!!editorHost"
                [singleLine]="true"
                (valueChange)="updateMember($index, 'role', $event)"
              />
            }
            @if (m.org || editorHost) {
              <ui-inline-text
                tag="p"
                styleAttr="color: var(--ink-3); font-size: var(--t-xs)"
                [value]="m.org || ''"
                [editable]="!!editorHost"
                [singleLine]="true"
                (valueChange)="updateMember($index, 'org', $event)"
              />
            }
            @if (m.remit || editorHost) {
              <ui-inline-text
                tag="p"
                styleAttr="color: var(--ink-3); font-size: var(--t-xs)"
                [value]="m.remit || ''"
                [editable]="!!editorHost"
                (valueChange)="updateMember($index, 'remit', $event)"
              />
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class BlockTeamGridComponent {
  @Input({ required: true }) props!: TeamGridProps;
  @Input() blockId = '';
  @Input() editorHost: BlockEditorHost | null = null;
  initialsOf = initials;

  updateMember(index: number, key: keyof TeamMember, value: string): void {
    const members = this.props.members.map((m, i) => (i === index ? { ...m, [key]: value } : m));
    this.editorHost?.updateProp?.(this.blockId, 'members', members);
  }
}
