import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { site } from '../../core/data/site.data';
import { SeoService } from '../../core/services/seo.service';
import { ContactApiService, ContactApiError } from '../../core/services/contact-api.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective, AwaitingPanelComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent implements OnInit {
  site = site;

  private seo = inject(SeoService);
  private api = inject(ContactApiService);

  // When the form was rendered, so a submit faster than a human can read and
  // type is a signal worth sending to the backend's own anti-spam check
  // (apps/contact/serializers.py MIN_FILL_SECONDS) — mirroring it client-side
  // catches nothing on its own; the server re-checks regardless.
  private renderedAt = Date.now();

  submitting = signal(false);
  sent = signal(false);
  error = signal<string | null>(null);
  fieldErrors = signal<Record<string, string[]>>({});

  ngOnInit(): void {
    this.seo.set({
      title: 'Contact',
      description: 'Get in touch with PSGIM E-Cell.',
      path: '/contact/',
    });
  }

  async onSubmit(form: HTMLFormElement): Promise<void> {
    if (this.submitting()) return;
    const data = new FormData(form);
    this.error.set(null);
    this.fieldErrors.set({});
    this.submitting.set(true);
    try {
      await this.api.submit({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        subject: String(data.get('subject') ?? ''),
        message: String(data.get('message') ?? ''),
        website: String(data.get('website') ?? ''),
        elapsed_ms: Date.now() - this.renderedAt,
      });
      this.sent.set(true);
      form.reset();
    } catch (e) {
      const err = e as ContactApiError;
      this.fieldErrors.set(err.fields ?? {});
      this.error.set(
        Object.keys(err.fields ?? {}).length ? null : err.message || 'Could not send your message.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
