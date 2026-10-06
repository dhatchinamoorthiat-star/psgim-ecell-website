import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject } from '@angular/core';
import { BootExperienceService } from '../../../core/services/boot-experience.service';

/**
 * The cinematic boot layer: a full-screen brand composition whose progress
 * line becomes the vertical seam the screen opens along — like a pair of
 * doors parting — to reveal the homepage.
 *
 * The composition is duplicated into two panels, each clipping the same
 * full-viewport stage from opposite sides, so the two halves read as one
 * image until the moment they part. Both panels are aria-hidden; a single
 * polite live region carries the three real status words instead, so the
 * percentage never becomes screen-reader noise.
 *
 * Rendered in the prerendered/SSR HTML as its static first frame (logo,
 * axis at 0%, "Initialising"), which is also the graceful no-JS state —
 * and is cleared regardless by the `boot-failsafe` CSS animation, so a
 * broken JS bundle can never leave a visitor stuck behind the overlay.
 */
@Component({
  selector: 'ui-boot-experience',
  standalone: true,
  template: `
    @if (!boot.complete()) {
      <div class="boot" [attr.data-phase]="boot.phase()" [class.is-reduced]="boot.reducedMotion()">
        @for (panel of panels; track panel) {
          <div class="boot-panel" [attr.data-panel]="panel" aria-hidden="true">
            <div class="boot-stage">
              <!-- Decorative: the accessible name lives in the live region
                   below. Painted via CSS background-image so the theme
                   picks the variant before hydration — see the component
                   stylesheet. -->
              <div class="boot-mark"></div>

              <div class="boot-axis">
                <div class="boot-axis-track">
                  <div class="boot-axis-fill" [style.transform]="fillTransform()"></div>
                  <div class="boot-axis-sheen"></div>
                </div>
                <!-- Sits outside the (overflow-hidden) track so its glow
                     isn't clipped: the light at the leading edge of travel. -->
                <div class="boot-axis-head" [style.left]="headOffset()"></div>
              </div>

              <div class="boot-meta">
                <span class="boot-status">
                  <!-- Keyed on the label so the node is replaced when the
                       wording changes, which re-runs the swap animation. -->
                  @for (word of statusWord(); track word) {
                    <span class="boot-status-word">{{ word }}</span>
                  }
                </span>
                <span class="boot-percent">{{ boot.percent() }}<i>%</i></span>
              </div>
            </div>
          </div>
        }
        <div class="boot-seam" aria-hidden="true"></div>
      </div>

      <p class="sr-only" role="status" aria-live="polite">{{ announcement() }}</p>
    }
  `,
  styleUrl: './boot-experience.component.css',
})
export class BootExperienceComponent implements OnInit, OnDestroy {
  protected readonly boot = inject(BootExperienceService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Left and right halves of the same composition — the two "doors". */
  protected readonly panels = ['left', 'right'] as const;

  protected readonly fillTransform = computed(() => `scaleX(${this.boot.visualProgress()})`);

  /** Position of the travelling light at the head of the line. */
  protected readonly headOffset = computed(() => `${this.boot.visualProgress() * 100}%`);

  /** Single-item list so @for can key the status node on its wording. */
  protected readonly statusWord = computed(() => [this.boot.label()]);

  /** Only the status word is announced, and only when it changes. */
  protected readonly announcement = computed(() =>
    this.boot.phase() === 'booting' ? 'Loading PSGIM E-Cell' : this.boot.label(),
  );

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.boot.shouldRun()) {
      this.boot.skip();
      return;
    }
    this.boot.start();
  }

  ngOnDestroy(): void {
    this.boot.dispose();
  }
}
