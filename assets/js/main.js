/* ==========================================================================
   Glossy Branding Agency — behaviour
   Vanilla JS, no dependencies. Progressive: every page renders without it,
   the CMS lists are the one thing that need it.
   ========================================================================== */

/* --- Mobile nav ----------------------------------------------------------- */

function initNav() {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;

  const toggle = nav.querySelector('.nav__toggle');
  const setOpen = (open) => {
    nav.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    // Stop the page scrolling behind the full-screen panel.
    document.body.style.overflow = open ? 'hidden' : '';
  };

  toggle.addEventListener('click', () => setOpen(nav.dataset.open !== 'true'));

  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.dataset.open === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
}

/* --- FAQ accordion -------------------------------------------------------- */

function initFaq() {
  document.querySelectorAll('.faq__item').forEach((item) => {
    const btn = item.querySelector('.faq__q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = item.dataset.open === 'true';
      item.dataset.open = String(!open);
      btn.setAttribute('aria-expanded', String(!open));
    });
  });
}

/* --- CMS ------------------------------------------------------------------ */

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

// Pages live at the site root, case detail pages one level down in /cases/.
// Links are built relative so the site works under a GitHub Pages subpath too.
const basePath = () => (/\/(cases|news)\/[^/]*$/.test(location.pathname) ? '../' : '');

// The Dutch tree mirrors the English one a level deeper (/nl/...), but assets
// and data stay at the repo root, so those URLs climb one extra level there.
const nlDepth = () => (/(^|\/)nl\//.test(location.pathname) ? '../' : '');

// Media in data/*.json is stored repo-relative; Vimeo and other absolute URLs
// are left alone.
const assetUrl = (src) =>
  /^(https?:)?\/\//.test(src || '') ? src : basePath() + nlDepth() + (src || '');

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

function caseCard(item) {
  // Cards lead with the case's own opening frame: the hero video where there is
  // one, with the hero image behind it as poster/fallback. `item.image` is the
  // social-share asset — a different picture — so it is deliberately not used.
  const poster = item.hero ? ` poster="${escapeHtml(assetUrl(item.hero))}"` : '';
  const alt = `${escapeHtml(item.name)}, ${escapeHtml(item.baseline || 'case')}`;

  let media = '';
  if (item.heroVideo) {
    media = `<video class="case-card__media" src="${escapeHtml(item.heroVideo)}"${poster}
          autoplay muted loop playsinline preload="metadata" aria-label="${alt}"></video>`;
  } else if (item.hero) {
    media = `<img class="case-card__media" src="${escapeHtml(assetUrl(item.hero))}"
          alt="${alt}" loading="lazy" decoding="async">`;
  }

  const flag = item.isNew ? '<span class="case-card__flag">new</span>' : '';

  return `
    <a class="case-card" href="${basePath()}cases/${escapeHtml(item.slug)}.html">
      ${media}${flag}
      <span class="case-card__body">
        <span class="case-card__name">${escapeHtml(item.name)}</span>
        <span class="case-card__baseline">${escapeHtml(item.baseline || '')}</span>
      </span>
    </a>`;
}

function newsCard(item) {
  const img = item.image
    ? `<img src="${escapeHtml(assetUrl(item.image))}" alt="" loading="lazy" decoding="async">`
    : '';
  return `
    <article class="news-item">
      <a class="news-item__link" href="${basePath()}news/${escapeHtml(item.slug)}.html">
        <div class="news-item__media">${img}</div>
        <p class="news-item__date">${escapeHtml(item.monthYear || item.published || '')}</p>
        <h2 class="news-item__title">${escapeHtml(item.name)}</h2>
        <p class="news-item__excerpt">${escapeHtml(item.excerpt || item.subtitle || '')}</p>
      </a>
    </article>`;
}

function clientCard(item) {
  const logo = `<img class="client__logo" src="${escapeHtml(assetUrl(item.logo))}"
      alt="${escapeHtml(item.name)}" loading="lazy" decoding="async">`;

  // Roughly a third of the clients have a case behind them; those become links.
  return item.case
    ? `<a class="client client--linked" href="${basePath()}cases/${escapeHtml(item.case)}.html"
         title="${escapeHtml(item.name)}">${logo}</a>`
    : `<div class="client">${logo}</div>`;
}

/**
 * Renders a JSON collection into a container, a page at a time.
 * The original paginated its case grid ("NEXT", 1/5) — same idea here.
 */
async function initCollection(root) {
  const src = root.dataset.collection;
  const perPage = Number(root.dataset.perPage) || 12;
  const kind = root.dataset.kind || 'cases';
  // querySelector('') throws, so only look these up when a selector is given —
  // collections that render in one go (the client wall) declare neither.
  const pick = (sel) => (sel ? document.querySelector(sel) : null);
  const moreBtn = pick(root.dataset.more);
  const counter = pick(root.dataset.counter);

  let items;
  try {
    items = await loadJson(src);
  } catch (err) {
    root.innerHTML = `<p class="is-loading">Could not load content (${escapeHtml(err.message)}).</p>`;
    return;
  }

  const render = { news: newsCard, clients: clientCard }[kind] || caseCard;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  let shown = 0;

  const renderNext = () => {
    const slice = items.slice(shown, shown + perPage);
    root.insertAdjacentHTML('beforeend', slice.map((it, i) => render(it, shown + i)).join(''));
    shown += slice.length;

    if (counter) counter.textContent = `${Math.ceil(shown / perPage)} / ${pages}`;
    if (moreBtn) moreBtn.hidden = shown >= items.length;
  };

  root.innerHTML = '';
  renderNext();
  if (moreBtn) moreBtn.addEventListener('click', renderNext);
}

/* --- Animated logo -------------------------------------------------------- */

/**
 * The wordmark is a Lottie animation on the original. Each [data-lottie] holds a
 * static SVG as its no-JS fallback, swapped out once the animation is ready.
 */
function initLottie() {
  if (!window.lottie) return;

  document.querySelectorAll('[data-lottie]').forEach((el) => {
    const anim = window.lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: true,
      autoplay: el.dataset.lottieAutoplay !== 'false',
      path: assetUrl(
        // A light header needs the white artwork: the counters of O, B and D are
        // painted white shapes, so tinting the black file fills them in.
        document.body.classList.contains('nav-invert') && el.dataset.lottieWhite
          ? el.dataset.lottieWhite
          : el.dataset.lottie
      ),
    });
    anim.addEventListener('DOMLoaded', () => {
      el.querySelector('.lottie-fallback')?.remove();
      el.dataset.ready = 'true';
    });
    el._anim = anim;
  });
}

