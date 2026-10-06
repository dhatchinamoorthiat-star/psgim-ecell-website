import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';
import { TeamService } from '../../../core/services/team.service';
import { VerticalEcosystem } from '../../../core/models/models';
import { TeamBreadcrumbComponent } from '../components/team-breadcrumb.component';
import { StaggerDirective } from '../../../core/motion/directives/stagger.directive';
import { RevealOnScrollDirective } from '../../../core/motion/directives/reveal.directive';

/**
 * `/meet-the-team/vertical/:slug` — the second level of the team ecosystem.
 *
 * Answers "what is this vertical, what does it do, and where does its work
 * show up?" — deliberately not a people directory. No vertical head, roster,
 * metric or quote is recorded for any vertical, and none is invented here.
 *
 * Structure: identity (hero) → work (the four real responsibilities) →
 * related output (a real route on this site) → get involved → continue to
 * another vertical.
 *
 * On the two prose sections the brief suggested: the data carries exactly one
 * descriptive sentence per vertical (`description`) plus four
 * `responsibilities`. A separate "what this vertical does" section ahead of
 * the responsibilities would have to restate the same sentence or invent a
 * second one, so the description carries the hero and the responsibilities
 * carry the work section. One idea, stated once.
 *
 * Two hero compositions, chosen by whether the vertical owns artwork:
 *  - with illustration — asymmetric text/figure split, the figure bounded in
 *    its own frame rather than run as a full-bleed banner. The available
 *    illustrations are an inconsistent set (two are in the indigo/neon family
 *    the brand direction moved away from), so they are kept to a supporting
 *    column where they inform identity without setting it.
 *  - without — Public Relations, which has no artwork of its own. It gets an
 *    oversized index numeral and a wider type measure instead, so the absence
 *    reads as a composition rather than a gap. `reach/ecosystem-network.jpg`
 *    was considered and rejected: it depicts a figure buried in paperwork,
 *    which is neither an ecosystem nor outreach.
 */
