import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, HostListener, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { nav, primaryCta, site } from '../../core/data/site.data';
import { NavItem } from '../../core/models/models';
import { ThemeService } from '../../core/services/theme.service';
import { SearchBarComponent } from '../search-bar/search-bar.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SearchBarComponent],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  nav = nav;
  primaryCta = primaryCta;
  site = site;

  private theme = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private resizeHandler = () => this.onResize();

  readonly scrollProgress = signal(0);
  readonly isStuck = signal(false);
  readonly mobileOpen = signal(false);
  readonly openDropdown = signal<string | null>(null);
  readonly openMobileGroup = signal<string | null>(null);
  
  private ticking = false;
  private closeTimer: any = null;
  private static readonly SHRINK_DISTANCE = 160;

  onMouseEnter(label: string): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.openDropdown.set(label);
  }

  onMouseLeave(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }
    this.closeTimer = setTimeout(() => {
      this.closeDropdown();
    }, 200);
  }

  toggleDropdown(label: string): void {
    if (this.openDropdown() === label) {
      this.closeDropdown();
    } else {
      this.onMouseEnter(label);
    }
  }

  closeDropdown(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.openDropdown.set(null);
  }

  onItemClick(): void {
    setTimeout(() => {
      this.closeDropdown();
    }, 100);
  }

  toggleMobileGroup(label: string): void {
    this.openMobileGroup.set(this.openMobileGroup() === label ? null : label);
  }

  isItemActive(item: NavItem): boolean {
    const currentUrl = this.router.url;
    if (item.children?.length) {
      return item.children.some((child) => {
        const path = child.href.split('#')[0].replace(/\/$/, '');
        return path !== '' && currentUrl.includes(path);
      }) || (item.href !== '/' && currentUrl.includes(item.href.replace(/\/$/, '')));
    }
    const path = item.href.split('#')[0].replace(/\/$/, '');
    if (!path || path === '') return currentUrl === '/';
    return currentUrl.includes(path);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openDropdown()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.navbar-nav-item')) {
      this.closeDropdown();
    }
  }

  get themeMode() {
    return this.theme.mode();
  }

  get effectiveTheme() {
    return this.theme.effective();
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  themeLabel(): string {
    const eff = this.theme.effective();
    return eff === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }

  get logoSrc(): string {
    return this.theme.effective() === 'dark' ? '/logo-lockup-compact-dark.png' : '/logo-lockup-compact.png';
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      const progress = Math.min(1, Math.max(0, window.scrollY / NavbarComponent.SHRINK_DISTANCE));
      this.scrollProgress.set(progress);
      this.isStuck.set(progress > 0);
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
    this.openMobileGroup.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileOpen()) this.closeMobile();
    if (this.openDropdown()) this.closeDropdown();
  }
}
