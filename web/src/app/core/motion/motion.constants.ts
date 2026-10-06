export const DURATION = {
  FAST: 0.18,
  STANDARD: 0.3,
  EMPHASIS: 0.45,
  EDITORIAL: 0.65,
} as const;

export const DISTANCE = {
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
} as const;

export const EASING = {
  OUT: [0.16, 1, 0.3, 1] as const,
  IN_OUT: [0.65, 0, 0.35, 1] as const,
  SPRING: { stiffness: 300, damping: 25 },
} as const;

export const STAGGER = {
  FAST: 0.04,
  STANDARD: 0.07,
  RESTRAINED: 0.09,
} as const;
