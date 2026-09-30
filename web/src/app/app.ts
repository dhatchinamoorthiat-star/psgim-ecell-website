import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SplashScreenComponent } from './shared/ui/splash-screen.component';

@Component({
  imports: [RouterOutlet, SplashScreenComponent],
  selector: 'app-root',
  template: `<ui-splash-screen></ui-splash-screen><router-outlet></router-outlet>`,
})
export class App {}
