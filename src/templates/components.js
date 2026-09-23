/**
 * Reusable presentation primitives.
 *
 * Nothing here knows about a specific page. Pages compose these; content comes
 * from src/data. That separation is the point: a copy change is a data edit, a
 * design change is a change here or in the stylesheet, and the two do not
 * collide.
 */

import { esc, attr, cx, map, when, initials, slugify, formatDate, longDate } from "./html.js";
import { arrow, arrowUpRight, initiativeIcon } from "./icons.js";

/* ── Button ─────────────────────────────────────────────────────────────── */

/**
 * variant: "primary" | "secondary" | "ghost"
 * The arrow is a separate span so the stylesheet can slide it on hover
 * without moving the label — see `.btn .arr` in components.css.
 */
export function button({ label, href, variant = "primary", size, external = false, arrow: withArrow = true, className, attrs = "" }) {
  const glyph = external ? arrowUpRight : arrow;
  const rel = external ? ` target="_blank" rel="noopener noreferrer"` : "";
  const tag = href ? "a" : "button";
  const href_ = href ? ` href="${attr(href)}"` : ` type="submit"`;
  return `<${tag} class="${cx("btn", `btn--${variant}`, size && `btn--${size}`, className)}"${href_}${rel}${attrs ? " " + attrs : ""}>
  <span class="btn__label">${esc(label)}</span>${when(withArrow, `<span class="btn__arr" aria-hidden="true">${glyph}</span>`)}${when(external, `<span class="sr-only"> (opens in a new tab)</span>`)}
</${tag}>`;
}

/** A quiet inline link with the underline that draws in from the left. */
export function moreLink({ label, href, external = false }) {
  const rel = external ? ` target="_blank" rel="noopener noreferrer"` : "";
  return `<a class="more" href="${attr(href)}"${rel}><span>${esc(label)}</span><span class="more__arr" aria-hidden="true">${external ? arrowUpRight : arrow}</span>${when(external, `<span class="sr-only"> (opens in a new tab)</span>`)}</a>`;
}

/* ── Chips and flags ────────────────────────────────────────────────────── */

export function chip(label, tone) {
  return `<span class="${cx("chip", tone && `chip--${tone}`)}">${esc(label)}</span>`;
}

/**
 * The honesty marker. Any figure, date or quote the team has not confirmed
 * carries one of these, so nothing unverified can read as established fact.
 */
/**
 * `variant: "flag"` is the short uppercase label ("To be confirmed").
 * `variant: "note"` is a full sentence — set in sentence case, because a
 * sentence in tracked-out uppercase mono is unreadable and shouts.
 */
export function pendingFlag(text = "To be confirmed", variant) {
  const kind = variant ?? (String(text).length > 28 ? "note" : "flag");
  return `<span class="${cx("pending", kind === "note" && "pending--note")}"><span class="pending__dot" aria-hidden="true"></span>${esc(text)}</span>`;
}

/** A panel that stands in for a section whose real content is not ready. */
export function awaitingPanel({ heading, body }) {
  return `<div class="awaiting">
  <p class="awaiting__head">${esc(heading)}</p>
  <p class="awaiting__body">${esc(body)}</p>
</div>`;
}

/* ── Page hero ──────────────────────────────────────────────────────────── */

/** The opening band on every page except the homepage. */
export function pageHero({ kicker, title, lede, note }) {
  return `<section class="page-hero">
  <div class="wrap">
    <div class="page-hero__inner">
      <p class="kicker">${esc(kicker)}</p>
      <h1>${esc(title)}</h1>
      ${when(lede, `<p class="page-hero__lede">${esc(lede)}</p>`)}
      ${when(note, `<p>${pendingFlag(note)}</p>`)}
    </div>
  </div>
</section>`;
}

/* ── Section heading ────────────────────────────────────────────────────── */

/**
 * The standard section opener: eyebrow, heading, optional standfirst, optional
 * link. `id` gives the section a stable anchor and labels it for assistive
 * technology.
 */
