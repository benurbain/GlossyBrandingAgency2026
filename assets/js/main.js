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

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

function caseCard(item, index) {
  // Mirror the original's rhythm: every third card runs tall/narrow.
  const narrow = index % 3 === 2 ? ' case-card--narrow' : '';
  const img = item.image
    ? `<img class="case-card__media" src="${escapeHtml(item.image)}"
          alt="${escapeHtml(item.name)} — ${escapeHtml(item.baseline || 'case')}"
          loading="lazy" decoding="async">`
    : '';
  const flag = item.isNew ? '<span class="case-card__flag">new</span>' : '';

  return `
    <a class="case-card${narrow}" href="${basePath()}cases/${escapeHtml(item.slug)}.html">
      ${img}${flag}
      <span class="case-card__body">
        <span class="case-card__name">${escapeHtml(item.name)}</span>
        <span class="case-card__baseline">${escapeHtml(item.baseline || '')}</span>
      </span>
    </a>`;
}

function newsCard(item) {
  const img = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">`
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

/**
 * Renders a JSON collection into a container, a page at a time.
 * The original paginated its case grid ("NEXT", 1/5) — same idea here.
 */
async function initCollection(root) {
  const src = root.dataset.collection;
  const perPage = Number(root.dataset.perPage) || 12;
  const kind = root.dataset.kind || 'cases';
  const moreBtn = document.querySelector(root.dataset.more || '');
  const counter = document.querySelector(root.dataset.counter || '');

  let items;
  try {
    items = await loadJson(src);
  } catch (err) {
    root.innerHTML = `<p class="is-loading">Could not load content (${escapeHtml(err.message)}).</p>`;
    return;
  }

  const render = kind === 'news' ? newsCard : caseCard;
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

/* --- Boot ----------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initFaq();
  document.querySelectorAll('[data-collection]').forEach(initCollection);
});
