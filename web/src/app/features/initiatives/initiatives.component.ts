import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { stages, whatWeCreate, toInitiativeDisclosureRows } from '../../core/data/initiatives.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { EditorialRowListComponent } from '../../shared/ui/editorial-row-list/editorial-row-list.component';

@Component({
  selector: 'app-initiatives',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective, EditorialRowListComponent],
  templateUrl: './initiatives.component.html',
})
export class InitiativesComponent implements OnInit {
  stages = stages;
  whatWeCreate = whatWeCreate;
  initiativeRows = toInitiativeDisclosureRows();
  /** Deep links from Home/About arrive as `/initiatives/#<id>`. */
  openRow = toSignal(inject(ActivatedRoute).fragment, { initialValue: null });

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Initiatives',
      description: 'Seven programmes that move a PSGIM student from an idea to a national stage.',
      path: '/initiatives/',
    });
  }
}
