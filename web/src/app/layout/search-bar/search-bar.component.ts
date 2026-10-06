import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { searchIndex } from '../../core/data/search.data';
import { SearchEntry } from '../../core/models/models';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-bar.component.html',
})
export class SearchBarComponent {
  private router = inject(Router);

  readonly query = signal('');
  readonly isOverlayOpen = signal(false);
  readonly activeIndex = signal(0);

  @ViewChild('input') inputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('modalRoot') modalRootRef?: ElementRef<HTMLElement>;

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    const scored = searchIndex
      .map((entry) => ({ entry, score: this.score(entry, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((r) => r.entry);
  });

  private score(entry: SearchEntry, q: string): number {
    const label = entry.label.toLowerCase();
    if (label === q) return 100;
    if (label.startsWith(q)) return 80;
    if (label.includes(q)) return 60;
    for (const k of entry.keywords) {
      const kw = k.toLowerCase();
      if (kw === q) return 50;
      if (kw.startsWith(q)) return 40;
      if (kw.includes(q)) return 20;
    }
    return 0;
  }

  openSearch(): void {
    this.isOverlayOpen.set(true);
    setTimeout(() => {
      this.inputRef?.nativeElement.focus();
    }, 50);
  }

  closeSearch(): void {
    this.isOverlayOpen.set(false);
    this.query.set('');
    this.activeIndex.set(0);
  }

  toggleSearch(): void {
    if (this.isOverlayOpen()) {
      this.closeSearch();
    } else {
      this.openSearch();
    }
  }

  onInput(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
    if (!this.isOverlayOpen()) {
      this.openSearch();
    }
  }

  select(href: string): void {
    this.router.navigateByUrl(href);
    this.closeSearch();
  }

  onKeydown(event: KeyboardEvent): void {
    const list = this.results();
    if (event.key === 'Escape') {
      this.closeSearch();
      return;
    }
    if (list.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.set((this.activeIndex() + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.set((this.activeIndex() - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (list[this.activeIndex()]) {
        this.select(list[this.activeIndex()].href);
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOverlayOpen()) {
      this.closeSearch();
    }
  }
}
