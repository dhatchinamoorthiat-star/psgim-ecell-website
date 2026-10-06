import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { TeamService } from '../../core/services/team.service';
import { FacultyMember, NecTeamMember, Patron, TeamRole, VerticalEcosystem } from '../../core/models/models';
import { TeamBreadcrumbComponent } from './components/team-breadcrumb.component';
import { VerticalCardComponent } from './components/vertical-card.component';
import { StaggerDirective } from '../../core/motion/directives/stagger.directive';
import { RevealOnScrollDirective } from '../../core/motion/directives/reveal.directive';

/**
 * `/meet-the-team` — the canonical team page.
 *
 * Reads as an organisation portrait in six movements: who governs it, how the
 * work divides, which remits are open, who is on the roll, and how to join.
 *
 * Two constraints shaped the composition:
 *
 *  1. No portrait exists for anyone, and no bio, skill or quote is recorded
 *     for any student. So the page is built from typography, asymmetry and
 *     initials rather than from a photo grid with holes in it. Nothing here
 *     is invented to fill space — the only figures shown are counts derived
 *     from the data itself.
 *  2. It uses the site's global vocabulary (`.wrap`, `.section`, `.kicker`,
 *     `.section-heading`, `.btn`, `.avatar-initials`, `.role-list`,
 *     `.hero-actions`) instead of the parallel design system the old version
 *     had grown. The styles below cover only genuinely page-specific
 *     composition: the vertical mosaic, the governance asymmetry, the open-
 *     remit treatment and the people index.
 *
 * `videos/meet-the-team.mp4` is deliberately not used here: it carries a
 * burned-in red "MEET THE TEAM" title that duplicates this page's own h1 and
 * introduces a colour outside the token system, and at 854x480 it is too soft
 * to carry a full-bleed hero.
 */
