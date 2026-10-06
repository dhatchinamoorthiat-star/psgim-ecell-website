import { Injectable } from '@angular/core';
import { faculty, necTeam, patron, roles, rolesNote, verticalEcosystems } from '../data/team.data';
import { FacultyMember, NecTeam, Patron, TeamRole, VerticalEcosystem } from '../models/models';

/**
 * Data access for the team ecosystem. Currently wraps the static dataset in
 * `team.data.ts`; the shape is API-ready should verticals and people move to
 * the Django backend later.
 *
 * There are deliberately no `getVerticalHead` / `getMembersForVertical` /
 * `getMember` accessors any more. They existed to serve invented people, and
 * every caller of them rendered fabricated content. When a real
 * member-to-vertical mapping exists, add it then — against real data.
 */
@Injectable({ providedIn: 'root' })
export class TeamService {
  /** The institute's patron. */
  getPatron(): Patron {
    return patron;
  }

  /** Faculty coordinators — the cell's governance layer, not a student exec. */
  getFaculty(): FacultyMember[] {
    return faculty;
  }

  /** Core committee remits. `name: null` means the role is genuinely open. */
  getCoreRoles(): TeamRole[] {
    return roles;
  }

  getCoreRolesNote(): string {
    return rolesNote;
  }

  /** The named students on the current NEC drive. */
  getPeople(): NecTeam {
    return necTeam;
  }

  /** Every named person on the roll, lead first, as a flat index. */
  getPeopleIndex(): { name: string; role?: string }[] {
    return [necTeam.lead, ...necTeam.members];
  }

  getVerticals(): VerticalEcosystem[] {
    return verticalEcosystems.filter((v) => v.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  getVertical(slug: string): VerticalEcosystem | undefined {
    return verticalEcosystems.find((v) => v.slug === slug && v.isActive);
  }

  /** Neighbouring verticals for the in-page switcher. */
  getOtherVerticals(slug: string): VerticalEcosystem[] {
    return this.getVerticals().filter((v) => v.slug !== slug);
  }
}
