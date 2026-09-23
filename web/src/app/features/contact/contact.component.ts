import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { site } from '../../core/data/site.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective, AwaitingPanelComponent],
  templateUrl: './contact.component.html',
})
export class ContactComponent implements OnInit {
  site = site;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Contact',
      description: 'Get in touch with PSGIM E-Cell.',
      path: '/contact/',
    });
  }
}
