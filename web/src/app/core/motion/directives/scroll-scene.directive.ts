import { Directive, ElementRef, Input, afterNextRender, inject } from '@angular/core';
import { scroll, animate } from 'motion';
import { MotionService } from '../motion.service';

@Directive({
  selector: '[appScrollScene]',
  standalone: true,
})
export class ScrollSceneDirective {
  @Input() sceneTarget?: HTMLElement;

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

      // Scroll progress drives smooth scale 0.98 -> 1 and opacity scene entrance
      const stop = scroll(
        animate(host, {
          opacity: [0.3, 1, 1, 0.3],
          scale: [0.98, 1, 1, 0.98],
        }),
        { target: host, offset: ['start end', 'start center', 'end center', 'end start'] }
      );

      return () => stop();
    });
  }
}
