import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { blogs, blogsNote, sortBlogs } from '../../core/data/blogs.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';

@Component({
  selector: 'app-blogs',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective, PendingFlagComponent],
  templateUrl: './blogs.component.html',
})
export class BlogsComponent implements OnInit {
  blogsNote = blogsNote;
  posts = sortBlogs(blogs);

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Blogs',
      description: blogsNote,
      path: '/blogs/',
    });
  }
}
