/* LAB 05 · Zwart op wit · 2026-09-25
   Behaviour only: menu, one intake button at a time, the plain answer, a logo
   that plays once, and section rules that draw once. Nothing fades in. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('l5-js');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Dev layer: ?grid shows the twelve columns. */
  if (/[?&]grid\b/.test(location.search)) root.classList.add('l5-show-grid');

  /* 1. Menu below 960px. */
  var nav = document.querySelector('[data-l5-nav]');
  if (nav) {
    var toggle = nav.querySelector('.l5-menu-toggle');
    var setOpen = function (open) {
      if (open) nav.setAttribute('data-open', '');
      else nav.removeAttribute('data-open');
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () { setOpen(!nav.hasAttribute('data-open')); });
    nav.querySelectorAll('.l5-nav__link').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.hasAttribute('data-open')) { setOpen(false); toggle.focus(); }
    });
  }

  /* 2. Header: a rule once the page scrolls, and the intake button only when
     the hero button is out of view. Never two intake buttons at once. */
  var header = document.querySelector('.l5-header');
  var headerCta = document.querySelector('[data-l5-header-cta]');
  var heroCta = document.querySelector('[data-l5-hero-cta]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  if (headerCta && heroCta && 'IntersectionObserver' in window) {
    /* visibility:hidden also removes the button from the tab order. */
    headerCta.setAttribute('data-hidden', '');
    new IntersectionObserver(function (entries) {
      headerCta.toggleAttribute('data-hidden', entries[0].isIntersecting);
    }, { rootMargin: '-72px 0px 0px 0px' }).observe(heroCta);
  }

  /* 3. The plain answer unfolds under the lead. Without script it is open. */
  document.querySelectorAll('[data-l5-disclosure]').forEach(function (button) {
    var panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;
    button.hidden = false;
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      panel.toggleAttribute('data-open', open);
    });
  });

  /* 4. Logo: the third word runs once per session (4.2 s) and lands on AGENCY.
     Again on hover or focus. Reduced motion: the wordmark stays still. */
  var logo = document.querySelector('[data-l5-logo]');
  if (logo && logo.querySelector('.l5-logo__ticker') && !reduced.matches) {
    var play = function () {
      if (logo.hasAttribute('data-play')) return;
      logo.setAttribute('data-play', '');
    };
    logo.addEventListener('animationend', function () { logo.removeAttribute('data-play'); });
    var played = false;
    try { played = sessionStorage.getItem('glossy.lab05.logo') === 'played'; } catch (e) {}
    if (!played) {
      try { sessionStorage.setItem('glossy.lab05.logo', 'played'); } catch (e) {}
      play();
    }
    logo.addEventListener('mouseenter', play);
    logo.addEventListener('focus', play);
  }

  /* 5. Section rules draw once when they reach the viewport. */
  if ('IntersectionObserver' in window && !reduced.matches) {
    var rules = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        rules.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.l5-section + .l5-section').forEach(function (section) { rules.observe(section); });
  } else {
    document.querySelectorAll('.l5-section').forEach(function (section) { section.classList.add('is-drawn'); });
  }
})();
