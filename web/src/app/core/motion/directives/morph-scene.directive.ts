import { Directive, ElementRef, Input, afterNextRender, inject } from '@angular/core';
import { scroll, animate } from 'motion';
import { MotionService } from '../motion.service';

@Directive({
  selector: '[appMorphScene]',
  standalone: true,
})
export class MorphSceneDirective {
  @Input() morphAnchorSelector = '.section-heading, h2, .card';

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
      const anchors = Array.from(host.querySelectorAll(this.morphAnchorSelector)) as HTMLElement[];

      // Phase 1: Exit/Transform (0-30%), Phase 2: Morph/Overlap (30-70%), Phase 3: Settle (70-100%)
      const stopHost = scroll(
        animate(host, {
          opacity: [0.15, 1, 1, 0.15],
          scale: [0.95, 1, 1, 0.95],
          y: [32, 0, 0, -32],
        }),
        { target: host, offset: ['start end', 'start center', 'end center', 'end start'] }
      );

      const stops: Array<() => void> = [stopHost];

      anchors.slice(0, 3).forEach((anchor, i) => {
        const stopAnchor = scroll(
          animate(anchor, {
            y: [24 * (i + 1), 0, 0, -16 * (i + 1)],
            scale: [0.94, 1, 1, 1.02],
            opacity: [0, 1, 1, 0.4],
          }),
          { target: host, offset: ['start end', 'start center', 'end center', 'end start'] }
        );
        stops.push(stopAnchor);
      });

      return () => {
        stops.forEach((s) => s());
      };
    });
  }
}
