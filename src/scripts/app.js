/**
 * PSGIM E-Cell — client behaviour.
 *
 * No framework and no dependencies. Everything here is an enhancement: the
 * site is complete and usable before this file runs, and every feature checks
 * that its own markup is present before doing anything.
 *
 * Scroll work is done in IntersectionObservers and rAF-throttled handlers, and
 * only ever writes transform/opacity or a custom property — never a value that
 * forces layout.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ── Theme ──────────────────────────────────────────────────────────────
     The stored choice is applied by the inline script in <head>; this only
     handles the toggle and keeps the button's label truthful. */

  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    var resolved = function () {
      return root.dataset.theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    };
    var label = function () {
      themeBtn.setAttribute("aria-label", resolved() === "dark" ? "Switch to light theme" : "Switch to dark theme");
    };
    label();
    themeBtn.addEventListener("click", function () {
      root.dataset.theme = resolved() === "dark" ? "light" : "dark";
      try { localStorage.setItem("ecell-theme", root.dataset.theme); } catch (e) {}
      label();
    });
  }

  /* ── Header state and scroll progress ───────────────────────────────── */

  var header = document.getElementById("siteHeader");
  var progress = document.getElementById("scrollProgress");
  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        header.classList.toggle("is-stuck", y > 8);
        if (progress) {
          var max = document.documentElement.scrollHeight - window.innerHeight;
          progress.style.setProperty("--progress", max > 0 ? Math.min(y / max, 1).toFixed(4) : 0);
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  /* ── Mobile navigation ──────────────────────────────────────────────────
     A panel, not a menu: it traps nothing, closes on Escape, on a link, and
     on a resize back to the desktop layout, and it restores focus. */

  var navBtn = document.getElementById("navBtn");
  var siteNav = document.getElementById("siteNav");
  if (navBtn && siteNav) {
    var setNav = function (open) {
      if (open && header) {
        // Measure where the header actually ends. With the notice bar on
        // screen that is lower than the header's own height, and once the
        // page has scrolled it is exactly the header height again.
        root.style.setProperty("--nav-top", Math.round(header.getBoundingClientRect().bottom) + "px");
      }
      document.body.classList.toggle("nav-open", open);
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
      navBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    navBtn.addEventListener("click", function () {
      setNav(!document.body.classList.contains("nav-open"));
    });
    siteNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
        setNav(false);
        navBtn.focus();
      }
    });
    // Leaving the mobile breakpoint with the panel open would otherwise leave
    // `overflow: hidden` on the body and the page unscrollable.
    var desktop = window.matchMedia("(min-width: 62rem)");
    var onBreak = function (e) { if (e.matches) setNav(false); };
    desktop.addEventListener ? desktop.addEventListener("change", onBreak) : desktop.addListener(onBreak);
  }

  /* ── Section reveal ─────────────────────────────────────────────────────
     One observer for every block. Each unobserves itself after firing, so a
     long page does not keep dozens of callbacks alive. */

  var reveals = document.querySelectorAll("[data-reveal]");
  if (reveals.length) {
    if (!("IntersectionObserver" in window) || reduceMotion.matches) {
      reveals.forEach(function (el) { el.setAttribute("data-revealed", ""); });
    } else {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.setAttribute("data-revealed", "");
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
      );
      reveals.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  /* ── Count-up figures ───────────────────────────────────────────────────
     The final value is already in the DOM. The counter borrows the element
     for the duration of the animation and puts the real text back at the end,
     so the number is correct if the animation is interrupted, and a screen
     reader is never read a running total. */

  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && !reduceMotion.matches && "IntersectionObserver" in window) {
    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          countObserver.unobserve(el);

          var end = parseInt(el.getAttribute("data-count"), 10);
          if (isNaN(end)) return;
          var suffix = el.getAttribute("data-suffix") || "";
          var final = el.textContent;
          el.setAttribute("aria-label", final);
          // The element is relabelled, so its changing text is not announced.
          el.setAttribute("aria-hidden", "true");

          var start = null;
          var duration = 900;
          var tick = function (now) {
            if (start === null) start = now;
            var p = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(end * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
            else {
              el.textContent = final;
              el.removeAttribute("aria-hidden");
              el.removeAttribute("aria-label");
            }
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* ── The arc ────────────────────────────────────────────────────────────
     The signature interaction: the thread fills as the section passes the
     middle of the viewport, and each stage lights up as the fill reaches it.
     Writes one custom property and toggles one class — no layout reads in the
     scroll handler beyond a single cached rect per frame. */

  var arc = document.querySelector("[data-arc]");
  if (arc) {
    var stages = Array.prototype.slice.call(arc.querySelectorAll(".arc__stage"));
    var line = arc.querySelector(".arc__line");

    if (reduceMotion.matches) {
      // No travelling fill; the stages are simply all on.
      if (line) line.style.setProperty("--arc-progress", 1);
      stages.forEach(function (s) { s.classList.add("is-on"); });
    } else {
      var arcTicking = false;
      var updateArc = function () {
        if (arcTicking) return;
        arcTicking = true;
        requestAnimationFrame(function () {
          var rect = arc.getBoundingClientRect();
          var anchor = window.innerHeight * 0.62;
          var p = (anchor - rect.top) / rect.height;
          p = Math.max(0, Math.min(1, p));
          if (line) line.style.setProperty("--arc-progress", p.toFixed(4));
          stages.forEach(function (stage, i) {
            stage.classList.toggle("is-on", p >= (i + 0.35) / stages.length);
          });
          arcTicking = false;
        });
      };
      updateArc();
      window.addEventListener("scroll", updateArc, { passive: true });
      window.addEventListener("resize", updateArc, { passive: true });
    }
  }

  /* ── Gallery filters ────────────────────────────────────────────────── */

  var filterBar = document.querySelector("[data-filters]");
  if (filterBar) {
    var tiles = document.querySelectorAll(".tiles .tile");
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter");
      if (!btn) return;
      var album = btn.getAttribute("data-album");
      filterBar.querySelectorAll(".filter").forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      tiles.forEach(function (tile) {
        var show = album === "all" || tile.getAttribute("data-album") === album;
        tile.hidden = !show;
      });
    });
  }

  /* ── Lightbox ───────────────────────────────────────────────────────────
     Built on <dialog>, so focus trapping, Escape and inertness come from the
     platform rather than from hand-written focus management. */

  var lightbox = document.getElementById("lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    var lbImg = lightbox.querySelector("img");
    var lbCaption = lightbox.querySelector("[data-lb-caption]");
    var lbCount = lightbox.querySelector("[data-lb-count]");
    var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
    var current = 0;

    var show = function (i) {
      // Wrap around, so the arrows never dead-end.
      current = (i + triggers.length) % triggers.length;
      var t = triggers[current];
      lbImg.src = t.getAttribute("data-src");
      lbImg.alt = t.getAttribute("data-caption");
      if (lbCaption) lbCaption.textContent = t.getAttribute("data-caption");
      if (lbCount) lbCount.textContent = current + 1 + " / " + triggers.length;
    };

    triggers.forEach(function (t, i) {
      t.addEventListener("click", function () {
        show(i);
        lightbox.showModal();
      });
    });

    lightbox.addEventListener("click", function (e) {
      var action = e.target.closest("[data-lb]");
      if (action) {
        var what = action.getAttribute("data-lb");
        if (what === "close") lightbox.close();
        if (what === "prev") show(current - 1);
        if (what === "next") show(current + 1);
        return;
      }
      // A click on the backdrop — outside the figure — closes.
      if (e.target === lightbox) lightbox.close();
    });

    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); show(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(current - 1); }
    });

    // Swipe, for phones.
    var x0 = null;
    lightbox.addEventListener("touchstart", function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 48) show(current + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }

  /* ── Prefetch on intent ─────────────────────────────────────────────────
     Same-origin pages are fetched when the pointer lands on the link, which
     on a static site of this size means navigation feels instant. */

  var prefetched = Object.create(null);
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1); };
  document.addEventListener(
    "pointerover",
    function (e) {
      var a = e.target.closest && e.target.closest('a[href^="/"]');
      if (!a || a.origin !== location.origin || a.hash || prefetched[a.href]) return;
      prefetched[a.href] = true;
      idle(function () {
        var link = document.createElement("link");
        link.rel = "prefetch";
        link.href = a.href;
        document.head.appendChild(link);
      });
    },
    { passive: true }
  );
})();
