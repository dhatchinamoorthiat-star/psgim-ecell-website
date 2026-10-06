import { Directive, ElementRef, Input, afterNextRender, inject } from '@angular/core';
import { inView, animate } from 'motion';
import { MotionService } from '../motion.service';
import { DISTANCE, DURATION, EASING } from '../motion.constants';

@Directive({
  selector: '[revealOnScroll]',
  standalone: true,
})
export class RevealOnScrollDirective {
  @Input() revealDistance = DISTANCE.MD;
  @Input() revealDuration = DURATION.STANDARD;
  @Input() revealDelay = 0;

  private el = inject(ElementRef<HTMLElement>);
  private motionService = inject(MotionService);

  constructor() {
    afterNextRender(() => {
      if (!this.motionService.shouldAnimate()) {
        return;
      }

      const host = this.el.nativeElement;

      const stop = inView(
        host,
        () => {
          animate(
            host,
            { opacity: [0, 1], y: [this.revealDistance, 0] },
            {
              duration: this.revealDuration,
              delay: this.revealDelay,
              ease: EASING.OUT as any,
            },
          );
          return () => {};
        },
        { amount: 0.15 },
      );

      return () => stop();
    });
  }
}
