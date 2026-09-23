/**
 * QR generator — /control/
 *
 * Runs entirely in the browser: the text never leaves the page. Encoding comes
 * from the vendored qrcode-generator (Kazuhiko Arase, MIT), loaded as a global
 * by the script tag before this one.
 *
 * Why the codes stay scannable with a logo on top:
 *
 *   - Error correction is always level H, which can reconstruct ~30% of a
 *     damaged code. The mark is damage, as far as a scanner is concerned.
 *   - The mark covers ~22% of the code's area — comfortably inside that 30%
 *     budget, with room left for real-world wear, glare and bad printing.
 *   - The code keeps its 4-module quiet zone. Scanners need that border; a QR
 *     cropped tight to its modules often fails.
 *
 * That combination is reliable, not guaranteed — which is why the page tells
 * you to test the finished code before printing it.
 */
(function () {
  "use strict";

  var text = document.getElementById("qrText");
  var sizeSel = document.getElementById("qrSize");
  var logoSel = document.getElementById("qrLogo");
  var canvas = document.getElementById("qrCanvas");
  var placeholder = document.getElementById("qrPlaceholder");
  var meta = document.getElementById("qrMeta");
  var downloadBtn = document.getElementById("qrDownload");
  var copyBtn = document.getElementById("qrCopy");

  // Every element must exist — this script only ships on /control/, but a
  // markup change shouldn't throw on an unrelated page.
  if (!text || !canvas || !window.qrcode) return;

  var ctx = canvas.getContext("2d");

  // The encoder defaults to a one-byte-per-character function, which silently
  // mangles anything outside ASCII — an em dash comes back as a control
  // character, and Tamil text is destroyed outright. Switching to the UTF-8
  // encoder it ships with is required, not optional: this site's own copy is
  // full of em dashes and curly quotes.
  if (window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs["UTF-8"]) {
    window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs["UTF-8"];
  }

  var INK = "#0a1b33";       // brand navy, the dark modules
  var PAPER = "#ffffff";     // must stay near-white: scanners need the contrast
  var QUIET = 4;             // quiet-zone modules, per the QR spec
  var LOGO_RATIO = 0.22;     // fraction of the code's width the mark covers

  /* The mark, loaded once. Until it arrives, codes render without it. */
  var logo = new Image();
  var logoReady = false;
  logo.onload = function () { logoReady = true; render(); };
  logo.src = "/logo@2x.png";

  var lastGood = null; // { count, size, label } for the status line

  function rounded(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function setState(ok, message) {
    if (meta) meta.textContent = message || "";
    canvas.hidden = !ok;
    if (placeholder) placeholder.hidden = ok;
    if (downloadBtn) downloadBtn.disabled = !ok;
    // Clipboard image writing is not available everywhere (notably Firefox
    // without a flag), so the button only enables where it actually works.
    if (copyBtn) copyBtn.disabled = !ok || !supportsCopy();
  }

  function supportsCopy() {
    return !!(navigator.clipboard && window.ClipboardItem && window.isSecureContext);
  }

  function render() {
    var value = text.value.trim();
    if (!value) {
      setState(false, "");
      lastGood = null;
      return;
    }

    var target = parseInt(sizeSel ? sizeSel.value : 1024, 10) || 1024;
    var withLogo = !logoSel || logoSel.value === "on";

    var qr;
    try {
      // typeNumber 0 = pick the smallest version that fits. "H" = 30% recovery.
      qr = window.qrcode(0, "H");
      qr.addData(value);
      qr.make();
    } catch (err) {
      // The only realistic failure is "too much data" — level H on the largest
      // version still tops out well under a kilobyte.
      setState(false, "That is too long to encode. Shorten the text, or link to a page that holds it.");
      lastGood = null;
      return;
    }

    var count = qr.getModuleCount();
    var total = count + QUIET * 2;

    // Whole-pixel modules only. A fractional module size makes neighbouring
    // modules land on different pixel boundaries, which is what produces the
    // faintly uneven codes that scanners struggle with.
    var scale = Math.max(1, Math.floor(target / total));
    var side = scale * total;

    canvas.width = side;
    canvas.height = side;

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, side, side);

    ctx.fillStyle = INK;
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale);
        }
      }
    }

    if (withLogo && logoReady) {
      var box = Math.round(count * LOGO_RATIO) * scale;
      var plate = box + scale * 2;              // a 1-module paper margin
      var px = Math.round((side - plate) / 2);
      var py = Math.round((side - plate) / 2);

      ctx.fillStyle = PAPER;
      rounded(ctx, px, py, plate, plate, Math.round(scale * 1.5));
      ctx.fill();

      // Contain-fit: the artwork is taller than it is wide, so height leads.
      var ratio = logo.naturalWidth / logo.naturalHeight;
      var h = box;
      var w = Math.round(h * ratio);
      if (w > box) { w = box; h = Math.round(w / ratio); }
      ctx.drawImage(logo, Math.round((side - w) / 2), Math.round((side - h) / 2), w, h);
    }

    canvas.setAttribute(
      "aria-label",
      "QR code for " + (value.length > 80 ? value.slice(0, 80) + "…" : value)
    );

    lastGood = { count: count, side: side, value: value };
    setState(
      true,
      side + " × " + side + " px · " + count + " × " + count + " modules · error correction H" +
        (withLogo && !logoReady ? " · mark still loading" : "")
    );
  }

  /** A filename from the content: the host for a URL, else the first words. */
  function filename() {
    if (!lastGood) return "qr-code";
    var v = lastGood.value;
    var base = v;
    try {
      if (/^https?:\/\//i.test(v)) {
        var u = new URL(v);
        base = u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "").replace(/\//g, "-");
      }
    } catch (e) { /* not a URL — fall through to the raw text */ }
    base = base
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 48)
      .replace(/^-+|-+$/g, "");
    return "ecell-qr-" + (base || "code");
  }

  var debounce;
  function schedule() {
    clearTimeout(debounce);
    debounce = setTimeout(render, 180);
  }

  text.addEventListener("input", schedule);
  if (sizeSel) sizeSel.addEventListener("change", render);
  if (logoSel) logoSel.addEventListener("change", render);

  // Quick-fill buttons
  document.querySelectorAll("[data-qr-preset]").forEach(function (b) {
    b.addEventListener("click", function () {
      text.value = b.getAttribute("data-qr-preset");
      text.focus();
      render();
    });
  });

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename() + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Revoking immediately can cancel the download in some browsers.
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      }, "image/png");
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      if (!supportsCopy()) return;
      canvas.toBlob(function (blob) {
        if (!blob) return;
        navigator.clipboard
          .write([new window.ClipboardItem({ "image/png": blob })])
          .then(function () {
            var label = copyBtn.querySelector(".btn__label");
            var original = label.textContent;
            label.textContent = "Copied";
            setTimeout(function () { label.textContent = original; }, 1600);
          })
          .catch(function () {
            if (meta) meta.textContent = "Copying failed — use Download instead.";
          });
      }, "image/png");
    });
  }

  /* ?q=… prefills the box, so a ready-made link can be shared with whoever is
     making the poster: /control/?q=https%3A%2F%2F… */
  try {
    var q = new URLSearchParams(location.search).get("q");
    if (q) {
      text.value = q;
      render();
      return;
    }
  } catch (e) { /* no URLSearchParams — fall through to the empty state */ }

  setState(false, "");
})();
