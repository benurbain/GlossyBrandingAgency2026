(function () {
  var nav = document.querySelector('[data-nav]');
  if (!nav) return;

  var toggle = nav.querySelector('.nav__toggle');
  var links = nav.querySelectorAll('.nav__link');

  function setOpen(open) {
    nav.setAttribute('data-open', String(open));
    toggle.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('nav-open', open);
  }

  toggle.addEventListener('click', function () {
    setOpen(nav.getAttribute('data-open') !== 'true');
  });

  links.forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });
})();

(function () {
  if (!window.lottie) return;

  document.querySelectorAll('[data-lottie]').forEach(function (element) {
    var animation = window.lottie.loadAnimation({
      container: element,
      renderer: 'svg',
      loop: true,
      autoplay: element.dataset.lottieAutoplay !== 'false',
      path: document.body.classList.contains('nav-invert') && element.dataset.lottieWhite
        ? element.dataset.lottieWhite
        : element.dataset.lottie
    });

    animation.addEventListener('DOMLoaded', function () {
      var fallback = element.querySelector('.lottie-fallback');
      if (fallback) fallback.remove();
      element.dataset.ready = 'true';
    });

    element._animation = animation;
  });
})();

/* Shared card geometry and trigger behaviour: Home, case carousel and docs.
   The same anchor keeps its footprint for mouse, keyboard and touch. */
(function () {
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var groups = Array.from(document.querySelectorAll('.work-grid,.news-grid,.service-grid,.case-carousel__track'));
  var frame;
  function measure() {
    groups.forEach(function (group) {
      var cards = Array.from(group.children).filter(function (card) {
        return card.matches('.project,.news-grid>a,.service-grid>article,.lab-service-card');
      });
      if (!cards.length || !group.offsetWidth) return;
      cards.forEach(function (card) { card.classList.add('card-measuring'); });
      var natural = cards.map(function (card) { return card.offsetHeight; });
      cards.forEach(function (card) { card.classList.add('card-measuring-inset'); });
      var heights = cards.map(function (card, i) { return Math.max(natural[i], card.offsetHeight); });
      // Carousel and editorial rows align; wide project heroes retain their own ratio.
      var equal = group.matches('.case-carousel__track,.news-grid,.service-grid') && getComputedStyle(group).gridTemplateColumns.split(' ').length > 1;
      if (group.matches('.case-carousel__track')) equal = true;
      var maximum = Math.max.apply(null, heights);
      cards.forEach(function (card, i) {
        card.style.setProperty('--card-height', (equal ? maximum : heights[i]) + 'px');
        card.setAttribute('data-card-ready', '');
        card.classList.remove('card-measuring', 'card-measuring-inset');
      });
    });
  }
  function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); }
  document.querySelectorAll('.service-grid article').forEach(function (card) {
    var trigger = card.querySelector(':scope > .text-link');
    if (!trigger) return;
    trigger.addEventListener('pointerenter', function () {
      if (fine.matches) card.classList.add('service-hover-active');
    });
    card.addEventListener('pointerleave', function () { card.classList.remove('service-hover-active'); });
  });
  fine.addEventListener('change', function () {
    document.querySelectorAll('.service-hover-active').forEach(function (card) { card.classList.remove('service-hover-active'); });
  });
  window.GlossyLab03 = { measureCards: measure };
  measure();
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  if (document.fonts) document.fonts.ready.then(schedule);
  // Covers documentation panels changing width without a viewport resize.
  if ('ResizeObserver' in window) {
    var widths = new WeakMap();
    var observer = new ResizeObserver(function (entries) {
      var changed = false;
      entries.forEach(function (entry) {
        if (widths.get(entry.target) !== entry.contentRect.width) {
          widths.set(entry.target, entry.contentRect.width); changed = true;
        }
      });
      if (changed) schedule();
    });
    groups.forEach(function (group) { observer.observe(group); });
  }
})();

/* Keep poster frames and layout available when motion is reduced. */
(function () {
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function sync() {
    document.querySelectorAll('video[autoplay]').forEach(function (video) {
      if (reduced.matches && !video.hasAttribute('data-always-animate')) video.pause();
      else { var play = video.play(); if (play && play.catch) play.catch(function () {}); }
    });
  }
  sync();
  reduced.addEventListener('change', sync);
})();
