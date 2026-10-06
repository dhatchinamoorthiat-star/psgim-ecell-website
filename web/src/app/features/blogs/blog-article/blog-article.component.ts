import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, Input, OnChanges, OnInit, PLATFORM_ID, SimpleChanges, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BLOG_ARTICLES, getArticleBySlug } from '../../../core/data/blog-series.data';
import { BlogArticle } from '../../../core/models/models';
import { SeoService } from '../../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../../core/motion/directives/reveal.directive';
import { BlogArticleHeroComponent } from '../components/blog-article-hero.component';
import { BlogReadingProgressComponent } from '../components/blog-reading-progress.component';
import { BlogTableOfContentsComponent } from '../components/blog-table-of-contents.component';
import { BlogCaseStudyComponent } from '../components/blog-case-study.component';
import { BlogStudentWorksheetComponent } from '../components/blog-student-worksheet.component';
import { BlogInfographicComponent } from '../components/blog-infographic.component';
import { BlogSourcesComponent } from '../components/blog-sources.component';
import { BlogShareBarComponent } from '../components/blog-share-bar.component';
import { BlogNextArticleComponent } from '../components/blog-next-article.component';

@Component({
  selector: 'app-blog-article',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RevealOnScrollDirective,
    BlogArticleHeroComponent,
    BlogReadingProgressComponent,
    BlogTableOfContentsComponent,
    BlogCaseStudyComponent,
    BlogStudentWorksheetComponent,
    BlogInfographicComponent,
    BlogSourcesComponent,
    BlogShareBarComponent,
    BlogNextArticleComponent,
  ],
  template: `
    @if (article) {
      <app-blog-reading-progress [activePart]="article.seriesPart" [totalParts]="article.totalParts" />

      <article class="article-page">
        <!-- Hero Section -->
        <app-blog-article-hero [article]="article" />

        <div class="article-container wrap">
          <!-- Desktop TOC Sidebar -->
          <aside class="toc-sidebar">
            <app-blog-table-of-contents [sections]="article.sections" />
          </aside>

          <!-- Main Reading Content -->
          <main class="reading-column">
            <!-- Share & Metadata Bar -->
            <div class="top-share-bar">
              <span class="series-nav-link">
                <a routerLink="/blogs">← Back to Insights</a>
              </span>
              <app-blog-share-bar [title]="article.title" [slug]="article.slug" />
            </div>

            <!-- Intro Paragraphs -->
            <div class="article-intro" revealOnScroll>
              @for (p of article.introParagraphs; track $index) {
                <p class="lede-p" [class.first-dropcap]="$index === 0">{{ p }}</p>
              }
            </div>

            <!-- Article Sections -->
            @for (sec of article.sections; track sec.id) {
              <section [id]="sec.id" class="article-section" revealOnScroll>
                <h2 class="section-heading">{{ sec.heading }}</h2>

                @if (sec.subheading) {
                  <h3 class="section-subheading">{{ sec.subheading }}</h3>
                }

                @for (p of sec.paragraphs; track $index) {
                  <p class="body-p">{{ p }}</p>
                }

                @if (sec.listItems && sec.listItems.length > 0) {
                  <ul class="body-list">
                    @for (item of sec.listItems; track item) {
                      <li>{{ item }}</li>
                    }
                  </ul>
                }

                @if (sec.pullQuote) {
                  <blockquote class="editorial-pullquote">
                    <p>"{{ sec.pullQuote.quote }}"</p>
                    @if (sec.pullQuote.author) {
                      <cite>— {{ sec.pullQuote.author }}</cite>
                    }
                  </blockquote>
                }

                @if (sec.callout) {
                  <div class="editorial-callout">
                    @if (sec.callout.title) {
                      <h4 class="callout-title">💡 {{ sec.callout.title }}</h4>
                    }
                    <p>{{ sec.callout.text }}</p>
                  </div>
                }

                @if (sec.caseStudy) {
                  <app-blog-case-study [caseStudy]="sec.caseStudy" />
                }

                @if (sec.infographic) {
                  <app-blog-infographic [data]="sec.infographic" />
                }
              </section>
            }

            <!-- Actionable Student Worksheet -->
            <app-blog-student-worksheet
              [heading]="article.studentExercise.heading"
              [subtitle]="article.studentExercise.subtitle"
              [items]="article.studentExercise.items"
              [outcome]="article.studentExercise.outcome"
              revealOnScroll
            />

            <!-- Sources & Further Reading -->
            @if (article.sources && article.sources.length > 0) {
              <app-blog-sources [sources]="article.sources" revealOnScroll />
            }

            <!-- Bottom Share Bar -->
            <div class="bottom-share-row" revealOnScroll>
              <div class="series-tagline-footer">
                <span>"Every business starts as a problem someone refused to ignore."</span>
              </div>
              <app-blog-share-bar [title]="article.title" [slug]="article.slug" />
            </div>

            <!-- Next Article Teaser -->
            @if (article.nextArticle) {
              <app-blog-next-article
                [nextPart]="article.nextArticle"
                [isLoop]="article.seriesPart === article.totalParts"
                revealOnScroll
              />
            }
          </main>
        </div>
      </article>
    } @else {
      <div class="not-found-wrap wrap">
        <h1>Article Not Found</h1>
        <p>The requested blog article could not be found.</p>
        <a routerLink="/blogs" class="back-btn">← Back to Blogs</a>
      </div>
    }
  `,
  styles: [`
    .article-page {
      padding-bottom: var(--s-9);
    }
    .article-container {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: var(--s-7);
      align-items: start;
    }
    .toc-sidebar {
      position: sticky;
      top: calc(var(--header-h) + var(--s-4));
    }
    .reading-column {
      max-width: 760px;
      margin: 0 auto;
      width: 100%;
    }
    .top-share-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--s-6);
      padding-bottom: var(--s-4);
      border-bottom: 1px solid var(--rule);
    }
    .series-nav-link a {
      font-size: var(--t-xs);
      font-weight: 700;
      color: var(--accent-ink);
      text-decoration: none;
    }
    .series-nav-link a:hover {
      text-decoration: underline;
    }

    .article-intro {
      margin-bottom: var(--s-7);
    }
    .lede-p {
      font-size: var(--t-lede);
      line-height: var(--lh-body);
      color: var(--ink);
      margin-bottom: var(--s-4);
    }
    .first-dropcap::first-letter {
      font-size: 3.25rem;
      font-weight: 800;
      float: left;
      line-height: 0.8;
      margin-right: 10px;
      margin-top: 4px;
      color: var(--accent-ink);
    }

    .article-section {
      margin-bottom: var(--s-8);
      scroll-margin-top: calc(var(--header-h) + var(--s-6));
    }
    .section-heading {
      font-size: var(--t-h2);
      font-weight: 800;
      color: var(--ink);
      line-height: var(--lh-tight);
      margin: var(--s-6) 0 var(--s-4);
      letter-spacing: var(--track-head);
    }
    .section-subheading {
      font-size: var(--t-h3);
      font-weight: 700;
      color: var(--ink-2);
      margin: var(--s-4) 0 var(--s-3);
    }
    .body-p {
      font-size: var(--t-body);
      line-height: var(--lh-body);
      color: var(--ink);
      margin-bottom: var(--s-4);
    }
    .body-list {
      margin: var(--s-4) 0 var(--s-5);
      padding-left: var(--s-5);
      font-size: var(--t-body);
      line-height: var(--lh-body);
      color: var(--ink);
    }
    .body-list li {
      margin-bottom: var(--s-3);
    }

    /* Editorial Pullquotes */
    .editorial-pullquote {
      border-left: 3px solid var(--accent);
      padding: var(--s-4) var(--s-5);
      margin: var(--s-6) 0;
      background: var(--surface);
      border-radius: 0 var(--r-md) var(--r-md) 0;
    }
    .editorial-pullquote p {
      font-size: var(--t-h3);
      font-weight: 700;
      font-style: italic;
      color: var(--ink);
      margin: 0 0 var(--s-2);
      line-height: var(--lh-snug);
    }
    .editorial-pullquote cite {
      font-size: var(--t-xs);
      font-weight: 700;
      color: var(--accent-ink);
      font-style: normal;
    }

    /* Editorial Callouts */
    .editorial-callout {
      background: var(--accent-soft);
      border: 1px solid var(--accent);
      border-radius: var(--r-md);
      padding: var(--s-4) var(--s-5);
      margin: var(--s-6) 0;
    }
    .callout-title {
      font-size: var(--t-sm);
      font-weight: 800;
      color: var(--accent-ink);
      margin: 0 0 var(--s-2);
    }
    .editorial-callout p {
      font-size: var(--t-sm);
      color: var(--ink);
      margin: 0;
      line-height: var(--lh-body);
      font-weight: 600;
    }

    .bottom-share-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: var(--s-8);
      padding-top: var(--s-5);
      border-top: 1px solid var(--rule);
    }
    .series-tagline-footer {
      font-size: var(--t-xs);
      font-style: italic;
      font-weight: 600;
      color: var(--ink-2);
    }

    .not-found-wrap {
      padding: var(--s-9) 0;
      text-align: center;
    }
    .back-btn {
      display: inline-block;
      margin-top: var(--s-4);
      padding: var(--s-3) var(--s-5);
      background: var(--accent);
      color: var(--on-accent);
      font-weight: 800;
      border-radius: var(--r-pill);
      text-decoration: none;
    }

    @media (max-width: 1024px) {
      .article-container {
        grid-template-columns: 1fr;
      }
      .toc-sidebar {
        position: relative;
        top: 0;
      }
    }
  `]
})
export class BlogArticleComponent implements OnInit, OnChanges {
  @Input() slug!: string;

