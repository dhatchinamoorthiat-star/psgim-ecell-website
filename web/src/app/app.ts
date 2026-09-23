import { Component } from '@angular/core';
import { PageShellComponent } from './layout/page-shell/page-shell.component';

@Component({
  imports: [PageShellComponent],
  selector: 'app-root',
  template: `<app-page-shell></app-page-shell>`,
})
export class App {}