export function sectionHead({ kicker, heading, body, link, id, align, note }) {
  const headingId = id ? `${id}-heading` : slugify(heading ?? kicker ?? "section");
  return `<div class="${cx("section-head", align === "center" && "section-head--center")}">
  ${when(kicker, `<p class="kicker">${esc(kicker)}</p>`)}
  ${when(heading, `<h2 class="section-head__title" id="${attr(headingId)}">${esc(heading)}</h2>`)}
  ${when(body, `<p class="section-head__body">${esc(body)}</p>`)}
  ${when(note, `<p class="section-head__note">${pendingFlag(note)}</p>`)}
  ${when(link, () => moreLink(link))}
</div>`;
}

/** Wrap a section. `reveal` opts the block into the scroll-entrance animation. */
export function section({ id, tone, className, inner, labelledBy, reveal = true }) {
  const label = labelledBy ?? (id ? `${id}-heading` : null);
  return `<section class="${cx("block", tone && `block--${tone}`, className)}"${id ? ` id="${attr(id)}"` : ""}${label ? ` aria-labelledby="${attr(label)}"` : ""}${reveal ? ` data-reveal` : ""}>
  <div class="wrap">${inner}</div>
</section>`;
}

/* ── Numbers ────────────────────────────────────────────────────────────── */

/**
 * A figure that counts up when it scrolls into view.
 *
 * The final value is always in the markup, so the number is correct with
 * JavaScript disabled, mid-animation, and for a screen reader — the script
 * only ever replaces text it is about to restore.
 */
export function stat({ value, label, count, suffix = "", accent = false }) {
  const anim = count != null ? ` data-count="${attr(count)}" data-suffix="${attr(suffix)}"` : "";
  return `<div class="${cx("stat", accent && "stat--accent")}">
  <div class="stat__value"${anim}>${esc(value)}</div>
  <div class="stat__label">${esc(label)}</div>
</div>`;
}

/* ── Avatar ─────────────────────────────────────────────────────────────── */

/**
 * A person's portrait, or their initials if we do not have one.
 *
 * `exists` is resolved at build time from the files actually present in
 * src/public — so this emits either a real <img> or a text avatar, never a
 * broken image and never an <img hidden> waiting on a script.
 */
export function avatar({ name, src, exists, size }) {
  if (exists) {
    return `<span class="${cx("avatar", size && `avatar--${size}`)}"><img src="${attr(src)}" alt="${attr(name)}" loading="lazy" decoding="async" width="160" height="160"></span>`;
  }
  return `<span class="${cx("avatar", "avatar--initials", size && `avatar--${size}`)}" aria-hidden="true">${esc(initials(name))}</span>`;
}

/* ── People ─────────────────────────────────────────────────────────────── */

export function personCard({ name, role, org, photo, exists, lead = false }) {
  return `<li class="${cx("person", lead && "person--lead")}">
  ${avatar({ name, src: `/team/${photo}`, exists })}
  <span class="person__name">${esc(name)}</span>
  ${when(role, `<span class="person__role">${esc(role)}</span>`)}
  ${when(org, `<span class="person__org">${esc(org)}</span>`)}
</li>`;
}

/* ── Initiative ─────────────────────────────────────────────────────────── */

/**
 * The interactive initiative row. Collapsed it shows index, title and tag;
 * hover or keyboard focus expands it to reveal the summary and slides the
 * accent rule across. The whole row is one link, so there is a single tab stop
 * and one obvious target on touch.
 */
export function initiativeRow(item) {
  const href = item.href ?? `/initiatives/#${item.id}`;
  const meta = [item.cadence, item.venue].filter(Boolean).join(" · ");
  return `<li class="init-row" data-stage="${attr(item.stage)}">
  <a class="init-row__link" href="${attr(href)}">
    <span class="init-row__index" aria-hidden="true">${esc(item.index)}</span>
    <span class="init-row__main">
      <span class="init-row__title">${esc(item.title)}</span>
      <!-- The inner span is required, not decorative: the collapse animates
           grid-template-rows 0fr → 1fr, which only collapses to zero if the
           row's content is an element that can be clipped. -->
      <span class="init-row__summary"><span>${esc(item.summary)}</span></span>
    </span>
    <span class="init-row__meta">
      <span class="init-row__tag">${esc(item.tag)}</span>
      ${when(meta, `<span class="init-row__when">${esc(meta)}</span>`)}
    </span>
    <span class="init-row__arr" aria-hidden="true">${arrow}</span>
  </a>
  <span class="init-row__rule" aria-hidden="true"></span>
</li>`;
}

