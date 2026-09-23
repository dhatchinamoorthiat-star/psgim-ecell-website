import { esc, attr, map } from "../templates/html.js";
import { pageHero, section, sectionHead, galleryTile } from "../templates/components.js";
import { gallery, albums, galleryNote } from "../data/gallery.js";
import { close, arrow } from "../templates/icons.js";

export default {
  slug: "/gallery/",
  title: "Gallery",
  description: "Photographs from PSGIM E-Cell sessions, bootcamps, the Ideathon and the NEC drive.",
  priority: "0.6",

  render({ assets }) {
    const items = gallery.map((g) => ({ ...g, exists: assets.has(`gallery/${g.file}`) }));
    const real = items.filter((i) => i.exists);

    // Only tiles with an actual photograph become lightbox triggers, and the
    // index passed to each must match its position among those — not its
    // position in the full grid — or the arrows would skip.
    let n = -1;
    const tiles = items.map((item) => galleryTile(item, item.exists ? ++n : -1)).join("");

    return [
      pageHero({
        kicker: "From the floor",
        title: "Gallery",
        lede: "Albums by event.",
        note: real.length === 0 ? galleryNote : null,
      }),

      section({
        inner: `<h2 class="sr-only">Filter by album</h2>
<div class="filters" data-filters>
  ${map(albums, (a, i) => `<button class="filter" type="button" data-album="${attr(a.id)}" aria-pressed="${i === 0 ? "true" : "false"}">${esc(a.label)}</button>`)}
</div>
<ul class="tiles">${tiles}</ul>`,
      }),

      // The lightbox lives outside the grid and is inert until opened.
      // <dialog> gives focus trapping, Escape and backdrop inertness for free.
      real.length
        ? `<dialog class="lightbox" id="lightbox" aria-label="Photograph viewer">
  <img alt="">
  <div class="lightbox__bar">
    <span data-lb-caption></span>
    <span class="lightbox__nav">
      <span data-lb-count style="align-self:center;margin-right:.5rem"></span>
      <button class="lightbox__btn" type="button" data-lb="prev" aria-label="Previous photograph"><span style="transform:rotate(180deg);display:inline-flex">${arrow}</span></button>
      <button class="lightbox__btn" type="button" data-lb="next" aria-label="Next photograph">${arrow}</button>
      <button class="lightbox__btn" type="button" data-lb="close" aria-label="Close viewer">${close}</button>
    </span>
  </div>
</dialog>`
        : "",
    ].join("\n");
  },
};
