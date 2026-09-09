const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );


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


function initCookieConsent() {
  const bar = document.querySelector('[data-cookie-bar]');
  if (!bar) return;

  const KEY = 'glossy.consent.v2';
  const VERSION = 2;
  const MAX_AGE = 1000 * 60 * 60 * 24 * 183;
  const GA_MEASUREMENT_ID = 'G-NPJVJ2CEFQ';
  const isNl = document.documentElement.lang.toLowerCase().startsWith('nl');
  const originalPolicy = bar.querySelector('a[href]')?.getAttribute('href');
  const nested = /\/(?:cases|news)\//.test(location.pathname);
  const policyHref = originalPolicy || (nested ? '../privacy-policy.html' : 'privacy-policy.html');

  const copy = isNl ? {
    label: 'Cookievoorkeuren',
    eyebrow: 'Privacy, jouw keuze',
    banner: 'We gebruiken noodzakelijke browseropslag om je taal- en privacykeuzes te onthouden. Met jouw toestemming kunnen we ook analytics, marketingtools en ingesloten externe spelers laden.',
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
    analyticsDescription: 'Laadt Google Analytics pas na je toestemming om bezoeken en websiteprestaties te meten.',
    marketing: 'Marketing',
    marketingDescription: 'Kan worden gebruikt om campagnes te meten en relevanter te maken. Er is momenteel geen marketingpixel actief.',
    externalMedia: 'Ingesloten externe spelers',
    externalMediaDescription: 'Voor ingesloten spelers, zoals Vimeo. Direct gestreamde video’s kunnen ook laden als deze keuze uitstaat.',
    save: 'Keuze bewaren',
  } : {
    label: 'Cookie preferences',
    eyebrow: 'Privacy, your choice',
    banner: 'We use necessary browser storage to remember your language and privacy choices. With your permission, we may also load analytics, marketing tools and embedded third-party players.',
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
    analyticsDescription: 'Loads Google Analytics only after your permission to measure visits and website performance.',
    marketing: 'Marketing',
    marketingDescription: 'May be used to measure campaigns and make them more relevant. No marketing pixel is currently active.',
    externalMedia: 'Embedded third-party players',
    externalMediaDescription: 'For embedded players, such as Vimeo. Directly streamed videos may still load when this option is off.',
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

  let googleAnalyticsActive = false;
  let googleAnalyticsConfigured = false;

  const clearGoogleAnalyticsCookies = () => {
    const hostname = location.hostname.replace(/^www\./, '');
    const domains = hostname.includes('.') ? [hostname, `.${hostname}`] : [];

    document.cookie.split(';').forEach((part) => {
      const name = part.split('=')[0].trim();
      if (!name.startsWith('_ga')) return;

      const expired = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/`;
      document.cookie = expired;
      domains.forEach((domain) => {
        document.cookie = `${expired}; domain=${domain}`;
      });
    });
  };

  const setGoogleAnalytics = (allowed) => {
    if (['localhost','127.0.0.1',''].includes(location.hostname)) allowed = false;
    const disableKey = `ga-disable-${GA_MEASUREMENT_ID}`;
    const wasActive = googleAnalyticsActive;
    googleAnalyticsActive = Boolean(allowed);
    window[disableKey] = !googleAnalyticsActive;

    if (!googleAnalyticsActive) {
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
      }
      clearGoogleAnalyticsCookies();
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

    if (!googleAnalyticsConfigured) {
      window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });

      const tag = document.createElement('script');
      tag.async = true;
      tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      tag.dataset.googleAnalytics = GA_MEASUREMENT_ID;
      document.head.append(tag);
      googleAnalyticsConfigured = true;
    } else {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      if (!wasActive) {
        window.gtag('event', 'page_view', {
          page_location: location.href,
          page_title: document.title,
        });
      }
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
    setGoogleAnalytics(consent.analytics);
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

  const footerLegal = document.querySelector('.footer-legal');
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
  try { localStorage.removeItem('glossy.consent.v1'); } catch { /* Storage may be unavailable. */ }
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
      localStorage.removeItem('glossy.consent.v1');
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

/* --- Contact form --------------------------------------------------------- */

function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const feedback = form.querySelector('[data-form-feedback]');
  const submit = form.querySelector('[data-contact-submit]');
  if (!feedback || !submit) return;

  const isDutch = document.documentElement.lang === 'nl';
  const labels = isDutch
    ? {
        sending: 'Bezig met verzenden...',
        error: 'Het bericht kon niet worden verzonden. Probeer opnieuw of mail naar info@glossy.tv.',
        invalid: 'Controleer de aangeduide velden en probeer opnieuw.',
        rateLimit: 'Je hebt te snel meerdere berichten verstuurd. Probeer over 15 minuten opnieuw.',
      }
    : {
        sending: 'Sending...',
        error: 'The message could not be sent. Please try again or email info@glossy.tv.',
        invalid: 'Please check the highlighted fields and try again.',
        rateLimit: 'You have sent several messages in quick succession. Please try again in 15 minutes.',
      };
  const submitLabel = submit.querySelector('.button__label') || submit;
  const idleLabel = submitLabel.textContent;

  const showFeedback = (message) => {
    feedback.textContent = message;
    feedback.hidden = false;
    feedback.focus();
  };

  form.addEventListener('input', (event) => {
    const field = event.target.closest('input, select, textarea');
    if (!field) return;
    field.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (['localhost','127.0.0.1',''].includes(location.hostname)) { showFeedback(isDutch ? 'V02-preview: je formulier is geldig. Er is geen bericht verstuurd.' : 'V02 preview: your form is valid. No message was sent.'); return; }

    feedback.hidden = true;
    form.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    submitLabel.textContent = labels.sending;

    const body = Object.fromEntries(new FormData(form).entries());
    body.privacy = form.querySelector('[name="privacy"]').checked;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch { /* A generic message below handles a malformed server response. */ }

      if (!response.ok || payload.ok !== true) {
        const firstInvalid = Object.keys(payload.errors || {})[0];
        const invalidField = firstInvalid ? form.elements.namedItem(firstInvalid) : null;
        if (invalidField) invalidField.setAttribute('aria-invalid', 'true');

        const message = response.status === 422
          ? labels.invalid
          : response.status === 429
            ? labels.rateLimit
            : labels.error;
        showFeedback(message);
        invalidField?.focus();
        return;
      }

      form.reset();
      window.location.hash = 'sent';
      requestAnimationFrame(() => document.getElementById('sent')?.focus());
    } catch {
      showFeedback(labels.error);
    } finally {
      form.removeAttribute('aria-busy');
      submit.disabled = false;
      submitLabel.textContent = idleLabel;
    }
  });
}


document.addEventListener("DOMContentLoaded",()=>{initFaq();initCookieConsent();initContactForm();});
