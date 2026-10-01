export type BackgroundVariant = 'hero' | 'default' | 'platform' | 'events' | 'minimal';

export interface BackgroundConfig {
  variant: BackgroundVariant;
  particleCount?: number;
  showGrid?: boolean;
  showNetwork?: boolean;
  enableMouseInteraction?: boolean;
}

export interface VariantPreset {
  nodeCountDesktop: number;
  nodeCountMobile: number;
  linkDistance: number;
  speed: number;
  showGrid: boolean;
  enableMouseInteraction: boolean;
  pulseChance: number;
}

/**
 * One preset per background variant (section 7/18 of the background spec).
 * `pulseChance` is the per-frame probability a node briefly flashes —
 * tuned low so pulses read as occasional "opportunity" moments, not noise.
 */
export const VARIANT_PRESETS: Record<BackgroundVariant, VariantPreset> = {
  hero: { nodeCountDesktop: 34, nodeCountMobile: 12, linkDistance: 150, speed: 0.1, showGrid: false, enableMouseInteraction: true, pulseChance: 0.0015 },
  default: { nodeCountDesktop: 16, nodeCountMobile: 7, linkDistance: 130, speed: 0.06, showGrid: false, enableMouseInteraction: false, pulseChance: 0.0008 },
  platform: { nodeCountDesktop: 26, nodeCountMobile: 9, linkDistance: 120, speed: 0.05, showGrid: true, enableMouseInteraction: false, pulseChance: 0.001 },
  events: { nodeCountDesktop: 30, nodeCountMobile: 11, linkDistance: 140, speed: 0.14, showGrid: false, enableMouseInteraction: false, pulseChance: 0.002 },
  minimal: { nodeCountDesktop: 0, nodeCountMobile: 0, linkDistance: 0, speed: 0, showGrid: false, enableMouseInteraction: false, pulseChance: 0 },
};
