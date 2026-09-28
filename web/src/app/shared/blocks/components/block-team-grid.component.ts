import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { initials } from '../../../core/utils/initials';
import { ImageProp } from '../block.types';
import { BlockImageComponent } from './block-image.component';

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
 * as well as `source: "external"`). */
@Component({
  selector: 'block-team-grid',
  standalone: true,
  imports: [CommonModule, BlockImageComponent],
  template: `
    <section class="section wrap">
      @if (props.heading) {
        <div class="section-heading">
          <h2>{{ props.heading }}</h2>
        </div>
      }
      <div class="grid grid-3" style="margin-top: var(--s-6)">
        @for (m of props.members; track m.name || m.role || $index) {
          <div class="card team-member">
            @if (m.photo?.url) {
              <block-image
                [image]="{ ...m.photo!, alt: m.photo!.alt || m.name || '' }"
                imgClass="avatar-photo"
              />
            } @else {
              <div class="avatar-initials">{{ m.name ? initialsOf(m.name) : '—' }}</div>
            }
            <h3>{{ m.name || m.role }}</h3>
            @if (m.name && m.role) {
              <p style="color: var(--ink-2)">{{ m.role }}</p>
            }
            @if (m.org) {
              <p style="color: var(--ink-3); font-size: var(--t-xs)">{{ m.org }}</p>
            }
            @if (m.remit) {
              <p style="color: var(--ink-3); font-size: var(--t-xs)">{{ m.remit }}</p>
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
  initialsOf = initials;
}
