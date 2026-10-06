import { Directive, ElementRef, Input, afterNextRender, inject } from '@angular/core';
import { inView, animate, stagger } from 'motion';
import { MotionService } from '../motion.service';
import { DISTANCE, DURATION, EASING, STAGGER } from '../motion.constants';

@Directive({
  selector: '[appStagger]',
  standalone: true,
})
export class StaggerDirective {
  @Input() childSelector = '> *';
  // Explicitly `number`, not the inferred literal type. `STAGGER`, `DISTANCE`
  // and `DURATION` are declared `as const`, so without these annotations each
  // input's type narrows to the single default value it happens to hold
  // (e.g. `0.07`) and no caller can pass anything else — which made these
  // inputs un-settable despite being declared as inputs.
  @Input() staggerInterval: number = STAGGER.STANDARD;
  @Input() staggerDistance: number = DISTANCE.MD;
  @Input() staggerDuration: number = DURATION.STANDARD;

  private el = inject(ElementRef<HTMLElement>);
  private motionService = inject(MotionService);

  constructor() {
    afterNextRender(() => {
      if (!this.motionService.shouldAnimate()) {
        return;
      }

      const host = this.el.nativeElement;
      const children = Array.from(host.querySelectorAll(this.childSelector)) as HTMLElement[];

      if (children.length === 0) return;

      const stop = inView(
        host,
        () => {
          animate(
            children,
            { opacity: [0, 1], y: [this.staggerDistance, 0] },
            {
              duration: this.staggerDuration,
              delay: stagger(this.staggerInterval),
              ease: EASING.OUT as any,
            },
          );
          return () => {};
        },
        { amount: 0.1 },
      );

      return () => stop();
    });
  }
}
