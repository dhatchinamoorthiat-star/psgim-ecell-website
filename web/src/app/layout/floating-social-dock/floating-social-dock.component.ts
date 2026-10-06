import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface DockItem {
  id: string;
  label: string;
  ariaLabel: string;
  href?: string;
  routerLink?: string;
  isExternal: boolean;
  icon: 'instagram' | 'linkedin' | 'youtube' | 'join' | 'nec';
}

@Component({
  selector: 'app-floating-social-dock',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './floating-social-dock.component.html',
  styleUrl: './floating-social-dock.component.css',
})
export class FloatingSocialDockComponent {
  readonly items: DockItem[] = [
    {
      id: 'instagram',
      label: 'Instagram',
      ariaLabel: 'Follow PSGIM E-Cell on Instagram (opens in new tab)',
      href: 'https://www.instagram.com/psgim_ecell/',
      isExternal: true,
      icon: 'instagram',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      ariaLabel: 'Connect with PSGIM E-Cell on LinkedIn (opens in new tab)',
      href: 'https://www.linkedin.com/company/e-cell-psgim/',
      isExternal: true,
      icon: 'linkedin',
    },
    {
      id: 'youtube',
      label: 'YouTube',
      ariaLabel: 'Subscribe to PSGIM E-Cell on YouTube (opens in new tab)',
      href: 'https://youtube.com/@psgimecell',
      isExternal: true,
      icon: 'youtube',
    },
    {
      id: 'join',
      label: 'Join Us',
      ariaLabel: 'Join PSGIM E-Cell team and community',
      routerLink: '/contact/',
      isExternal: false,
      icon: 'join',
    },
    {
      id: 'nec',
      label: 'NEC 2026',
      ariaLabel: 'Explore National Entrepreneurship Challenge 2026',
      routerLink: '/nec/',
      isExternal: false,
      icon: 'nec',
    },
  ];
}
