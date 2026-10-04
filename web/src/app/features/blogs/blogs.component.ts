import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { BLOG_ARTICLES, BLOG_SERIES_META } from '../../core/data/blog-series.data';
import { BlogArticle } from '../../core/models/models';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/motion/directives/reveal.directive';
import { StaggerDirective } from '../../core/motion/directives/stagger.directive';
import { BlogSeriesPathwayComponent } from './components/blog-series-pathway.component';
import { FeaturedBlogCardComponent } from './components/featured-blog-card.component';
import { BlogCardComponent } from './components/blog-card.component';

@Component({
  selector: 'app-blogs',
  standalone: true,
  imports: [
    CommonModule,
    RevealOnScrollDirective,
    StaggerDirective,
    BlogSeriesPathwayComponent,
    FeaturedBlogCardComponent,
    BlogCardComponent,
  ],
  templateUrl: './blogs.component.html',
  styles: [`
    .blogs-hero {
      padding-top: var(--s-8);
      padding-bottom: var(--s-6);
      border-bottom: 1px solid var(--rule);
    }
    .hero-eyebrow {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 4px 12px;
      border-radius: var(--r-pill);
      display: inline-block;
      margin-bottom: var(--s-3);
    }
    .hero-title {
      font-size: clamp(2.5rem, 1.8rem + 3.5vw, 4.5rem);
      font-weight: 800;
      line-height: var(--lh-tight);
      letter-spacing: var(--track-display);
      color: var(--ink);
      margin: 0 0 var(--s-4);
      white-space: pre-line;
    }
    .hero-subtitle {
      font-size: var(--t-lede);
      color: var(--ink-2);
      max-width: 680px;
      line-height: var(--lh-body);
      margin: 0;
    }

    .series-section {
      padding-top: var(--s-8);
      padding-bottom: var(--s-8);
    }
    .section-title-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: var(--s-6);
    }
    .kicker {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      text-transform: uppercase;
      display: block;
      margin-bottom: var(--s-1);
    }
    .sec-heading {
      font-size: var(--t-h2);
      font-weight: 800;
      color: var(--ink);
      margin: 0;
    }

    .articles-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--s-5);
    }

    @media (max-width: 960px) {
      .articles-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 640px) {
      .articles-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BlogsComponent implements OnInit {
  meta = BLOG_SERIES_META;
  articles = BLOG_ARTICLES;

  featuredArticle: BlogArticle = BLOG_ARTICLES[0];
  remainingArticles: BlogArticle[] = BLOG_ARTICLES.slice(1);

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Blogs & Insights | NEC E-Cell',
      description: 'Stories, frameworks and practical insights for student founders building what comes next — featuring the flagship 4-part series From Idea to Impact.',
      path: '/blogs/',
    });
  }
}
