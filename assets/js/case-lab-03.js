(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!items.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-reveal-group]'));

  groups.forEach(function (group) {
    Array.prototype.slice.call(group.querySelectorAll('[data-reveal]')).forEach(function (item, index) {
      item.style.setProperty('--reveal-delay', Math.min(index * 50, 150) + 'ms');
    });
  });

  if (reduceMotion.matches) {
    document.querySelectorAll('video[autoplay]:not([data-always-animate])').forEach(function (video) {
      video.pause();
    });
  }

  document.body.classList.add('case-motion-ready');

  function reveal(item) {
    item.setAttribute('data-visible', 'true');
  }

  items.forEach(function (item) {
    var rect = item.getBoundingClientRect();
    if (rect.top < window.innerHeight * .92 && rect.bottom > 0) reveal(item);
  });

  if (!('IntersectionObserver' in window)) {
    items.forEach(reveal);
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: .06, rootMargin: '0px 0px -6% 0px' });

  items.forEach(function (item) {
    if (item.getAttribute('data-visible') !== 'true') observer.observe(item);
  });
})();

/* Native scrolling supports trackpad, touch and keyboard; arrows wrap the
   complete case collection without autoplay or duplicate slide links. */
(function () {
  var carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;
  var track = carousel.querySelector('.case-carousel__track');
  var cards = Array.from(track.children);
  var previous = carousel.querySelector('[data-previous]');
  var next = carousel.querySelector('[data-next]');
  var status = carousel.querySelector('[data-carousel-status]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var visible = 2;
  var targetIndex = 0;
  var resizeFrame;
  var scrollTimer;

  function offset(index) {
    return cards[index].getBoundingClientRect().left -
      track.getBoundingClientRect().left + track.scrollLeft;
  }

  function update() {
    var index = Math.round(track.scrollLeft / (cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap)));
    index = Math.max(0, Math.min(cards.length - visible, index));
    targetIndex = index;
    status.textContent = String(index + 1).padStart(2, '0') +
      (visible > 1 ? '–' + String(Math.min(index + visible, cards.length)).padStart(2, '0') : '') +
      ' / ' + cards.length;
    // Only the visible slides join the keyboard tab sequence.
    cards.forEach(function (card, i) {
      card.tabIndex = i >= index && i < index + visible ? 0 : -1;
    });
  }

  function move(direction) {
    var last = cards.length - visible;
    targetIndex = direction > 0
      ? (targetIndex >= last ? 0 : Math.min(last, targetIndex + visible))
      : (targetIndex <= 0 ? last : Math.max(0, targetIndex - visible));
    track.scrollTo({ left: offset(targetIndex), behavior: reduced.matches ? 'instant' : 'smooth' });
  }

  function measure() {
    visible = Number(getComputedStyle(track).getPropertyValue('--carousel-visible'));
    if (window.GlossyLab03) window.GlossyLab03.measureCards();
    targetIndex = Math.min(targetIndex, cards.length - visible);
    track.scrollTo({ left: offset(targetIndex), behavior: 'instant' });
    update();
  }

  previous.addEventListener('click', function () { move(-1); });
  next.addEventListener('click', function () { move(1); });
  track.addEventListener('keydown', function (event) {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  track.addEventListener('scroll', function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(update, 140);
  }, { passive: true });
  track.addEventListener('scrollend', update);
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(measure);
  });
  carousel.querySelector('.case-carousel__controls').hidden = false;
  measure();
  if (document.fonts) document.fonts.ready.then(measure);
})();
