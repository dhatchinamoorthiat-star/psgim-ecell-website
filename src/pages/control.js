import { esc, map } from "../templates/html.js";
import { pageHero, section, sectionHead, button, awaitingPanel } from "../templates/components.js";
import { site } from "../data/site.js";

/**
 * Control — the team's own tools.
 *
 * Unlisted rather than private: this is a static site with no server and no
 * accounts, so anyone who knows the URL can open it. It carries
 * `noindex: true`, which keeps it out of the sitemap, adds a robots meta tag
 * and adds a Disallow line to robots.txt — but that is discouragement, not
 * access control. Nothing here is sensitive: the QR generator runs entirely in
 * the browser and sends nothing anywhere.
 */
export default {
  slug: "/control/",
  title: "Control",
  description: "Internal tools for the PSGIM E-Cell team.",
  noindex: true,
  // Order matters — the encoder defines the global that qr.js then uses.
  scripts: ["/vendor/qrcode-generator.js", "/assets/qr.js"],

  render() {
    const sizes = [
      { v: 512, label: "512 px — screen, WhatsApp" },
      { v: 1024, label: "1024 px — slides, posters", selected: true },
      { v: 2048, label: "2048 px — large print" },
    ];

    return [
      pageHero({
        kicker: "Team tools",
        title: "Control",
        lede: "Utilities for the E-Cell core team. Unlisted, but not password-protected — don’t put anything confidential on this page.",
      }),

      section({
        id: "qr",
        inner: `${sectionHead({
          id: "qr",
          kicker: "QR codes",
          heading: "Generate a QR with the E-Cell mark",
          body: "Paste a link — a form, an event page, the Instagram profile — or any text. The code is generated in your browser; nothing is uploaded.",
        })}

<div class="qr">
  <div class="qr__panel">
    <div class="form">
      <label class="field">
        <span>Link or text</span>
        <textarea id="qrText" rows="3" spellcheck="false" autocomplete="off"
          placeholder="https://psgim-ecell.pages.dev/events/"></textarea>
      </label>

      <div class="qr__opts">
        <label class="field">
          <span>Export size</span>
          <select id="qrSize">
            ${map(sizes, (s) => `<option value="${s.v}"${s.selected ? " selected" : ""}>${esc(s.label)}</option>`)}
          </select>
        </label>
        <label class="field">
          <span>Centre mark</span>
          <select id="qrLogo">
            <option value="on" selected>With E-Cell mark</option>
            <option value="off">Plain code</option>
          </select>
        </label>
      </div>

      <div class="qr__presets">
        <span class="qr__presets-label">Quick fill</span>
        <button class="filter" type="button" data-qr-preset="${site.url}/">Website</button>
        <button class="filter" type="button" data-qr-preset="${site.url}/events/">Events</button>
        <button class="filter" type="button" data-qr-preset="${site.url}/nec/">NEC 2026</button>
        <button class="filter" type="button" data-qr-preset="${site.url}/contact/">Join the Cell</button>
      </div>

      <p class="form__note" id="qrNote">
        Codes use the highest error-correction level, so the mark in the middle
        does not stop them scanning. <b>Always test the finished code with a
        phone before it goes to print.</b>
      </p>
    </div>
  </div>

  <div class="qr__panel qr__panel--out">
    <div class="qr__stage">
      <canvas id="qrCanvas" width="512" height="512" role="img" aria-label="Generated QR code"></canvas>
      <p class="qr__placeholder" id="qrPlaceholder">Your code appears here</p>
    </div>
    <p class="qr__meta" id="qrMeta" role="status" aria-live="polite"></p>
    <div class="qr__actions">
      <button class="btn btn--accent" type="button" id="qrDownload" disabled>
        <span class="btn__label">Download PNG</span>
      </button>
      <button class="btn btn--secondary" type="button" id="qrCopy" disabled>
        <span class="btn__label">Copy image</span>
      </button>
    </div>
  </div>
</div>`,
      }),

      section({
        id: "more",
        tone: "tint",
        inner: `${sectionHead({
          id: "more",
          kicker: "Coming here next",
          heading: "Other team tools",
        })}
${awaitingPanel({
  heading: "Nothing else yet",
  body: "This page is where internal utilities live. If the team needs something else — an event-poster template filler, an attendance tally, a link shortener — it goes here rather than in a separate app.",
})}`,
      }),
    ].join("\n");
  },
};
