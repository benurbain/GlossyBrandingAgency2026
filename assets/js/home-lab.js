(() => {
  const body = document.body;
  const nav = document.querySelector('.lab-nav');
  const intro = document.querySelector('[data-intro]');
  const introSkip = document.querySelector('[data-intro-skip]');
  const menuToggle = document.querySelector('.lab-nav__toggle');
  const menu = document.querySelector('#lab-menu');
  const proof = document.querySelector('[data-proof]');
  const workRail = document.querySelector('.work-grid');
  const spotlight = document.querySelector('[data-spotlight]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compactNav = window.matchMedia('(max-width: 900px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  let introTimer;
  const finishIntro = () => {
    window.clearTimeout(introTimer);
    intro?.classList.add('is-skipped');
    body.classList.remove('intro-running');
    body.classList.add('hero-ready');
  };

  if (intro && !reducedMotion.matches) {
    body.classList.add('intro-running');
    introTimer = window.setTimeout(finishIntro, 4050);
    introSkip?.addEventListener('click', finishIntro);
  } else {
    finishIntro();
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

  if (reducedMotion.matches) {
    document.querySelectorAll('[data-count]').forEach((element) => {
      element.textContent = `${element.dataset.count || '0'}${element.dataset.suffix || ''}`;
    });
  } else {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        const target = Number(element.dataset.count || 0);
        const suffix = element.dataset.suffix || '';
        const start = performance.now();
        const tick = (now) => {
          const elapsed = Math.min(1, (now - start) / 1200);
          const eased = 1 - Math.pow(1 - elapsed, 3);
          element.textContent = `${Math.round(target * eased)}${suffix}`;
          if (elapsed < 1) requestAnimationFrame(tick);
        };
        element.textContent = `0${suffix}`;
        requestAnimationFrame(tick);
        countObserver.unobserve(element);
      });
    }, { threshold: 0.55 });
    document.querySelectorAll('[data-count]').forEach((element) => countObserver.observe(element));
  }

  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !reducedMotion.matches) entry.target.play().catch(() => {});
      else entry.target.pause();
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('video').forEach((video) => videoObserver.observe(video));

  let scrollTicking = false;
  let lastScroll = window.scrollY;
  let directionDistance = 0;
  const updateScrollScenes = () => {
    if (proof && window.innerWidth >= 1200 && !reducedMotion.matches) {
      const rect = proof.getBoundingClientRect();
      const distance = Math.max(1, proof.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      proof.style.setProperty('--proof-progress', progress.toFixed(4));
    }

    const delta = window.scrollY - lastScroll;
    if (Math.sign(delta) !== Math.sign(directionDistance)) directionDistance = 0;
    directionDistance += delta;
    if (nav && !body.classList.contains('menu-open') && window.scrollY > window.innerHeight * .8) {
      if (directionDistance > 120) {
        nav.classList.add('is-hidden');
        directionDistance = 0;
      } else if (directionDistance < -80) {
        nav.classList.remove('is-hidden');
        directionDistance = 0;
      }
    } else if (nav) {
      nav.classList.remove('is-hidden');
    }
    lastScroll = window.scrollY;
    scrollTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateScrollScenes);
  }, { passive: true });
  window.addEventListener('resize', updateScrollScenes, { passive: true });
  updateScrollScenes();

  const closeMenu = ({ restoreFocus = false } = {}) => {
    body.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    if (menuToggle) menuToggle.textContent = 'Menu +';
    if (restoreFocus) menuToggle?.focus();
  };
  const openMenu = () => {
    nav?.classList.remove('is-hidden');
    body.classList.add('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'true');
    if (menuToggle) menuToggle.textContent = 'Close ×';
    window.setTimeout(() => menu?.querySelector('a')?.focus(), 180);
  };
  menuToggle?.addEventListener('click', () => {
    if (body.classList.contains('menu-open')) closeMenu();
    else openMenu();
  });
  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
  compactNav.addEventListener('change', () => closeMenu());

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && intro && !intro.classList.contains('is-skipped')) {
      finishIntro();
      return;
    }
    if (event.key === 'Escape' && body.classList.contains('menu-open')) {
      closeMenu({ restoreFocus: true });
      return;
    }
    if (event.key !== 'Tab' || !body.classList.contains('menu-open') || !menuToggle || !menu) return;
    const focusable = [menuToggle, ...menu.querySelectorAll('a')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const moveWork = (direction) => {
    if (!workRail) return;
    const card = workRail.querySelector('.work-card');
    const distance = (card?.getBoundingClientRect().width || 320) + 24;
    workRail.scrollBy({ left: direction * distance, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  };
  document.querySelector('[data-work-prev]')?.addEventListener('click', () => moveWork(-1));
  document.querySelector('[data-work-next]')?.addEventListener('click', () => moveWork(1));

  if (spotlight && finePointer.matches && !reducedMotion.matches) {
    const section = spotlight.closest('.lab-cta');
    section?.addEventListener('pointermove', (event) => {
      const rect = section.getBoundingClientRect();
      spotlight.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      spotlight.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      spotlight.style.setProperty('--spot-radius', '260px');
    });
    section?.addEventListener('pointerleave', () => spotlight.style.setProperty('--spot-radius', '0px'));
  }
})();
