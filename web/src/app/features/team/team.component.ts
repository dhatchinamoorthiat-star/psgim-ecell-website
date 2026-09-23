import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { faculty, patron, roles, rolesNote, necTeam } from '../../core/data/team.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective],
  templateUrl: './team.component.html',
})
export class TeamComponent implements OnInit {
  faculty = faculty;
  patron = patron;
  roles = roles;
  rolesNote = rolesNote;
  necTeam = necTeam;
  initials = initials;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Team',
      description: 'Faculty coordinators, the core team and the NEC campus team behind PSGIM E-Cell.',
      path: '/team/',
    });
  }
}
