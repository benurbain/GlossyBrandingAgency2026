(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 992px)');
  const year = document.querySelector('[data-year]');
  const clock = document.querySelector('[data-clock]');
  const themeButton = document.querySelector('[data-theme-toggle]');

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);
  if (year) year.textContent = String(new Date().getFullYear());

  const updateClock = () => {
    if (!clock) return;
    clock.textContent = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Brussels'
    }).format(new Date());
  };
  updateClock();
  window.setInterval(updateClock, 30000);

  themeButton?.addEventListener('click', () => {
    const dark = root.dataset.theme !== 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeButton.textContent = dark ? '☾' : '☼';
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const scramble = (element) => {
    if (!element || element.dataset.scrambled) return;
    element.dataset.scrambled = 'true';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) nodes.push({ node: walker.currentNode, value: walker.currentNode.nodeValue });
    }
    let step = 0;
    const timer = window.setInterval(() => {
      nodes.forEach(({ node, value }) => {
        node.nodeValue = [...value].map((char, index) => {
          if (!/[A-Za-z0-9]/.test(char) || index % 2 || step > 5) return char;
          return alphabet[Math.floor(Math.random() * alphabet.length)];
        }).join('');
      });
      step += 1;
      if (step > 6) {
        window.clearInterval(timer);
        nodes.forEach(({ node, value }) => { node.nodeValue = value; });
      }
    }, 65);
  };

  if (reduceMotion.matches) {
    document.querySelectorAll('[data-blur]').forEach((element) => element.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (entry.target.hasAttribute('data-scramble')) scramble(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-blur]').forEach((element) => revealObserver.observe(element));
  }

  const player = document.querySelector('[data-frame-player]');
  if (player) {
    const frames = [...player.querySelectorAll('.frame-player__frames img')];
    const counter = player.querySelector('.frame-player__hint span');
    let current = -1;
    let mobileTimer;
    let playerVisible = true;

    const showFrame = (index) => {
      const next = Math.max(0, Math.min(frames.length - 1, index));
      if (next === current) return;
      frames.forEach((frame, frameIndex) => frame.classList.toggle('is-active', frameIndex === next));
      current = next;
      const scale = .16 + (next / Math.max(1, frames.length - 1)) * .84;
      player.style.setProperty('--frame-scale', scale.toFixed(3));
      if (counter) counter.textContent = `${String(next + 1).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}`;
    };

    const stopMobile = () => {
      window.clearInterval(mobileTimer);
      mobileTimer = undefined;
    };
    const startMobile = () => {
      stopMobile();
      if (desktop.matches || reduceMotion.matches || !playerVisible || document.hidden) return;
      mobileTimer = window.setInterval(() => showFrame((current + 1) % frames.length), 850);
    };
    const configurePlayer = () => {
      stopMobile();
      if (!desktop.matches) startMobile();
    };

    if (reduceMotion.matches) {
      showFrame(0);
    } else {
      const start = performance.now();
      const intro = (now) => {
        const progress = Math.min(1, (now - start) / 2200);
        const eased = 1 - Math.pow(1 - progress, 5);
        showFrame(Math.round((frames.length - 1) * (1 - eased)));
        if (progress < 1) requestAnimationFrame(intro);
        else configurePlayer();
      };
      requestAnimationFrame(intro);
    }

    player.addEventListener('pointermove', (event) => {
      if (!desktop.matches || reduceMotion.matches) return;
      const rect = player.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      showFrame(Math.min(frames.length - 1, Math.floor(progress * frames.length)));
    });

    const playerObserver = new IntersectionObserver(([entry]) => {
      playerVisible = entry.isIntersecting;
      if (!desktop.matches) startMobile();
    }, { threshold: .05 });
    playerObserver.observe(player);
    desktop.addEventListener('change', configurePlayer);
    document.addEventListener('visibilitychange', configurePlayer);
  }

  const tip = document.querySelector('.cursor-tip');
  if (tip && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches) {
    const tipText = tip.querySelector('span');
    let pointerX = 0;
    let pointerY = 0;
    let raf;
    const placeTip = () => {
      tip.style.left = `${pointerX}px`;
      tip.style.top = `${pointerY}px`;
      raf = undefined;
    };
    document.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!raf) raf = requestAnimationFrame(placeTip);
    }, { passive: true });
    document.querySelectorAll('[data-hover]').forEach((element) => {
      element.addEventListener('pointerenter', () => {
        if (tipText) tipText.textContent = element.dataset.hover || 'Explore';
        tip.classList.add('is-visible');
      });
      element.addEventListener('pointerleave', () => tip.classList.remove('is-visible'));
      element.addEventListener('focus', () => tip.classList.remove('is-visible'));
    });
  }
})();