/** The full-detail block used on /initiatives/. */
export function initiativeDetail(item) {
  const meta = [item.cadence, item.venue].filter(Boolean).join(" · ");
  return `<article class="init-detail" id="${attr(item.id)}" aria-labelledby="${attr(item.id)}-heading">
  <div class="init-detail__aside">
    <span class="init-detail__index" aria-hidden="true">${esc(item.index)}</span>
    <span class="init-detail__icon" aria-hidden="true">${initiativeIcon[item.id] ?? ""}</span>
  </div>
  <div class="init-detail__body">
    <p class="kicker">${esc(item.tag)}${when(meta, ` · ${esc(meta)}`)}</p>
    <h2 id="${attr(item.id)}-heading">${esc(item.title)}</h2>
    <p class="init-detail__lede">${esc(item.summary)}</p>
    <p>${esc(item.body)}</p>
    ${moreLink({ label: item.href ? "See the campaign" : "Get involved", href: item.href ?? "/contact/" })}
  </div>
</article>`;
}

/* ── Events ─────────────────────────────────────────────────────────────── */

/**
 * One event. `past` is computed by the caller from the date, never authored,
 * so a chip cannot go stale the way the previous site's hand-written
 * "Upcoming" labels did.
 */
export function eventItem(e, { past = false, detailed = false } = {}) {
  const d = formatDate(e.date);
  const chips = [
    past ? chip("Completed") : chip("Upcoming", "live"),
    e.registration === "open" ? chip("Registration open", "accent") : null,
    e.audience ? chip(e.audience) : null,
    e.venue ? chip(e.venue) : null,
  ]
    .filter(Boolean)
    .join("");
  const trailing = past ? e.turnout : e.time;
  return `<li class="${cx("event", past && "event--past")}">
  <time class="event__date" datetime="${attr(e.date)}">
    <span class="event__day">${esc(d.day)}</span>
    <span class="event__month">${esc(d.month)}</span>
    <span class="event__year">${esc(d.year)}</span>
  </time>
  <div class="event__body">
    <div class="event__chips">${chips}</div>
    <h3 class="event__title">${esc(e.title)}</h3>
    ${when(detailed && e.summary, `<p class="event__summary">${esc(e.summary)}</p>`)}
    <p class="sr-only">${esc(longDate(e.date))}</p>
  </div>
  ${when(trailing, `<div class="event__meta">${esc(trailing)}</div>`)}
</li>`;
}

/* ── Gallery ────────────────────────────────────────────────────────────── */

/**
 * A gallery tile. With a real photograph it becomes a lightbox trigger; with
 * no file on disk it is a plainly-labelled placeholder that is not clickable
 * and not announced as an image.
 */
export function galleryTile(item, index) {
  const src = `/gallery/${item.file}`;
  if (!item.exists) {
    return `<li class="tile tile--empty tile--${attr(item.ratio)}" data-album="${attr(item.album)}">
  <span class="tile__caption">${esc(item.caption)}</span>
  <span class="tile__flag">Photo to come</span>
</li>`;
  }
  return `<li class="tile tile--${attr(item.ratio)}" data-album="${attr(item.album)}">
  <button class="tile__btn" type="button" data-lightbox="${index}" data-src="${attr(src)}" data-caption="${attr(item.caption)}">
    <img src="${attr(src)}" alt="${attr(item.caption)}" loading="lazy" decoding="async">
    <span class="tile__caption">${esc(item.caption)}</span>
  </button>
</li>`;
}