@Component({
  selector: 'app-vertical-detail',
  standalone: true,
  imports: [TeamBreadcrumbComponent, RouterLink, StaggerDirective, RevealOnScrollDirective],
  template: `
    @if (vertical) {
      <div class="wrap vd-crumb">
        <app-team-breadcrumb [vertical]="{ name: vertical.name, slug: vertical.slug }" />
      </div>

      <!-- IDENTITY -->
      <section class="hero vd-hero" [class.vd-hero--type]="!vertical.heroImage">
        <div class="wrap vd-hero__inner">
          <div class="vd-hero__text">
            <span class="kicker">Vertical {{ indexLabel }} of {{ total }}</span>
            <h1 [style.view-transition-name]="'vt-vertical-' + vertical.slug">{{ vertical.name }}</h1>
            <p class="lede">{{ vertical.description }}</p>
          </div>

          @if (vertical.heroImage) {
            <figure class="vd-figure">
              <img
                [src]="vertical.heroImage"
                alt=""
                class="vd-figure__img"
                decoding="async"
                fetchpriority="high"
              />
            </figure>
          } @else {
            <span class="vd-hero__numeral" aria-hidden="true">{{ indexLabel }}</span>
          }
        </div>
      </section>

      <!-- WORK -->
      <section class="section wrap" aria-labelledby="vd-work" revealOnScroll>
        <div class="section-heading">
          <span class="kicker">The work</span>
          <h2 id="vd-work">What {{ vertical.name }} is responsible for</h2>
        </div>

        <ol class="vd-work" appStagger childSelector=".vd-work__item" [staggerInterval]="0.07">
          @for (r of vertical.responsibilities; track r; let i = $index) {
            <li class="vd-work__item">
              <span class="vd-work__index" aria-hidden="true">{{ pad(i + 1) }}</span>
              <p class="vd-work__text">{{ r }}</p>
            </li>
          }
        </ol>
      </section>

      <!-- RELATED OUTPUT -->
      @if (vertical.relatedWork; as related) {
        <section class="section wrap" aria-labelledby="vd-related" revealOnScroll>
          <div class="section-heading">
            <span class="kicker">Where it shows up</span>
            <h2 id="vd-related">The work becomes public</h2>
          </div>

          <a [routerLink]="related.href" class="vd-related">
            <span class="vd-related__label">{{ related.label }}</span>
            <span class="vd-related__note">
              What {{ vertical.name }} produces is published here.
            </span>
            <span class="vd-related__go" aria-hidden="true">→</span>
          </a>
        </section>
      }

      <!-- GET INVOLVED -->
      <section class="section section-band vd-join" aria-labelledby="vd-join-heading" revealOnScroll>
        <div class="wrap">
          <span class="kicker">Get involved</span>
          <h2 id="vd-join-heading" class="vd-join__title">Build with {{ vertical.name }}.</h2>
          <p class="vd-join__body">
            Every vertical takes new members. Tell us what you would want to work on.
          </p>
          <div class="hero-actions">
            <a routerLink="/contact" class="btn btn-inverse">Get in touch</a>
            <a routerLink="/meet-the-team" class="btn btn-ghost">Back to the team</a>
          </div>
        </div>
      </section>

      <!-- CONTINUE -->
      <nav class="section wrap vd-switch" aria-labelledby="vd-switch-heading" revealOnScroll>
        <h2 id="vd-switch-heading" class="vd-switch__heading kicker">Explore another vertical</h2>
        <ul class="vd-switch__list" appStagger childSelector=".vd-switch__item" [staggerInterval]="0.05">
          @for (v of others; track v.id) {
            <li class="vd-switch__item">
              <a [routerLink]="['/meet-the-team/vertical', v.slug]" class="vd-switch__link">
                <span class="vd-switch__index" aria-hidden="true">{{ pad(v.displayOrder) }}</span>
                <span class="vd-switch__name">{{ v.name }}</span>
                <span class="vd-switch__go" aria-hidden="true">→</span>
              </a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
  styles: [
    `
      .vd-crumb {
        padding-top: var(--s-5);
      }

      /* --- Identity --- */
      .vd-hero {
        padding-bottom: var(--s-7);
      }
      .vd-hero__inner {
        display: grid;
        grid-template-columns: 7fr 5fr;
        gap: var(--s-8);
        align-items: center;
      }
      .vd-hero__text h1 {
        margin-top: var(--s-3);
      }
      .vd-figure {
        margin: 0;
        border: 1px solid var(--rule);
        border-radius: var(--r-lg);
        overflow: hidden;
        background: var(--surface);
        aspect-ratio: 4 / 3;
        box-shadow: var(--shadow-sm);
      }
      .vd-figure__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      /* Public Relations: no artwork, so an oversized index carries the
         right-hand column instead of leaving it empty. */
      .vd-hero--type .vd-hero__inner {
        grid-template-columns: 8fr 4fr;
      }
      .vd-hero__numeral {
        font-family: var(--font-display);
        font-size: clamp(6rem, 14vw, 13rem);
        font-weight: 800;
        line-height: 0.8;
        color: var(--accent-soft);
        text-align: right;
        letter-spacing: var(--track-display);
        user-select: none;
      }

      /* --- Work: a ruled, numbered list. Not cards. --- */
      .vd-work {
        list-style: none;
        margin: var(--s-7) 0 0;
        padding: 0;
        border-top: 1px solid var(--rule);
        max-width: 60rem;
      }
      .vd-work__item {
        display: grid;
        grid-template-columns: 5rem 1fr;
        gap: var(--s-5);
        align-items: baseline;
        padding-block: var(--s-5);
        border-bottom: 1px solid var(--rule);
      }
      .vd-work__index {
        font-family: var(--font-display);
        font-size: var(--t-h3);
        font-weight: 700;
        color: var(--accent-ink);
        letter-spacing: var(--track-display);
      }
      .vd-work__text {
        font-size: var(--t-lede);
        line-height: var(--lh-body);
        color: var(--ink);
        margin: 0;
        max-width: 46ch;
      }

      /* --- Related output --- */
      .vd-related {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: var(--s-4) var(--s-6);
        margin-top: var(--s-7);
        padding: var(--s-7) var(--s-6);
        text-decoration: none;
        border-top: 2px solid var(--ink);
        border-bottom: 1px solid var(--rule);
        background: linear-gradient(180deg, var(--accent-soft), transparent 70%);
        transition:
          background var(--dur-normal) var(--ease-out),
          padding-left var(--dur-normal) var(--ease-out);
      }
      .vd-related:hover {
        padding-left: var(--s-7);
      }
      .vd-related__label {
        grid-column: 1;
        font-family: var(--font-display);
        font-size: var(--t-h2);
        font-weight: 800;
        color: var(--ink);
        line-height: 1.1;
      }
      .vd-related__note {
        grid-column: 1;
        grid-row: 2;
        color: var(--ink-2);
        font-size: var(--t-sm);
      }
      .vd-related__go {
        grid-column: 2;
        grid-row: 1 / span 2;
        font-size: var(--t-h2);
        color: var(--accent-ink);
        transition: transform var(--dur-normal) var(--ease-out);
      }
      .vd-related:hover .vd-related__go {
        transform: translateX(4px);
      }

      /* --- Get involved --- */
      .vd-join__title {
        font-size: var(--t-h2);
        margin-top: var(--s-3);
        max-width: 20ch;
      }
      .vd-join__body {
        color: var(--ink-2);
        max-width: 52ch;
        margin-top: var(--s-4);
      }

      /* --- Continue --- */
      .vd-switch__heading {
        margin-bottom: var(--s-5);
      }
      .vd-switch__list {
        list-style: none;
        margin: 0;
        padding: 0;
        border-top: 1px solid var(--rule);
      }
      .vd-switch__link {
        display: grid;
        grid-template-columns: 4rem 1fr auto;
        gap: var(--s-4);
        align-items: baseline;
        padding-block: var(--s-5);
        border-bottom: 1px solid var(--rule);
        text-decoration: none;
        transition: padding-left var(--dur-normal) var(--ease-out);
      }
      .vd-switch__link:hover {
        padding-left: var(--s-4);
      }
      .vd-switch__index {
        font-size: var(--t-xs);
        font-weight: 700;
        letter-spacing: var(--track-wide);
        color: var(--ink-2);
      }
      .vd-switch__name {
        font-family: var(--font-display);
        font-size: var(--t-h3);
        font-weight: 700;
        color: var(--ink);
      }
      .vd-switch__go {
        color: var(--accent-ink);
        transition: transform var(--dur-normal) var(--ease-out);
      }
      .vd-switch__link:hover .vd-switch__go {
        transform: translateX(4px);
      }

      /* --- Tablet --- */
      @media (max-width: 64rem) {
        .vd-hero__inner,
        .vd-hero--type .vd-hero__inner {
          grid-template-columns: 1fr;
          gap: var(--s-6);
        }
        .vd-hero__numeral {
          text-align: left;
          font-size: clamp(5rem, 18vw, 9rem);
        }
        .vd-figure {
          aspect-ratio: 16 / 9;
        }
      }

      /* --- Mobile --- */
      @media (max-width: 48rem) {
        .vd-work__item {
          grid-template-columns: 1fr;
          gap: var(--s-2);
        }
        .vd-work__text {
          font-size: var(--t-body);
        }
        .vd-related {
          padding: var(--s-6) var(--s-4);
          grid-template-columns: 1fr;
        }
        .vd-related__go {
          grid-column: 1;
          grid-row: 3;
        }
        .vd-related__label {
          font-size: var(--t-h3);
        }
        .vd-switch__link {
          grid-template-columns: 3rem 1fr auto;
          gap: var(--s-3);
        }
        .vd-switch__name {
          font-size: var(--t-body);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .vd-related,
        .vd-related__go,
        .vd-switch__link,
        .vd-switch__go {
          transition: none;
        }
        /* Hover keeps the resting inset and the arrow stays put: the affordance
           is the arrow and the underlined heading, not the movement. */
        .vd-related:hover {
          padding-left: var(--s-6);
        }
        .vd-switch__link:hover {
          padding-left: 0;
        }
        .vd-related:hover .vd-related__go,
        .vd-switch__link:hover .vd-switch__go {
          transform: none;
        }
      }
    `,
  ],
})
export class VerticalDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seo = inject(SeoService);
  private teamService = inject(TeamService);

  protected vertical?: VerticalEcosystem;
  protected others: VerticalEcosystem[] = [];
  protected total = 0;

  protected get indexLabel(): string {
    return this.pad(this.vertical?.displayOrder ?? 0);
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  ngOnInit(): void {
    this.total = this.teamService.getVerticals().length;

    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      const found = slug ? this.teamService.getVertical(slug) : undefined;

      if (!found) {
        void this.router.navigate(['/meet-the-team']);
        return;
      }

      this.vertical = found;
      this.others = this.teamService.getOtherVerticals(found.slug);

      // SeoService appends " — PSGIM E-Cell" itself, so the title passed here
      // must not name the site at all — the previous value produced
      // "… | PSGIM E-Cell — PSGIM E-Cell".
      this.seo.set({
        title: `${found.name} vertical`,
        description: found.description,
        path: `/meet-the-team/vertical/${found.slug}`,
      });
    });
  }
}
