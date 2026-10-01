import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { initiatives, stages, whatWeCreate, toInitiativeRows } from '../../core/data/initiatives.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { EditorialRowListComponent } from '../../shared/ui/editorial-row-list/editorial-row-list.component';

@Component({
  selector: 'app-initiatives',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective, EditorialRowListComponent],
  templateUrl: './initiatives.component.html',
})
export class InitiativesComponent implements OnInit {
  initiatives = initiatives;
  stages = stages;
  whatWeCreate = whatWeCreate;
  initiativeRows = toInitiativeRows('anchor');

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Initiatives',
      description: 'Seven programmes that move a PSGIM student from an idea to a national stage.',
      path: '/initiatives/',
    });
  }

  stageFor(id: string) {
    return this.stages.find((s) => s.id === id);
  }
}
