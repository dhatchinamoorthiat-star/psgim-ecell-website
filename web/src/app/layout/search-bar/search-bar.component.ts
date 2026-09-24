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
  readonly isOpen = signal(false);
  readonly activeIndex = signal(0);

  @ViewChild('input') inputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('root') rootRef?: ElementRef<HTMLElement>;

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

  onInput(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
    this.isOpen.set(true);
  }

  onFocus(): void {
    if (this.query().trim()) this.isOpen.set(true);
  }

  select(href: string): void {
    this.router.navigateByUrl(href);
    this.close();
  }

  close(): void {
    this.isOpen.set(false);
    this.query.set('');
    this.activeIndex.set(0);
  }

  onKeydown(event: KeyboardEvent): void {
    const list = this.results();
    if (!this.isOpen() || list.length === 0) {
      if (event.key === 'Escape') this.inputRef?.nativeElement.blur();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.set((this.activeIndex() + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.set((this.activeIndex() - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.select(list[this.activeIndex()].href);
    } else if (event.key === 'Escape') {
      this.close();
      this.inputRef?.nativeElement.blur();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.rootRef) return;
    if (!this.rootRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }
}
