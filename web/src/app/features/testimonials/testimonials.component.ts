import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';

export interface TestimonialEntry {
  quote: string;
  name: string;
  role: string;
  batch?: string;
  program?: string;
  highlight?: boolean;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective],
  templateUrl: './testimonials.component.html',
})
export class TestimonialsComponent implements OnInit {
  private seo = inject(SeoService);

  readonly testimonials: TestimonialEntry[] = [
    {
      quote:
        'The 48-Hour Bootcamp was the exact push we needed. In two days, we went from arguing over pitch decks to talking with five real customers and building an actual MVP demo.',
      name: 'Karthik Raja',
      role: 'Student Founder, Batch of 2025',
      program: '48-Hour Bootcamp',
      highlight: true,
    },
    {
      quote:
        'Idea Clinic gave us real, unsugared feedback on our business model. Leaving with a mentor introduction and concrete next steps saved us months of trial and error.',
      name: 'Ananya Ramesh',
      role: 'Co-Founder, Campus Venture',
      program: 'Idea Clinic',
    },
    {
      quote:
        'UNPITCHED brought real founders to campus who spoke openly about false starts and hard choices. It made entrepreneurship feel practical rather than distant.',
      name: 'Siddharth V.',
      role: 'MBA Candidate & E-Cell Member',
      program: 'UNPITCHED Series',
    },
    {
      quote:
        'Competing in the National Entrepreneurship Challenge taught us how to run campaigns, build momentum, and align a team toward a shared goal.',
      name: 'Pooja Sundaram',
      role: 'NEC Lead, PSGIM E-Cell',
      program: 'NEC 2026 Drive',
      highlight: true,
    },
    {
      quote:
        'Being a Campus Ambassador gave me leadership responsibility early on. I helped connect classroom ideas with E-Cell build weekends.',
      name: 'Manoj Kumar',
      role: 'Campus Ambassador',
      program: 'Ambassadors Network',
    },
    {
      quote:
        'PSGIM E-Cell creates spaces where students are encouraged to build out loud. It changes how you think about problems and execution.',
      name: 'Divya Bharathi',
      role: 'Alumna & Operator',
      program: 'Founders on Campus',
    },
  ];

  ngOnInit(): void {
    this.seo.set({
      title: 'Testimonials — PSGIM E-Cell',
      description: 'Stories, reviews, and reflections from student founders, participants, and builders at PSGIM E-Cell.',
      path: '/testimonials/',
    });
  }
}
