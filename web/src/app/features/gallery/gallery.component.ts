import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { albums, gallery, galleryNote } from '../../core/data/gallery.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective],
  templateUrl: './gallery.component.html',
})
export class GalleryComponent implements OnInit {
  albums = albums;
  all = gallery;
  galleryNote = galleryNote;

  readonly activeAlbum = signal('all');
  readonly lightboxIndex = signal<number | null>(null);

  @ViewChild('lightbox') lightboxRef?: ElementRef<HTMLDialogElement>;

  readonly filtered = computed(() => {
    const a = this.activeAlbum();
    return a === 'all' ? this.all : this.all.filter((g) => g.album === a);
  });

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Gallery',
      description: galleryNote,
      path: '/gallery/',
    });
  }

  setAlbum(id: string): void {
    this.activeAlbum.set(id);
  }

  open(index: number): void {
    this.lightboxIndex.set(index);
    this.lightboxRef?.nativeElement.showModal();
  }

  close(): void {
    this.lightboxRef?.nativeElement.close();
    this.lightboxIndex.set(null);
  }

  next(): void {
    const list = this.filtered();
    const i = this.lightboxIndex();
    if (i === null) return;
    this.lightboxIndex.set((i + 1) % list.length);
  }

  prev(): void {
    const list = this.filtered();
    const i = this.lightboxIndex();
    if (i === null) return;
    this.lightboxIndex.set((i - 1 + list.length) % list.length);
  }

  @HostListener('document:keydown.arrowRight')
  onRight(): void {
    if (this.lightboxIndex() !== null) this.next();
  }

  @HostListener('document:keydown.arrowLeft')
  onLeft(): void {
    if (this.lightboxIndex() !== null) this.prev();
  }

  current() {
    const i = this.lightboxIndex();
    return i === null ? null : this.filtered()[i];
  }

  total(): number {
    return this.filtered().length;
  }
}