/* --- Page transition ------------------------------------------------------ */

/**
 * Clicking through to a case pulls a white curtain over the page with the logo
 * animating in the middle, the way the original does between pages.
 */
function initTransition() {
  const curtain = document.querySelector('[data-transition]');
  if (!curtain) return;

  // Lift the curtain once this page has painted.
  requestAnimationFrame(() => { curtain.dataset.state = 'out'; });

  const sameOrigin = (a) =>
    a.origin === location.origin &&
    !a.hasAttribute('download') &&
    a.target !== '_blank' &&
    !a.getAttribute('href').startsWith('#');

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const a = e.target.closest('a[href]');
    if (!a || !sameOrigin(a) || a.href === location.href) return;

    // Respect people who asked for less motion: navigate straight away.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    e.preventDefault();
    curtain.dataset.state = 'in';
    const go = () => { location.href = a.href; };
    curtain.addEventListener('transitionend', go, { once: true });
    // Never strand the visitor if the transition never fires.
    setTimeout(go, 900);
  });

  // Coming back via the browser's cache would otherwise show a stuck curtain.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) curtain.dataset.state = 'out';
  });
}

/* --- Header over a full-screen hero --------------------------------------- */

/**
 * Case pages open on a full-screen frame with the header laid over it. Once
 * that frame has scrolled away the header returns to its normal solid state.
 */
function initHeroHeader() {
  const hero = document.querySelector('.case-hero');
  const header = document.querySelector('.site-header');
  if (!hero || !header) return;

  const io = new IntersectionObserver(
    ([entry]) => { header.dataset.pastHero = String(!entry.isIntersecting); },
    { rootMargin: `-${header.offsetHeight}px 0px 0px 0px`, threshold: 0 }
  );
  io.observe(hero);
}

/* --- Cookie banner -------------------------------------------------------- */

/**
 * Remembers the visitor's answer so the bar appears once, not every page.
 *
 * NOTE: this build ships no analytics or advertising scripts, so there is
 * nothing for a refusal to switch off yet. Wire real gating in here at the same
 * time as any tracker, otherwise the choice is only cosmetic.
 */
function initCookieBar() {
  const bar = document.querySelector('[data-cookie-bar]');
  if (!bar) return;

  const KEY = 'glossy.cookie-choice';
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (stored) return;

  bar.dataset.open = 'false';
  requestAnimationFrame(() => { bar.dataset.open = 'true'; });

  const close = (choice) => {
    try { localStorage.setItem(KEY, choice); } catch { /* private mode */ }
    bar.dataset.open = 'false';
    bar.addEventListener('transitionend', () => bar.removeAttribute('data-open'), { once: true });
  };

  bar.querySelector('[data-cookie-accept]')?.addEventListener('click', () => close('accepted'));
  bar.querySelector('[data-cookie-close]')?.addEventListener('click', () => close('dismissed'));
}

/* --- Boot ----------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initFaq();
  initLottie();
  initTransition();
  initHeroHeader();
  initCookieBar();
  document.querySelectorAll('[data-collection]').forEach(initCollection);
});
