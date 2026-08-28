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
  // Like the case cards, news cards lead with the item's video where there is
  // one; the image stays as poster and as the fallback for image-only items.
  let media = '';
  if (/\.(mp4|webm)(\?|$)/.test(item.video || '')) {
    const poster = item.image ? ` poster="${escapeHtml(assetUrl(item.image))}"` : '';
    media = `<video src="${escapeHtml(assetUrl(item.video))}"${poster}
          autoplay muted loop playsinline preload="metadata" aria-label="${escapeHtml(item.name)}"></video>`;
  } else if (item.image) {
    media = `<img src="${escapeHtml(assetUrl(item.image))}" alt="" loading="lazy" decoding="async">`;
  }
  // Like the original overview: just the image, the title and a read-more cue.
  const readMore = document.documentElement.lang === 'nl' ? 'Lees meer' : 'Read more';
  return `
    <article class="news-item">
      <a class="news-item__link" href="${basePath()}news/${escapeHtml(item.slug)}.html">
        <div class="news-item__media">${media}</div>
        <h2 class="news-item__title">${escapeHtml(item.name)}</h2>
        <p class="news-item__more">${readMore}</p>
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

/* --- Cookie consent ------------------------------------------------------- */

/**
 * Consent is opt-in by category. The necessary record itself is local browser
 * storage: it remembers the visitor's language and privacy choices for six
 * months. Optional scripts must use:
 *
 *   <script type="text/plain" data-consent="analytics|marketing">…</script>
 *
 * External embeds are rendered as inert local placeholders by the generators
 * and receive their iframe only after the external-media choice is enabled.
 */
function initCookieConsent() {
  const bar = document.querySelector('[data-cookie-bar]');
  if (!bar) return;

  const KEY = 'glossy.consent.v1';
  const VERSION = 1;
  const MAX_AGE = 1000 * 60 * 60 * 24 * 183;
  const isNl = document.documentElement.lang.toLowerCase().startsWith('nl');
  const originalPolicy = bar.querySelector('a[href]')?.getAttribute('href');
  const nested = /\/(?:cases|news)\//.test(location.pathname);
  const policyHref = originalPolicy || (nested ? '../privacy-policy.html' : 'privacy-policy.html');

  const copy = isNl ? {
    label: 'Cookievoorkeuren',
    eyebrow: 'Privacy, jouw keuze',
    banner: 'We gebruiken noodzakelijke browseropslag om je taal- en privacykeuzes te onthouden. Met jouw toestemming kunnen we ook analytics, marketingtools en externe media laden.',
    policy: 'Lees ons cookiebeleid',
    accept: 'Alles accepteren',
    reject: 'Alles weigeren',
    manage: 'Voorkeuren beheren',
    title: 'Cookievoorkeuren',
    intro: 'Kies welke niet-essentiële diensten je toestaat. Je kunt deze keuze altijd opnieuw aanpassen via “Cookievoorkeuren” in de footer.',
    close: 'Voorkeuren sluiten',
    necessary: 'Noodzakelijk',
    necessaryDescription: 'Onthoudt je taal- en privacykeuzes. Deze opslag is nodig en staat altijd aan.',
    always: 'Altijd actief',
    analytics: 'Analytics',
    analyticsDescription: 'Helpt ons begrijpen hoe de website presteert. Er is momenteel geen analyticsdienst actief.',
    marketing: 'Marketing',
    marketingDescription: 'Kan worden gebruikt om campagnes te meten en relevanter te maken. Er is momenteel geen marketingpixel actief.',
    externalMedia: 'Externe media',
    externalMediaDescription: 'Laadt spelers van derden, zoals Vimeo. Die aanbieders kunnen daarbij gegevens verwerken.',
    save: 'Keuze bewaren',
  } : {
    label: 'Cookie preferences',
    eyebrow: 'Privacy, your choice',
    banner: 'We use necessary browser storage to remember your language and privacy choices. With your permission, we may also load analytics, marketing tools and external media.',
    policy: 'Read our cookie policy',
    accept: 'Accept all',
    reject: 'Reject all',
    manage: 'Manage preferences',
    title: 'Cookie preferences',
    intro: 'Choose which non-essential services you allow. You can change this choice at any time through “Cookie preferences” in the footer.',
    close: 'Close preferences',
    necessary: 'Necessary',
    necessaryDescription: 'Remembers your language and privacy choices. This storage is required and always active.',
    always: 'Always active',
    analytics: 'Analytics',
    analyticsDescription: 'Helps us understand how the website performs. No analytics service is currently active.',
    marketing: 'Marketing',
    marketingDescription: 'May be used to measure campaigns and make them more relevant. No marketing pixel is currently active.',
    externalMedia: 'External media',
    externalMediaDescription: 'Loads third-party players such as Vimeo. Those providers may process data.',
    save: 'Save choice',
  };

  const emptyChoice = () => ({
    version: VERSION,
    necessary: true,
    analytics: false,
    marketing: false,
    externalMedia: false,
    decidedAt: Date.now(),
    expiresAt: Date.now() + MAX_AGE,
  });

  const readChoice = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!value || value.version !== VERSION || value.expiresAt <= Date.now()) {
        localStorage.removeItem(KEY);
        return null;
      }
      return { ...emptyChoice(), ...value, necessary: true };
    } catch {
      return null;
    }
  };

  const activateScripts = (consent) => {
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach((script) => {
      const category = script.dataset.consent;
      if (!consent[category]) return;

      const replacement = document.createElement('script');
      [...script.attributes].forEach((attr) => {
        if (attr.name === 'data-src') {
          replacement.src = attr.value;
        } else if (!['type', 'data-consent'].includes(attr.name)) {
          replacement.setAttribute(attr.name, attr.value);
        }
      });
      replacement.textContent = script.textContent;
      replacement.dataset.consentLoaded = 'true';
      script.replaceWith(replacement);
    });
  };

  const renderEmbeds = (consent) => {
    document.querySelectorAll('[data-consent-embed]').forEach((embed) => {
      const placeholder = embed.querySelector('[data-consent-placeholder]');
      const frame = embed.querySelector('iframe[data-consent-frame]');

      if (consent.externalMedia) {
        if (!frame) {
          const iframe = document.createElement('iframe');
          iframe.src = embed.dataset.consentSrc;
          iframe.title = embed.dataset.consentTitle || 'External media';
          iframe.loading = 'lazy';
          iframe.allow = 'autoplay; fullscreen; picture-in-picture';
          iframe.allowFullscreen = true;
          iframe.dataset.consentFrame = 'true';
          embed.append(iframe);
        }
        if (placeholder) placeholder.hidden = true;
        embed.dataset.consentState = 'allowed';
      } else {
        frame?.remove();
        if (placeholder) placeholder.hidden = false;
        embed.dataset.consentState = 'blocked';
      }
    });
  };

  const applyChoice = (consent) => {
    renderEmbeds(consent);
    activateScripts(consent);
    document.dispatchEvent(new CustomEvent('glossy:consentchange', { detail: consent }));
  };

  bar.setAttribute('aria-label', copy.label);
  bar.setAttribute('aria-live', 'polite');
  bar.innerHTML =
    '<div class="cookie-bar__content">' +
      '<p class="cookie-bar__eyebrow">' + copy.eyebrow + '</p>' +
      '<p class="cookie-bar__text">' + copy.banner + ' ' +
        '<a href="' + escapeHtml(policyHref) + '">' + copy.policy + '</a>.</p>' +
    '</div>' +
    '<div class="cookie-bar__actions">' +
      '<button class="btn cookie-btn" type="button" data-consent-accept-all>' + copy.accept + '</button>' +
      '<button class="btn cookie-btn" type="button" data-consent-reject-all>' + copy.reject + '</button>' +
      '<button class="cookie-link" type="button" data-consent-manage>' + copy.manage + '</button>' +
    '</div>';

  const option = (name, title, description) =>
    '<label class="cookie-option" for="consent-' + name + '">' +
      '<span class="cookie-option__title">' + title + '</span>' +
      '<input class="cookie-switch" id="consent-' + name + '" name="' + name + '" type="checkbox" ' +
        'aria-describedby="consent-' + name + '-description">' +
      '<p class="cookie-option__description" id="consent-' + name + '-description">' + description + '</p>' +
    '</label>';

  const modal = document.createElement('div');
  modal.className = 'cookie-preferences';
  modal.dataset.consentModal = '';
  modal.hidden = true;
  modal.innerHTML =
    '<section class="cookie-preferences__dialog" role="dialog" aria-modal="true" ' +
      'aria-labelledby="cookie-preferences-title" tabindex="-1">' +
      '<div class="cookie-preferences__head">' +
        '<h2 class="cookie-preferences__title" id="cookie-preferences-title">' + copy.title + '</h2>' +
        '<button class="cookie-preferences__close" type="button" data-consent-close ' +
          'aria-label="' + copy.close + '">&times;</button>' +
      '</div>' +
      '<p class="cookie-preferences__intro">' + copy.intro + ' ' +
        '<a class="cookie-link" href="' + escapeHtml(policyHref) + '">' + copy.policy + '</a>.</p>' +
      '<form data-consent-form>' +
        '<div class="cookie-options">' +
          '<div class="cookie-option">' +
            '<span class="cookie-option__title">' + copy.necessary + '</span>' +
            '<span class="cookie-option__state">' + copy.always + '</span>' +
            '<p class="cookie-option__description">' + copy.necessaryDescription + '</p>' +
          '</div>' +
          option('analytics', copy.analytics, copy.analyticsDescription) +
          option('marketing', copy.marketing, copy.marketingDescription) +
          option('externalMedia', copy.externalMedia, copy.externalMediaDescription) +
        '</div>' +
        '<div class="cookie-preferences__actions">' +
          '<button class="btn cookie-btn" type="button" data-consent-accept-all>' + copy.accept + '</button>' +
          '<button class="btn cookie-btn" type="button" data-consent-reject-all>' + copy.reject + '</button>' +
          '<button class="btn cookie-btn" type="submit">' + copy.save + '</button>' +
        '</div>' +
      '</form>' +
    '</section>';
  document.body.append(modal);

  const footerLegal = document.querySelector('.site-footer__legal');
  if (footerLegal && !footerLegal.querySelector('[data-consent-manage]')) {
    const settings = document.createElement('button');
    settings.className = 'cookie-settings-link';
    settings.type = 'button';
    settings.dataset.consentManage = '';
    settings.textContent = copy.manage;
    footerLegal.prepend(settings);
  }

  const form = modal.querySelector('[data-consent-form]');
  const dialog = modal.querySelector('.cookie-preferences__dialog');
  let choice = readChoice();
  let returnFocus = null;
  let previousOverflow = '';

  const setForm = (value) => {
    ['analytics', 'marketing', 'externalMedia'].forEach((name) => {
      form.elements[name].checked = Boolean(value?.[name]);
    });
  };

  const showBar = () => {
    bar.dataset.open = 'false';
    requestAnimationFrame(() => { bar.dataset.open = 'true'; });
  };

  const hideBar = () => {
    bar.dataset.open = 'false';
    const finish = () => bar.removeAttribute('data-open');
    bar.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 500);
  };

  const closeModal = ({ restoreFocus = true, returnToBar = !choice } = {}) => {
    modal.hidden = true;
    document.body.style.overflow = previousOverflow;
    if (returnToBar) showBar();
    if (restoreFocus && returnFocus instanceof HTMLElement) returnFocus.focus();
  };

  const openModal = (trigger) => {
    returnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    setForm(choice || emptyChoice());
    hideBar();
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal.hidden = false;
    requestAnimationFrame(() => dialog.focus());
  };

  const saveChoice = (next) => {
    choice = { ...emptyChoice(), ...next, necessary: true };
    try {
      localStorage.setItem(KEY, JSON.stringify(choice));
      localStorage.removeItem('glossy.cookie-choice');
    } catch { /* Privacy mode: keep the choice for this page only. */ }
    applyChoice(choice);
    hideBar();
    if (!modal.hidden) closeModal({ restoreFocus: false, returnToBar: false });
  };

  const acceptAll = () => saveChoice({
    analytics: true,
    marketing: true,
    externalMedia: true,
  });
  const rejectAll = () => saveChoice({
    analytics: false,
    marketing: false,
    externalMedia: false,
  });

  document.addEventListener('click', (event) => {
    const manage = event.target.closest('[data-consent-manage]');
    if (manage) openModal(manage);
  });

  document.querySelectorAll('[data-consent-accept-all]').forEach((button) => {
    button.addEventListener('click', acceptAll);
  });
  document.querySelectorAll('[data-consent-reject-all]').forEach((button) => {
    button.addEventListener('click', rejectAll);
  });

  modal.querySelector('[data-consent-close]').addEventListener('click', () => closeModal());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveChoice({
      analytics: form.elements.analytics.checked,
      marketing: form.elements.marketing.checked,
      externalMedia: form.elements.externalMedia.checked,
    });
  });

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...modal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((element) => !element.hidden);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  applyChoice(choice || emptyChoice());
  if (!choice) showBar();
}

/* --- Boot ----------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initFaq();
  initLottie();
  initTransition();
  initHeroHeader();
  initCookieConsent();
  document.querySelectorAll('[data-collection]').forEach(initCollection);
});
