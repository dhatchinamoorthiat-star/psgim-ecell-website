import {
  DOCUMENT,
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { Subscription, filter, take } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export type BootPhase = 'booting' | 'loading' | 'ready' | 'revealing' | 'complete';

/**
 * The critical set — the things that must genuinely be true before the first
 * viewport of the site is correct. Deliberately short:
 *
 *   route-rendered  the initial router navigation has completed — the lazy
 *                chunk for the entry route is loaded and its component
 *                instantiated — and the browser has painted a frame.
 *   brand-fonts  the Montserrat display weights the hero headline and
 *                kickers are set in — without these the hero reflows.
 *   brand-mark   the logo lockup, which is both the boot mark and the
 *                navbar mark in the first viewport.
 *
 * Everything else on the page — below-fold imagery, the canvas node
 * network, the CMS read API on /content routes, lazily-routed pages — is
 * non-critical by definition and is never waited on.
 */
const CRITICAL = ['route-rendered', 'brand-fonts', 'brand-mark'] as const;
type CriticalId = (typeof CRITICAL)[number];

/** Smoothing time-constant for the visual progress interpolation. */
const SMOOTH_TAU_MS = 150;
/**
 * Floor on how fast the drawn value may travel, as a fraction per ms — a
 * full-length sweep in 900ms. The exponential ease alone has a very long
 * tail, which reads as the bar stalling just short of a milestone; this
 * keeps it moving. It is always clamped to the real readiness ratio, so it
 * can still never run ahead of what has actually loaded.
 */
const MIN_RATE_PER_MS = 1 / 900;
/**
 * Grace period after full readiness before the reveal is forced without the
 * frame loop's say-so. requestAnimationFrame is paused in background tabs,
 * so a site opened in one would otherwise sit at its last drawn value until
 * the 6s failsafe.
 */
const COMPLETION_WATCHDOG_MS = 800;

/**
 * Readiness and presentation are two separate clocks.
 *
 * `PROGRESS_PACE_MS` is the fastest the *drawn* line is allowed to travel
 * its full length. The drawn value is always `min(realReadiness, pace)` —
 * the lesser of what has actually loaded and what the pace permits — so it
 * can lag real readiness but can never lead it. On a warm load the pace is
 * the binding constraint and the line sweeps over ~1.5s; on a slow load
 * readiness is binding and the pace is irrelevant.
 *
 * Pacing the travel rather than parking a finished bar at 100% is the
 * deliberate choice here: readiness at 300ms with a hard 1700ms gate would
 * mean ~1400ms of a motionless full line, which reads as a hang, not as
 * cinema. This way the whole window is spent moving.
 */
const PROGRESS_PACE_MS = 1650;
/**
 * The minimum-visual-duration gate. The reveal begins only once BOTH the
 * line has reached 100% (i.e. everything critical is genuinely ready) AND
 * this much time has passed since boot. It never drives progress and never
 * delays a slow load — by the time a slow load is ready this has long since
 * elapsed, so it imposes nothing.
 */
const MIN_DISPLAY_MS = 1650;
/** Reduced motion: the same gate, much shorter — the brief is less motion. */
const MIN_DISPLAY_MS_REDUCED = 700;
/** How long "Ready" holds before the panels part. Also covers the seam's extension. */
const READY_HOLD_MS = 200;
/** Panel-split duration; must match .boot-panel's transition in CSS. */
const REVEAL_MS = 700;
/** Reduced-motion: a short crossfade instead of the split. */
const REVEAL_MS_REDUCED = 220;
/**
 * Failsafe only. If a critical signal never arrives (dead network mid-boot,
 * a font host that hangs), the user is let through anyway. This is not the
 * normal path to 100% — reaching it is logged in dev.
 */
const FAILSAFE_MS = 6000;

/**
 * Owns the boot readiness model: which critical resources have resolved,
 * the smoothed value the UI draws, and the phase machine that runs the
 * reveal. Deliberately holds no DOM of its own beyond the `data-boot`
 * attribute on <html>, which is how the homepage's own entrance animation
 * is triggered without touching the homepage template.
 *
 * Nothing here runs on the server: `start()` is a no-op outside the
 * browser, so the server-rendered markup is the static first frame.
 */
@Injectable({ providedIn: 'root' })
export class BootExperienceService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private subscriptions: Subscription[] = [];
  private doc = inject(DOCUMENT);

  private readonly resolved = signal<readonly CriticalId[]>([]);
  private readonly startedAt = signal(0);

  readonly phase = signal<BootPhase>('booting');

  /**
   * What the user sees: percentage, line fill, travelling dot and status
   * label all read from this one value, so they can never disagree.
   *
   * It is a presentation value, not a measurement. It eases toward
   * `realProgress` under a pacing ceiling and is clamped to it, so it may
   * lag reality but can never overstate it. Starts at 0 on both server and
   * client, which is also the static first frame.
   */
  readonly visualProgress = signal(0);

  readonly criticalResourcesTotal = CRITICAL.length;
  readonly criticalResourcesLoaded = computed(() => this.resolved().length);

  /**
   * The truth: completed critical resources over total. Never smoothed,
   * never paced, never faked. Legitimately steps 0 → 0.33 → 1, and on a
   * warm cache can go 0 → 1 almost at once.
   */
  readonly realProgress = computed(() => this.resolved().length / CRITICAL.length);

  /** Everything critical has genuinely loaded. */
  readonly applicationReady = computed(() => this.realProgress() === 1);

  /** The percentage shown. Derived from the visual value, never the real one. */
  readonly percent = computed(() => Math.min(100, Math.round(this.visualProgress() * 100)));

  /**
   * Three states, derived from what is actually happening — not a scripted
   * sequence of invented backend names.
   */
  readonly label = computed(() => {
    const phase = this.phase();
    if (phase === 'ready' || phase === 'revealing' || phase === 'complete') return 'Ready';

    // Banded by the drawn value, so the wording moves with the line instead
    // of flickering on every signal. The wording stays deliberately generic:
    // the boot screen has no idea what a "database" is doing, so it does not
    // claim to.
    const pct = this.percent();
    if (pct <= 20) return 'Initialising';
    if (pct <= 45) return 'Loading experience';
    if (pct <= 70) return 'Preparing content';
    if (pct <= 90) return 'Building experience';
    if (pct < 100) return 'Almost ready';
    return 'Ready';
  });

  readonly reducedMotion = signal(false);
  /** True once the boot layer may leave the DOM entirely. */
  readonly complete = computed(() => this.phase() === 'complete');

  private rafId = 0;
  private lastFrame = 0;
  private tickerId?: ReturnType<typeof setInterval>;
  private completionWatchdog?: ReturnType<typeof setTimeout>;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private started = false;

  /**
   * The boot experience belongs to application boot — every full page load
   * and hard refresh — and nothing else.
   *
   * It used to be suppressed after the first load of a browser session.
   * That interacted badly with the server-rendered first frame: the static
   * HTML paints the boot layer at "Initialising 0%", so a suppressed run
   * showed that frozen frame until hydration and then snapped it away,
   * which read as the progress jumping straight to completion. Running
   * every load is both simpler and what actually gets seen.
   *
   * Internal router navigation is unaffected either way: this service is a
   * root singleton and its component is created once per application boot,
   * so navigating between routes never replays anything.
   */
  shouldRun(): boolean {
    return true;
  }

  /**
   * Development affordance so the sequence can be replayed without clearing
   * session storage, and so the slow paths are reachable without a throttled
   * network:
   *
   *   ?bootPreview=1      replay at normal speed
   *   ?bootPreview=slow   hold the critical assets back by 1400ms
   *   ?bootPreview=4000   hold them back by an arbitrary number of ms, to
   *                       exercise slow-3G and the 6s failsafe
   *
   * Inert in production builds.
   */
  private previewMode(): 'off' | 'on' {
    if (!isDevMode() || !isPlatformBrowser(this.platformId)) return 'off';
    return new URL(this.doc.location.href).searchParams.get('bootPreview') ? 'on' : 'off';
  }

  /**
   * Artificial delay applied to the asset signals in dev preview only. This
   * delays *genuine* signals rather than inventing progress — the readiness
   * model is unchanged, the resources simply arrive later.
   */
  private previewDelayMs(): number {
    if (this.previewMode() === 'off') return 0;
    const value = new URL(this.doc.location.href).searchParams.get('bootPreview')!;
    if (value === 'slow') return 1400;
    const n = Number(value);
    return Number.isFinite(n) && n > 1 ? n : 0;
  }

  private afterPreviewDelay(run: () => void): void {
    const delay = this.previewDelayMs();
    if (!delay) {
      run();
      return;
    }
    this.timers.push(setTimeout(run, delay));
  }

  start(): void {
    if (!isPlatformBrowser(this.platformId) || this.started) return;
    this.started = true;

    const win = this.doc.defaultView!;
    this.reducedMotion.set(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    this.startedAt.set(win.performance.now());
    this.setBootAttribute('booting');

    this.trackRouteRendered();
    this.trackFonts();
    this.trackBrandMark();

    this.timers.push(
      setTimeout(() => {
        if (this.phase() === 'booting' || this.phase() === 'loading') {
          if (isDevMode()) {
            console.warn(
              '[boot] failsafe reached — unresolved critical signals:',
              CRITICAL.filter((id) => !this.resolved().includes(id)),
            );
          }
          this.forceReady();
        }
      }, FAILSAFE_MS),
    );

    // Dev only: lets the readiness model be inspected from the console
    // (`__bootState()`), on any load rather than only preview loads.
    if (isDevMode()) {
      (win as unknown as Record<string, unknown>)['__bootState'] = () => ({
        phase: this.phase(),
        resolved: [...this.resolved()],
        target: this.realProgress(),
        display: this.visualProgress(),
        elapsed: Math.round(win.performance.now() - this.startedAt()),
      });
    }

    this.trace(`progress pumps started (critical set: ${CRITICAL.join(', ')})`);
    this.startPumps();
  }

  /**
   * Marks a critical signal done. Idempotent, and tolerant by design: a
   * signal that *failed* still resolves here rather than trapping the
   * visitor behind the loader — a missing webfont or logo is a degraded
   * first paint, not a reason to withhold the site.
   */
  private resolve(id: CriticalId): void {
    if (this.resolved().includes(id)) return;
    this.resolved.update((ids) => [...ids, id]);
    this.trace(
      `resource complete: ${id} — ${this.resolved().length}/${CRITICAL.length} (${Math.round(this.realProgress() * 100)}%)`,
    );
    if (this.phase() === 'booting' && this.resolved().includes('route-rendered')) {
      this.phase.set('loading');
      this.setBootAttribute('loading');
    }
    if (this.realProgress() === 1) this.armCompletionWatchdog();
  }

  /**
   * Net for the case where the frame loop can't observe completion itself —
   * in a background tab rAF simply doesn't run. Everything is genuinely
   * ready at this point; this only decides who notices.
   */
  private armCompletionWatchdog(): void {
    if (this.completionWatchdog) return;
    const win = this.doc.defaultView!;
    const elapsed = win.performance.now() - this.startedAt();
    const wait = Math.max(0, this.minDisplayMs() - elapsed) + COMPLETION_WATCHDOG_MS;
    this.completionWatchdog = setTimeout(() => {
      this.visualProgress.set(1);
      this.beginReveal();
    }, wait);
    this.timers.push(this.completionWatchdog);
  }

  /** Development-only tracing. Never emits in a production build. */
  private trace(message: string): void {
    if (!isDevMode()) return;
    const win = this.doc.defaultView;
    const at = win ? Math.round(win.performance.now() - this.startedAt()) : 0;
    console.debug(`[BOOT ${at}ms] ${message}`);
  }

  /** The minimum-visual-duration gate, shortened when motion is unwelcome. */
  private minDisplayMs(): number {
    return this.reducedMotion() ? MIN_DISPLAY_MS_REDUCED : MIN_DISPLAY_MS;
  }

  /**
   * "The entry route is rendered."
   *
   * This deliberately does NOT use ApplicationRef.whenStable(). Zone
   * stability requires no pending macrotasks, and this app has a permanent
   * one: app-animated-background runs a continuous requestAnimationFrame
   * loop on the homepage hero. Depending on whether that loop started
   * before the first stable moment, whenStable() either resolved instantly
   * or never — which is exactly the non-determinism that made the boot
   * duration erratic (and, in the never case, sent every visitor to the 6s
   * failsafe).
   *
   * Completed navigation plus a paint is the signal actually wanted: the
   * lazy route chunk has loaded, its component is instantiated, and the
   * browser has put a frame on screen. It is unaffected by background
   * animation loops.
   */
  private trackRouteRendered(): void {
    const done = () => this.afterNextPaint(() => this.resolve('route-rendered'));

    // Hydration can complete the initial navigation before this runs.
    if (this.router.navigated) {
      done();
      return;
    }
    const sub = this.router.events
      .pipe(
        filter(
          (e) =>
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError,
        ),
        take(1),
      )
      // A failed or cancelled navigation still releases the loader: a
      // routing error is the router's problem to show, not grounds to hold
      // the visitor behind a boot screen.
      .subscribe(() => done());
    this.subscriptions.push(sub);
  }

  /**
   * Resolves after the browser has had a chance to paint the new view —
   * racing a timer against the frames, because a backgrounded tab fires no
   * animation frames at all. Without the timer, a visitor who opens the
   * site in a background tab would never satisfy this signal and would sit
   * on the failsafe path.
   */
  private afterNextPaint(run: () => void): void {
    const win = this.doc.defaultView!;
    let fired = false;
    const once = () => {
      if (fired) return;
      fired = true;
      run();
    };
    win.requestAnimationFrame(() => win.requestAnimationFrame(once));
    this.timers.push(setTimeout(once, 120));
  }

  private trackFonts(): void {
    const fonts = (this.doc as Document).fonts;
    if (!fonts?.load) {
      this.resolve('brand-fonts');
      return;
    }
    Promise.all([fonts.load('800 1rem Montserrat'), fonts.load('500 1rem Montserrat')])
      .then(() => this.afterPreviewDelay(() => this.resolve('brand-fonts')))
      .catch(() => this.afterPreviewDelay(() => this.resolve('brand-fonts')));
  }

  /**
   * Which lockup the boot screen will actually paint. This must resolve the
   * theme the same way the component stylesheet's cascade does — default
   * light, prefers-color-scheme override, explicit data-theme override,
   * mirroring tokens.css — or this would warm the cache for one variant
   * while CSS paints the other.
   *
   * It reads `data-theme` (set by index.html before first paint) rather
   * than ThemeService, because ThemeService defaults to 'dark' until its
   * browser-side constructor has read localStorage.
   */
  private brandMarkUrl(win: Window): string {
    const attr = this.doc.documentElement.dataset['theme'];
    const dark =
      attr === 'dark' ||
      (attr !== 'light' && (win.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false));
    return dark ? '/logo-lockup-compact-dark.png' : '/logo-lockup-compact.png';
  }

  private trackBrandMark(): void {
    const win = this.doc.defaultView as (Window & typeof globalThis) | null;
    if (!win?.Image) {
      this.resolve('brand-mark');
      return;
    }
    const img = new win.Image();
    const done = () => this.afterPreviewDelay(() => this.resolve('brand-mark'));
    img.onload = () => {
      // decode() keeps the first paint of the mark off the critical path's
      // main-thread jank; its absence is not an error worth blocking on.
      (img.decode?.() ?? Promise.resolve()).then(done, done);
    };
    img.onerror = done;
    img.src = this.brandMarkUrl(win);
    // A cached image can already be complete by the time the handlers are
    // attached, in which case `load` never fires again.
    if (img.complete) done();
  }

  /**
   * Visual interpolation layer. The drawn value chases the honest readiness
   * ratio with an exponential ease, so a 0 → 0.33 → 1 signal sequence reads
   * as continuous travel rather than three jumps — without ever showing a
   * number ahead of real readiness.
   */
  private frame(now: number): void {
    if (this.phase() === 'ready' || this.phase() === 'revealing' || this.phase() === 'complete') {
      return;
    }
    // Integration is purely a function of elapsed wall-clock time, never of
    // how many times this is called — so the frame pump and the timer pump
    // below can both drive it without the value advancing twice as fast.
    const dt = this.lastFrame ? Math.min(64, now - this.lastFrame) : 16;
    if (dt <= 0) return;
    this.lastFrame = now;

    const elapsed = now - this.startedAt();
    const real = this.realProgress();
    const current = this.visualProgress();

    // The ceiling is the lesser of two clocks:
    //
    //   real   what has genuinely loaded. A hard cap — this is what stops
    //          the line running ahead of reality on a slow connection.
    //   paced  how far the presentation is allowed to have travelled by
    //          now. Smoothstep, so it departs and arrives eased rather
    //          than ramping like a metronome.
    //
    // On a warm load `real` is 1 almost immediately and `paced` governs:
    // the line still takes its full sweep, which is the exit animation for
    // a page that is already rendered underneath. On a slow load `real`
    // governs and the line genuinely waits where it is.
    const t = Math.min(1, elapsed / PROGRESS_PACE_MS);
    const paced = t * t * (3 - 2 * t);
    const ceiling = Math.min(real, paced);

    const eased = current + (ceiling - current) * (1 - Math.exp(-dt / SMOOTH_TAU_MS));
    this.visualProgress.set(
      Math.max(current, Math.min(ceiling, Math.max(eased, current + dt * MIN_RATE_PER_MS))),
    );

    // Three independent conditions, all required. The application being
    // ready is not enough, and neither is the clock.
    const revealAllowed =
      this.applicationReady() && this.visualProgress() >= 1 && elapsed >= this.minDisplayMs();
    if (revealAllowed) this.beginReveal();
  }

  /**
   * Two pumps drive the interpolation, because neither alone is reliable.
   *
   * requestAnimationFrame gives frame-aligned smoothness but is paused
   * outright whenever the document is hidden — a backgrounded tab, a
   * minimised window, another desktop. Relying on it alone is what left the
   * line pinned at 0% until the watchdog slammed it to 100%.
   *
   * The interval is the floor: throttled in background tabs, but it always
   * fires eventually. Since `frame()` integrates by timestamp, both pumps
   * driving at once is harmless.
   */
  private startPumps(): void {
    const win = this.doc.defaultView!;
    const pump = () => {
      this.frame(win.performance.now());
      if (this.rafId) this.rafId = win.requestAnimationFrame(pump);
    };
    this.rafId = win.requestAnimationFrame(pump);
    this.tickerId = setInterval(() => this.frame(win.performance.now()), 1000 / 30);
  }

  /** Failsafe path: stop pretending to measure and let the visitor through. */
  private forceReady(): void {
    this.visualProgress.set(1);
    this.beginReveal();
  }

  private beginReveal(): void {
    if (this.phase() === 'ready' || this.phase() === 'revealing' || this.phase() === 'complete')
      return;
    this.stopLoop();
    this.phase.set('ready');
    this.setBootAttribute('ready');

    const reduced = this.reducedMotion();
    // Even with reduced motion the READY state is briefly legible; it is a
    // state change, not an animation.
    const hold = reduced ? 150 : READY_HOLD_MS;
    const reveal = reduced ? REVEAL_MS_REDUCED : REVEAL_MS;

    this.timers.push(
      setTimeout(() => {
        this.phase.set('revealing');
        this.setBootAttribute('revealing');
        this.timers.push(
          setTimeout(() => {
            this.phase.set('complete');
            this.setBootAttribute('complete');
            this.dispose();
          }, reveal),
        );
      }, hold),
    );
  }

  /** Lets the boot layer be skipped outright (already seen, or no-JS parity). */
  skip(): void {
    this.started = true;
    this.visualProgress.set(1);
    this.phase.set('complete');
    this.setBootAttribute('complete');
    this.dispose();
  }

  private setBootAttribute(phase: BootPhase): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.doc.documentElement.dataset['boot'] = phase;
  }

  private stopLoop(): void {
    if (this.rafId) {
      this.doc.defaultView?.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.tickerId !== undefined) {
      clearInterval(this.tickerId);
      this.tickerId = undefined;
    }
  }

  /** No animation frames, timers or listeners survive the reveal. */
  dispose(): void {
    this.stopLoop();
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    for (const s of this.subscriptions) s.unsubscribe();
    this.subscriptions = [];
  }
}
