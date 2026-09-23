import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, HostListener, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { nav, primaryCta, site } from '../../core/data/site.data';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  nav = nav;
  primaryCta = primaryCta;
  site = site;

  private theme = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);
  private resizeHandler = () => this.onResize();

  readonly isStuck = signal(false);
  readonly mobileOpen = signal(false);
  private ticking = false;

  get themeMode() {
    return this.theme.mode();
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  themeLabel(): string {
    const eff = this.theme.effective();
    return eff === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.isStuck.set(window.scrollY > 8);
      this.ticking = false;
    });
  }

  private onResize(): void {
    if (window.innerWidth > 992 && this.mobileOpen()) {
      this.closeMobile();
    }
  }

  openMobile(): void {
    this.mobileOpen.set(true);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileOpen()) this.closeMobile();
  }
}
