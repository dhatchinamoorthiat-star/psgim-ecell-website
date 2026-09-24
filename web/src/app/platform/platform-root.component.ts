import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

/**
 * Wraps every /platform screen: loads the platform stylesheet (only here, so
 * the public site never downloads it) and marks the pages noindex
 * (principle 20; also enforced by _headers and robots.txt).
 */
@Component({
  selector: 'app-platform-root',
  imports: [RouterOutlet],
  template: `<div class="pf-root"><router-outlet /></div>`,
  styleUrl: './platform.css',
  encapsulation: ViewEncapsulation.None,
})
export class PlatformRootComponent implements OnInit, OnDestroy {
  private meta = inject(Meta);

  ngOnInit(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  ngOnDestroy(): void {
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
