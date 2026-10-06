import { Component, PLATFORM_ID, computed, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BootExperienceComponent } from './shared/ui/boot-experience/boot-experience.component';
import { BootExperienceService } from './core/services/boot-experience.service';

/**
 * The boot layer renders ahead of the router outlet and belongs to the
 * initial application boot only — internal navigation never re-creates it.
 *
 * While it is on screen the outlet is `inert`, so the links behind the
 * overlay can't be tab-focused; the attribute is only ever applied in the
 * browser (the service's phase stays 'complete'-equivalent on the server),
 * which keeps the prerendered HTML fully interactive without JS.
 */
@Component({
  imports: [RouterOutlet, BootExperienceComponent],
  selector: 'app-root',
  template: `
    <ui-boot-experience></ui-boot-experience>
    <div [attr.inert]="outletInert()"><router-outlet></router-outlet></div>
  `,
  styles: [':host > div { display: contents; }'],
})
export class App {
  private boot = inject(BootExperienceService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly outletInert = computed(() => {
    // Never inert in server-rendered HTML: if the JS bundle never loads at
    // all, the prerendered page must stay usable (the boot layer itself is
    // cleared by its own CSS failsafe in that case).
    if (!this.isBrowser) return null;
    const phase = this.boot.phase();
    return phase === 'booting' || phase === 'loading' || phase === 'ready' ? '' : null;
  });
}
