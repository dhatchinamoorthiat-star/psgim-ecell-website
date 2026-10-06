export type MotionType =
  | 'TYPE_A_PAGE_TRANSITION'
  | 'TYPE_B_ENTRANCE_REVEAL'
  | 'TYPE_C_SCROLL_TRIGGERED'
  | 'TYPE_D_SCROLL_LINKED'
  | 'TYPE_E_HOVER_INTERACTION'
  | 'TYPE_F_FEEDBACK_STATE'
  | 'TYPE_G_LOADING';

export interface RevealOptions {
  delay?: number;
  duration?: number;
  distance?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  once?: boolean;
}

export interface StaggerOptions {
  staggerInterval?: number;
  childSelector?: string;
  duration?: number;
  distance?: number;
}

export interface ParallaxOptions {
  speed?: number;
  axis?: 'y' | 'x';
}
