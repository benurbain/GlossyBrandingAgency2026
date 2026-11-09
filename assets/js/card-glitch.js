/* Glossy card glitch (2026-11-09).
   Case cards rest in full colour. On hover the image takes a short "metal RGB"
   hit: it snaps to hard black and white, the red and blue channels pull apart,
   a few bands jump sideways and a gloss streak passes. Then it lands back in
   colour. Black and white stays the brand, colour stays the work.

   Applies to every .project card with a <figure> holding an <img> or <video>.
   Mouse: on hover. Keyboard: on focus. Touch: once, when the card scrolls
   into view. Nothing happens under prefers-reduced-motion.
   Drawing only, no pixel reads, so video from another origin works as is.
   A video that has not loaded yet is drawn from its poster. */
(function () {
  'use strict';

  var SELECTOR = '.project';
  var LOOK = { duration: 460, shift: 0.022, slices: 3, sliceShift: 0.06, metal: 0.62, sheen: 0.28 };
  var STEP = 55; // ms per glitch "frame": stepped on purpose, never smooth
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var store = new WeakMap();

  function buffer() { return document.createElement('canvas'); }

  function Glitch(card) {
    this.card = card;
    this.figure = card.querySelector('figure');
    this.media = this.figure && this.figure.querySelector('img, video');
    this.raf = 0;
    this.played = false;
    if (!this.media) return;
    this.frame = this.frame.bind(this);
    // Keep the poster at hand for videos that are still loading or paused off-screen.
    if (this.media.tagName === 'VIDEO' && this.media.poster) {
      this.poster = new Image();
      this.poster.decoding = 'async';
      this.poster.src = this.media.poster;
    }
  }

  // Whatever can be drawn right now: the playing video, its poster, or the image.
  Glitch.prototype.source = function () {
    var m = this.media;
    if (!m) return null;
    if (m.tagName === 'VIDEO') {
      if (m.readyState >= 2 && m.videoWidth > 0) return m;
      var p = this.poster;
      return p && p.complete && p.naturalWidth > 0 ? p : null;
    }
    return m.complete && m.naturalWidth > 0 ? m : null;
  };

  Glitch.prototype.build = function () {
    if (this.canvas) return;
    this.canvas = buffer();
    this.canvas.className = 'glitch-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.figure.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.src = buffer(); this.r = buffer(); this.g = buffer(); this.b = buffer();
  };

  Glitch.prototype.run = function () {
    if (this.raf || reduce.matches || !this.source()) return false;
    var rect = this.figure.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    this.build();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    [this.canvas, this.src, this.r, this.g, this.b].forEach(function (c) { c.width = w; c.height = h; });
    this.w = w; this.h = h;
    this.start = performance.now();
    this.step = null;
    this.played = true;
    this.canvas.style.opacity = '1';
    this.raf = requestAnimationFrame(this.frame);
    return true;
  };

  Glitch.prototype.stop = function () {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.canvas) this.canvas.style.opacity = '0';
  };

  // Draw the media into the buffer the way object-fit: cover does.
  Glitch.prototype.grab = function (metal) {
    var m = this.source();
    if (!m) throw new Error('no source');
    var w = this.w, h = this.h;
    var mw = m.videoWidth || m.naturalWidth, mh = m.videoHeight || m.naturalHeight;
    var scale = Math.max(w / mw, h / mh);
    var dw = mw * scale, dh = mh * scale;
    var c = this.src.getContext('2d');
    c.globalCompositeOperation = 'source-over';
    c.drawImage(m, (w - dw) / 2, (h - dh) / 2, dw, dh);
    if (metal) {
      c.globalCompositeOperation = 'saturation';   // colour out
      c.fillStyle = '#808080';
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'overlay';       // contrast in
      c.drawImage(this.src, 0, 0);
    }
    c.globalCompositeOperation = 'source-over';
  };

  Glitch.prototype.split = function () {
    var w = this.w, h = this.h, src = this.src;
    [[this.r, '#f00'], [this.g, '#0f0'], [this.b, '#00f']].forEach(function (pair) {
      var c = pair[0].getContext('2d');
      c.globalCompositeOperation = 'source-over';
      c.drawImage(src, 0, 0);
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = pair[1];
      c.fillRect(0, 0, w, h);
    });
  };

  // A drawing error must never leave a card covered.
  Glitch.prototype.frame = function (now) {
    try { this.draw(now); } catch (err) { this.stop(); }
  };

  Glitch.prototype.draw = function (now) {
    // The requestAnimationFrame timestamp can sit just before the start time.
    var elapsed = Math.max(0, now - this.start), t = elapsed / LOOK.duration;
    if (t >= 1) { this.stop(); return; }
    var step = Math.floor(elapsed / STEP);
    var live = this.source().tagName === 'VIDEO';
    var metal = t < LOOK.metal;

    if (step !== this.step) {
      this.step = step;
      var decay = Math.pow(1 - t, 1.4);
      var amp = this.w * LOOK.shift * decay;
      this.dx = { r: -amp * (0.55 + Math.random() * 0.45), b: amp * (0.55 + Math.random() * 0.45) };
      this.bands = [];
      var n = metal ? Math.round(LOOK.slices * (0.5 + Math.random() * 0.5)) : (Math.random() < 0.5 ? 1 : 0);
      for (var i = 0; i < n; i++) {
        var bh = this.h * (0.03 + Math.random() * 0.12);
        this.bands.push({
          y: Math.random() * (this.h - bh), h: bh,
          dx: (Math.random() < 0.5 ? -1 : 1) * this.w * LOOK.sliceShift * decay * (0.4 + Math.random() * 0.6)
        });
      }
      this.sheenX = t / Math.max(LOOK.metal, 0.01);
      if (!live) { this.grab(metal); this.split(); }
    }
    if (live) { this.grab(metal); this.split(); }

    var ctx = this.ctx, w = this.w, h = this.h, over = Math.ceil(w * 0.06), self = this;
    function channels(sy, sh, shift) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, sy, w, sh);
      ctx.globalCompositeOperation = 'lighter';
      [[self.r, self.dx.r], [self.g, 0], [self.b, self.dx.b]].forEach(function (p) {
        // drawn slightly wider so shifted channels leave no dark edge
        ctx.drawImage(p[0], 0, sy, w, sh, -over + p[1] + shift, sy, w + over * 2, sh);
      });
    }
    channels(0, h, 0);
    this.bands.forEach(function (band) { channels(Math.round(band.y), Math.round(band.h), band.dx); });

    if (metal && LOOK.sheen > 0) {        // the gloss streak
      var x = (this.sheenX * 1.6 - 0.3) * w, sw = w * 0.22;
      var grad = ctx.createLinearGradient(x - sw, 0, x + sw, h * 0.35);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,' + LOOK.sheen + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';
    this.raf = requestAnimationFrame(this.frame);
  };

  function get(card) {
    var g = store.get(card);
    if (!g) { g = new Glitch(card); store.set(card, g); }
    return g;
  }
  function cardOf(target) {
    return target && target.closest ? target.closest(SELECTOR) : null;
  }

  function init() {
    if (reduce.matches) return;
    var hovered = null;

    // Delegated, so cards revealed later ("Show more", carousels) work without re-binding.
    document.addEventListener('pointerover', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse' && !fine.matches) return;
      var card = cardOf(e.target);
      if (card === hovered) return;
      hovered = card;
      if (card) get(card).run();
    });
    document.addEventListener('pointerout', function (e) {
      if (hovered && !(e.relatedTarget && hovered.contains(e.relatedTarget))) hovered = null;
    });
    document.addEventListener('focusin', function (e) {
      var card = cardOf(e.target);
      if (card && card.matches(':focus-visible')) get(card).run();
    });

    if (!('IntersectionObserver' in window)) return;
    // Near the viewport: get the poster ready. Touch only: play once when the card is in view.
    var touch = !fine.matches;
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var g = get(entry.target);
        if (!touch) { seen.unobserve(entry.target); return; }
        if (entry.intersectionRatio >= 0.6 && !g.played && g.run()) seen.unobserve(entry.target);
      });
    }, { rootMargin: touch ? '0px' : '300px 0px', threshold: touch ? [0, 0.6] : 0 });
    [].forEach.call(document.querySelectorAll(SELECTOR), function (card) { seen.observe(card); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
