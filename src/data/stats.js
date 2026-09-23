import { necTeamSize } from "./team.js";

/**
 * The four figures on the homepage.
 *
 * `count` is the number the counter animates to. Omit it for a figure that is
 * not a number ("NEC", "2019") and the value is simply typeset.
 */
export const stats = [
  { value: "2019", label: "Established", count: null },
  { value: String(necTeamSize), label: "Active members", count: necTeamSize },
  { value: "12+", label: "Events a year", count: 12, suffix: "+" },
  { value: "NEC", label: "2026 · Registered", count: null },
];

/**
 * The NEC outreach drive: where the Cell stands against the targets it set.
 *
 * These are self-reported working figures, not audited numbers, and the
 * template labels them as such. Update `now` weekly.
 */
export const drive = {
  note: "Self-reported working figures · baseline recorded September 2026 · targets end of October",
  pending: true,
  targets: [
    {
      label: "Instagram",
      now: 108,
      target: 3000,
      detail: "Reels, founder stories and event recaps; collaborations with other college E-Cells.",
    },
    {
      label: "LinkedIn",
      now: 414,
      target: 3000,
      detail: "The priority channel for NEC — every activity documented and tagged.",
    },
    {
      label: "Documented events",
      now: 6,
      target: 12,
      detail: "Each with date, footfall, photos and outcome, published on this site.",
    },
  ],
};