  article: BlogArticle | undefined;

  private seo = inject(SeoService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  constructor(@Inject(DOCUMENT) private doc: Document) {}

  ngOnInit(): void {
    this.resolveArticle();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slug']) {
      this.resolveArticle();
    }
  }

  private resolveArticle(): void {
    const currentSlug = this.slug || this.router.url.split('/blogs/')[1]?.split('?')[0]?.split('#')[0];
    if (currentSlug) {
      this.article = getArticleBySlug(currentSlug);
    }

    if (!this.article && BLOG_ARTICLES.length > 0) {
      this.article = BLOG_ARTICLES[0];
    }

    if (this.article) {
      this.seo.set({
        title: this.article.seo.title,
        description: this.article.seo.description,
        path: `/blogs/${this.article.slug}/`,
      });

      this.injectSchemaJsonLd();
    }
  }

  private injectSchemaJsonLd(): void {
    if (!isPlatformBrowser(this.platformId) || !this.article || typeof this.doc === 'undefined') return;

    const existingScript = this.doc.getElementById('blog-schema-jsonld');
    if (existingScript) {
      existingScript.remove();
    }

    const script = this.doc.createElement('script');
    script.id = 'blog-schema-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: this.article.title,
      description: this.article.subtitle,
      author: {
        '@type': 'Organization',
        name: 'NEC E-Cell PSGIM',
        url: 'https://psgim-ecell.pages.dev',
      },
      publisher: {
        '@type': 'Organization',
        name: 'PSGIM E-Cell',
        logo: {
          '@type': 'ImageObject',
          url: 'https://psgim-ecell.pages.dev/logo@2x.png',
        },
      },
      datePublished: this.article.date,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://psgim-ecell.pages.dev/blogs/${this.article.slug}/`,
      },
      keywords: [this.article.seo.primaryKeyword, ...this.article.seo.secondaryKeywords].join(', '),
    });

    this.doc.head.appendChild(script);
  }
}
