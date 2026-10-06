import { Directive, ElementRef, Input, afterNextRender, inject } from '@angular/core';
import { scroll, animate } from 'motion';
import { MotionService } from '../motion.service';

@Directive({
  selector: '[appParallax]',
  standalone: true,
})
export class ParallaxDirective {
  @Input() parallaxSpeed = -30;

  private el = inject(ElementRef<HTMLElement>);
  private motionService = inject(MotionService);

  constructor() {
    afterNextRender(() => {
      if (!this.motionService.shouldAnimate()) {
        return;
      }

      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return;
      }

      const host = this.el.nativeElement;

      const stop = scroll(
        animate(host, { y: [0, this.parallaxSpeed] }),
        { target: host }
      );

      return () => stop();
    });
  }
}