@Component({
  selector: 'app-meet-the-team',
  standalone: true,
  imports: [TeamBreadcrumbComponent, VerticalCardComponent, RouterLink, StaggerDirective, RevealOnScrollDirective],
  template: `
    <div class="wrap mtt-crumb">
      <app-team-breadcrumb />
    </div>

    <!-- 1 — HERO -->
    <section class="hero mtt-hero">
      <div class="wrap" revealOnScroll>
        <span class="kicker">PSGIM E-Cell</span>
        <h1>Meet the people who build the cell.</h1>
        <p class="lede">People with different roles, different strengths, and one shared space to build.</p>

        <!-- Counts read straight off the roll, the vertical list and the
             faculty list. None of these is a claim about reach or impact. -->
        <dl class="mtt-facts" appStagger childSelector=".mtt-fact" [staggerInterval]="0.06">
          <div class="mtt-fact">
            <dt>{{ people.length }}</dt>
            <dd>students on the roll</dd>
          </div>
          <div class="mtt-fact">
            <dt>{{ verticals.length }}</dt>
            <dd>verticals</dd>
          </div>
          <div class="mtt-fact">
            <dt>{{ faculty.length }}</dt>
            <dd>faculty coordinators</dd>
          </div>
          <div class="mtt-fact">
            <dt>{{ openRoleCount }}</dt>
            <dd>core remits open</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- 2 — GOVERNANCE -->
    <section class="section wrap" aria-labelledby="mtt-governance" revealOnScroll>
      <div class="section-heading">
        <span class="kicker">Governance</span>
        <h2 id="mtt-governance">Patron and faculty coordinators</h2>
      </div>
      <p class="mtt-section-note">
        The cell runs under the institute's director and three faculty coordinators. Everything below this
        point — the verticals, the core committee, the roll — is student-led.
      </p>

      <div class="mtt-governance">
        <article class="mtt-patron">
          <span class="avatar-initials mtt-patron__mark" aria-hidden="true">{{ initials(patron.name) }}</span>
          <div>
            <span class="mtt-eyebrow">Patron</span>
            <h3 class="mtt-patron__name">{{ patron.name }}</h3>
            <p class="mtt-patron__role">{{ patron.role }}</p>
          </div>
        </article>

        <ul class="mtt-faculty" appStagger childSelector=".mtt-faculty__item">
          @for (f of faculty; track f.name) {
            <li class="mtt-faculty__item">
              <span class="avatar-initials mtt-faculty__mark" aria-hidden="true">{{ initials(f.name) }}</span>
              <div>
                <span class="mtt-name">{{ f.name }}</span>
                <span class="mtt-role">{{ f.role }}</span>
              </div>
            </li>
          }
        </ul>
      </div>
    </section>

    <!-- 3 — THE FIVE VERTICALS -->
    <section class="section wrap" aria-labelledby="mtt-verticals" revealOnScroll>
      <div class="section-heading">
        <span class="kicker">How the work divides</span>
        <h2 id="mtt-verticals">Five verticals</h2>
      </div>
      <p class="mtt-section-note">
        Each vertical owns a different part of what the cell produces. Open one to see what it is
        responsible for.
      </p>

      <div class="mtt-mosaic" appStagger childSelector=".mtt-mosaic__cell" [staggerInterval]="0.08">
        @for (v of verticals; track v.id; let i = $index) {
          <div class="mtt-mosaic__cell" [attr.data-slot]="i + 1">
            <app-vertical-card [vertical]="v" [index]="i" />
          </div>
        }
      </div>
    </section>

    <!-- 4 — CORE COMMITTEE -->
    <section class="section wrap" aria-labelledby="mtt-core" revealOnScroll>
      <div class="section-heading">
        <span class="kicker">Core committee</span>
        <h2 id="mtt-core">Six remits</h2>
      </div>
      <p class="mtt-section-note">{{ coreNote }}</p>

      <div class="role-list mtt-roles">
        @for (r of coreRoles; track r.role) {
          <div class="role-row" [class.mtt-role-row--open]="!r.name">
            <span class="role">{{ r.role }}</span>
            <div>
              @if (r.name) {
                <p class="name">{{ r.name }}</p>
              } @else {
                <p class="name mtt-open">
                  <span class="mtt-open__tag">Open</span>
                  <a routerLink="/contact" class="mtt-open__link">Take this on →</a>
                </p>
              }
              <p class="remit">{{ r.remit }}</p>
            </div>
          </div>
        }
      </div>
    </section>

    <!-- 5 — THE PEOPLE -->
    <section class="section wrap" aria-labelledby="mtt-people" revealOnScroll>
      <div class="section-heading">
        <span class="kicker">The people</span>
        <h2 id="mtt-people">{{ people.length }} students, this cycle</h2>
      </div>
      <p class="mtt-section-note">{{ peopleNote }}</p>

      <div class="mtt-people">
        <article class="mtt-lead">
          <span class="avatar-initials mtt-lead__mark" aria-hidden="true">{{ initials(lead.name) }}</span>
          <div>
            <span class="mtt-eyebrow">{{ lead.role }}</span>
            <h3 class="mtt-lead__name">{{ lead.name }}</h3>
          </div>
        </article>

        <ul class="mtt-roll" appStagger childSelector=".mtt-roll__item" [staggerInterval]="0.03">
          @for (m of roll; track m.name) {
            <li class="mtt-roll__item">
              <span class="mtt-roll__mark" aria-hidden="true">{{ initials(m.name) }}</span>
              <span class="mtt-roll__name">{{ m.name }}</span>
            </li>
          }
        </ul>
      </div>
    </section>

    <!-- 6 — JOIN -->
    <section class="section section-band mtt-join" aria-labelledby="mtt-join-heading" revealOnScroll>
      <div class="wrap">
        <span class="kicker">Get involved</span>
        <h2 id="mtt-join-heading" class="mtt-join__title">There is room for you here.</h2>
        <p class="mtt-join__body">
          @if (openRoleCount > 0) {
            {{ openRoleCount }} core remits are open, and every vertical takes new members.
          } @else {
            Every vertical takes new members.
          }
          Tell us what you would want to work on.
        </p>
        <!-- btn-inverse, not btn-primary: .section-band remaps --ink to
             --band-ink but leaves --ink-inverse alone, so .btn-primary renders
             white-on-white inside a band. .btn-inverse is the global class
             written for band context (background: --band-ink, color: --band). -->
        <div class="hero-actions">
          <a routerLink="/contact" class="btn btn-inverse">Join the cell</a>
          <a routerLink="/initiatives" class="btn btn-ghost">See what we run</a>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .mtt-crumb {
        padding-top: var(--s-5);
      }

      /* --- Hero --- */
      .mtt-hero {
        padding-bottom: var(--s-7);
      }
      .mtt-facts {
        display: flex;
        flex-wrap: wrap;
        gap: var(--s-7);
        margin: var(--s-7) 0 0;
        padding-top: var(--s-6);
        border-top: 1px solid var(--rule);
      }
      /* Bound the item, not the label: the --track-wide letter-spacing makes
         a word like "COORDINATORS" render wider than its own character
         count, so a ch-based cap on the dd overflows and collides with the
         next fact. */
      .mtt-fact {
        min-width: 6rem;
        max-width: 11rem;
      }
      .mtt-fact dt {
        font-family: var(--font-display);
        font-size: var(--t-h2);
        font-weight: 800;
        line-height: 1;
        letter-spacing: var(--track-display);
        color: var(--ink);
      }
      .mtt-fact dd {
        margin: var(--s-2) 0 0;
        font-size: var(--t-xs);
        text-transform: uppercase;
        letter-spacing: var(--track-wide);
        /* --ink-2, not --ink-3: at this size --ink-3 on --paper measures
           3.95:1 in light mode, under the 4.5:1 AA threshold for small text. */
        color: var(--ink-2);
      }

      .mtt-section-note {
        color: var(--ink-2);
        max-width: 58ch;
        margin-top: var(--s-4);
      }
      .mtt-eyebrow {
        display: block;
        font-size: var(--t-micro);
        font-weight: 600;
        letter-spacing: var(--track-kicker);
        text-transform: uppercase;
        color: var(--ink-3);
        margin-bottom: var(--s-2);
      }

      /* --- Governance: one lead block + a supporting row (1 + 3) --- */
      .mtt-governance {
        display: grid;
        grid-template-columns: 5fr 7fr;
        gap: var(--s-7);
        margin-top: var(--s-7);
        align-items: start;
      }
      .mtt-patron {
        display: flex;
        gap: var(--s-5);
        align-items: center;
        padding: var(--s-6);
        background: var(--surface-2);
        border: 1px solid var(--rule);
        border-radius: var(--r-lg);
      }
      .mtt-patron__mark {
        width: 96px;
        height: 96px;
        margin: 0;
        flex-shrink: 0;
        background: var(--surface);
        color: var(--ink);
        border: 1px solid var(--rule-strong);
      }
      .mtt-patron__name {
        font-family: var(--font-display);
        font-size: var(--t-h3);
        font-weight: 800;
        color: var(--ink);
      }
      .mtt-patron__role {
        color: var(--ink-2);
        font-size: var(--t-sm);
        margin-top: var(--s-1);
      }

      .mtt-faculty {
        list-style: none;
        margin: 0;
        padding: 0;
        border-top: 1px solid var(--rule);
      }
      .mtt-faculty__item {
        display: flex;
        align-items: center;
        gap: var(--s-4);
        padding-block: var(--s-4);
        border-bottom: 1px solid var(--rule);
      }
      .mtt-faculty__mark {
        width: 52px;
        height: 52px;
        margin: 0;
        flex-shrink: 0;
        font-size: var(--t-sm);
      }
      .mtt-name {
        display: block;
        font-weight: 600;
        color: var(--ink);
      }
      .mtt-role {
        display: block;
        font-size: var(--t-xs);
        /* See .mtt-fact dd — --ink-3 is below AA on --paper at this size. */
        color: var(--ink-2);
        margin-top: 2px;
      }

      /* --- Verticals: deliberately uneven — four image panels in two
         unequal rows, then Public Relations full width as a type panel. --- */
      .mtt-mosaic {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: var(--s-6);
        margin-top: var(--s-7);
      }
      .mtt-mosaic__cell[data-slot='1'] {
        grid-column: span 7;
      }
      .mtt-mosaic__cell[data-slot='2'] {
        grid-column: span 5;
      }
      .mtt-mosaic__cell[data-slot='3'] {
        grid-column: span 5;
      }
      .mtt-mosaic__cell[data-slot='4'] {
        grid-column: span 7;
      }
      .mtt-mosaic__cell[data-slot='5'] {
        grid-column: span 12;
      }

      /* --- Core committee: an open remit is an invitation, not a blank. --- */
      .mtt-roles {
        margin-top: var(--s-7);
      }
      .mtt-role-row--open {
        background: linear-gradient(90deg, var(--accent-soft), transparent 60%);
      }
      .mtt-open {
        display: flex;
        align-items: baseline;
        gap: var(--s-4);
        flex-wrap: wrap;
      }
      .mtt-open__tag {
        font-family: var(--font-display);
        font-size: var(--t-h3);
        font-weight: 700;
        color: var(--accent-ink);
      }
      .mtt-open__link {
        font-size: var(--t-sm);
        font-weight: 600;
        color: var(--ink-2);
        text-decoration: none;
        border-bottom: 1px solid var(--rule-strong);
      }
      .mtt-open__link:hover {
        color: var(--ink);
        border-bottom-color: var(--accent);
      }

      /* --- People: the lead set apart, then a dense name index. --- */
      .mtt-people {
        margin-top: var(--s-7);
      }
      .mtt-lead {
        display: flex;
        align-items: center;
        gap: var(--s-5);
        padding-bottom: var(--s-6);
        margin-bottom: var(--s-6);
        border-bottom: 1px solid var(--rule);
      }
      .mtt-lead__mark {
        width: 80px;
        height: 80px;
        margin: 0;
        flex-shrink: 0;
      }
      .mtt-lead__name {
        font-family: var(--font-display);
        font-size: var(--t-h2);
        font-weight: 800;
        color: var(--ink);
        line-height: 1.1;
      }

      .mtt-roll {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
        gap: 0 var(--s-6);
      }
      .mtt-roll__item {
        display: flex;
        align-items: center;
        gap: var(--s-3);
        padding-block: var(--s-3);
        border-bottom: 1px solid var(--rule);
      }
      .mtt-roll__mark {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: var(--accent-soft);
        color: var(--accent-ink);
        font-size: var(--t-micro);
        font-weight: 700;
      }
      .mtt-roll__name {
        font-size: var(--t-sm);
        font-weight: 600;
        color: var(--ink);
      }

      /* --- Join --- */
      .mtt-join__title {
        font-size: var(--t-h2);
        margin-top: var(--s-3);
        max-width: 18ch;
      }
      .mtt-join__body {
        color: var(--ink-2);
        max-width: 52ch;
        margin-top: var(--s-4);
      }

      /* --- Tablet --- */
      @media (max-width: 64rem) {
        .mtt-governance {
          grid-template-columns: 1fr;
          gap: var(--s-6);
        }
        .mtt-mosaic__cell[data-slot='1'],
        .mtt-mosaic__cell[data-slot='2'],
        .mtt-mosaic__cell[data-slot='3'],
        .mtt-mosaic__cell[data-slot='4'] {
          grid-column: span 6;
        }
      }

      /* --- Mobile --- */
      @media (max-width: 48rem) {
        .mtt-facts {
          gap: var(--s-5) var(--s-6);
        }
        .mtt-fact dt {
          font-size: var(--t-h3);
        }
        .mtt-mosaic {
          gap: var(--s-5);
        }
        .mtt-mosaic__cell[data-slot] {
          grid-column: span 12;
        }
        .mtt-patron {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--s-4);
          padding: var(--s-5);
        }
        .mtt-roll {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class MeetTheTeamComponent implements OnInit {
  private seo = inject(SeoService);
  private teamService = inject(TeamService);

  protected patron!: Patron;
  protected faculty: FacultyMember[] = [];
  protected verticals: VerticalEcosystem[] = [];
  protected coreRoles: TeamRole[] = [];
  protected coreNote = '';
  protected peopleNote = '';
  protected lead!: NecTeamMember;
  /** Everyone on the roll except the lead, who is presented separately. */
  protected roll: NecTeamMember[] = [];
  /** Lead included — this is the count the page states. */
  protected people: NecTeamMember[] = [];

  protected get openRoleCount(): number {
    return this.coreRoles.filter((r) => !r.name).length;
  }

  ngOnInit(): void {
    const team = this.teamService.getPeople();

    this.patron = this.teamService.getPatron();
    this.faculty = this.teamService.getFaculty();
    this.verticals = this.teamService.getVerticals();
    this.coreRoles = this.teamService.getCoreRoles();
    this.coreNote = this.teamService.getCoreRolesNote();
    this.peopleNote = team.note;
    this.lead = team.lead;
    this.roll = team.members;
    this.people = this.teamService.getPeopleIndex();

    this.seo.set({
      title: 'Meet the Team',
      description:
        'The people who build PSGIM E-Cell: the faculty coordinators who govern it, the five verticals the work divides into, and the students on the roll.',
      path: '/meet-the-team',
    });
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase();
  }
}
