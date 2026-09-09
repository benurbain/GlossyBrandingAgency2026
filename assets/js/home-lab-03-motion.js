(function () {
  if (!document.body.classList.contains('home-motion')) return;

  var preparedGroups = [];

  function prepareItem(element, kind, delay, duration) {
    if (!element || element.classList.contains('motion-reveal')) return;
    element.classList.add('motion-reveal');
    if (kind) element.classList.add('motion-reveal--' + kind);
    element.style.setProperty('--motion-delay', delay + 'ms');
    element.style.setProperty('--motion-duration', duration + 'ms');
  }

  function prepareGroup(container, items) {
    if (!container || !items.length) return;
    preparedGroups.push({ container: container, items: items });
  }

  document.querySelectorAll('.section-head').forEach(function (header) {
    var items = [];
    var kicker = header.querySelector('.kicker');
    var heading = header.querySelector('h2');
    var support = header.querySelector('.section-link, .section-summary');

    if (kicker) {
      prepareItem(kicker, 'kicker', 0, 560);
      items.push(kicker);
    }
    if (heading) {
      prepareItem(heading, 'heading', 35, 900);
      items.push(heading);
    }
    if (support) {
      prepareItem(support, 'support', 80, 760);
      items.push(support);
    }
    prepareGroup(header, items);
  });

  [
    ['.service-grid', 'article,.lab-service-card'],
    ['.work-grid', '.project'],
    ['.news-grid', 'a'],
    ['.why-copy', 'p']
  ].forEach(function (definition) {
    document.querySelectorAll(definition[0]).forEach(function (container) {
      var items = Array.prototype.slice.call(container.querySelectorAll(definition[1]));
      items.forEach(function (item, index) {
        prepareItem(item, 'support', index * 40, 760);
      });
      prepareGroup(container, items);
    });
  });

  var contact = document.querySelector('.contact');
  if (contact) {
    var contactContent = contact.querySelector('.contact-content') || contact;
    var contactItems = Array.prototype.slice.call(contactContent.children);
    contactItems.forEach(function (item, index) {
      var kind = item.matches('h2') ? 'heading' : index === 0 ? 'kicker' : 'support';
      prepareItem(item, kind, index * 40, item.matches('h2') ? 900 : 760);
    });
    prepareGroup(contactContent, contactItems);
  }

  document.querySelectorAll('.section').forEach(function (section) {
    section.classList.add('motion-section');
  });

  function reveal(group) {
    group.container.classList.add('is-visible');
    group.items.forEach(function (item) { item.classList.add('is-visible'); });
  }

  preparedGroups.forEach(function (group) {
    var rect = group.container.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) reveal(group);
  });
  document.body.classList.add('motion-ready');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var group = preparedGroups.find(function (candidate) {
          return candidate.container === entry.target;
        });
        if (group) reveal(group);
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    preparedGroups.forEach(function (group) {
      if (!group.container.classList.contains('is-visible')) observer.observe(group.container);
    });
    document.querySelectorAll('.motion-section').forEach(function (section) {
      observer.observe(section);
    });
  } else {
    preparedGroups.forEach(reveal);
    document.querySelectorAll('.motion-section').forEach(function (section) {
      section.classList.add('is-visible');
    });
  }

})();
