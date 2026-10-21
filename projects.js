(() => {
  'use strict';

  const section = document.getElementById('projects');
  if (!section) return;

  const search = section.querySelector('#project-search');
  const sort = section.querySelector('#project-sort');
  const grid = section.querySelector('#project-grid');
  const count = section.querySelector('#project-count');
  const empty = section.querySelector('#project-empty');
  const reset = section.querySelector('#reset-project-filters');
  const showAll = section.querySelector('#project-show-all');
  const more = showAll?.closest('.project-more');
  const filters = [...section.querySelectorAll('[data-project-filter]')];
  if (!search || !sort || !grid || !count || !empty || !reset || !filters.length) return;

  const normalize = (value) => value.toLocaleLowerCase().trim();
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const cards = [...grid.querySelectorAll('.repo-card')].map((element, index) => ({
    element,
    name: element.dataset.name || '',
    categories: (element.dataset.category || '').split(/\s+/).filter(Boolean),
    searchable: normalize(`${element.dataset.name || ''} ${element.dataset.category || ''} ${element.textContent}`),
    updated: Date.parse(element.dataset.updated || '') || 0,
    order: Number.isFinite(Number(element.dataset.order)) ? Number(element.dataset.order) : index,
    index,
  }));

  let activeFilter = filters.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.projectFilter || 'all';
  let expanded = false;
  const initialLimit = showAll && more ? 6 : cards.length;
  const byFeatured = (a, b) => a.order - b.order || a.index - b.index;
  const resultAnimations = new Set();
  const motionEnabled = () => document.documentElement.dataset.motion === 'on' && !document.hidden;
  const cancelResultAnimations = () => {
    resultAnimations.forEach((animation) => animation.cancel());
    resultAnimations.clear();
  };

  const transitionResults = (change) => {
    const before = new Map();
    if (motionEnabled()) {
      cards.forEach(({ element }) => {
        if (!element.hidden) before.set(element, element.getBoundingClientRect());
      });
    }
    cancelResultAnimations();
    change();
    if (!motionEnabled()) return;

    cards.forEach(({ element }) => {
      if (element.hidden || typeof element.animate !== 'function') return;
      const after = element.getBoundingClientRect();
      if (after.bottom <= 0 || after.top >= window.innerHeight) return;
      const previous = before.get(element);
      const limit = (value) => Math.max(-48, Math.min(48, value));
      const x = previous ? limit(previous.left - after.left) : 0;
      const y = previous ? limit(previous.top - after.top) : 12;
      if (previous && Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;
      // Individual translate composes with the card's existing hover transform.
      // Results and counts already reflect the new state before motion begins.
      const animation = element.animate([
        { translate: `${x}px ${y}px`, opacity: previous ? 1 : 0.45 },
        { translate: '0px 0px', opacity: 1 }
      ], { duration: 320, easing: 'cubic-bezier(.2,.75,.25,1)' });
      resultAnimations.add(animation);
      const release = () => resultAnimations.delete(animation);
      animation.addEventListener('finish', release, { once: true });
      animation.addEventListener('cancel', release, { once: true });
    });
  };

  new MutationObserver(() => {
    if (!motionEnabled()) cancelResultAnimations();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelResultAnimations();
  });

  const sortCards = () => {
    const ordered = [...cards];
    if (sort.value === 'name') ordered.sort((a, b) => collator.compare(a.name, b.name) || byFeatured(a, b));
    else if (sort.value === 'updated') ordered.sort((a, b) => b.updated - a.updated || byFeatured(a, b));
    else ordered.sort(byFeatured);
    grid.append(...ordered.map(({ element }) => element));
  };

  const updateResults = () => {
    cancelResultAnimations();
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    const limit = !expanded && !terms.length && activeFilter === 'all' && sort.value === 'featured'
      ? initialLimit : cards.length;
    let visible = 0;
    let matches = 0;
    cards.forEach((card) => {
      const matchesCategory = activeFilter === 'all' || card.categories.includes(activeFilter);
      const matchesSearch = terms.every((term) => card.searchable.includes(term));
      const isMatch = matchesCategory && matchesSearch;
      if (isMatch) matches += 1;
      card.element.hidden = !isMatch || visible >= limit;
      if (!card.element.hidden) visible += 1;
    });
    filters.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.projectFilter === activeFilter)));
    count.textContent = `${visible} of ${cards.length} ${cards.length === 1 ? 'repository' : 'repositories'}`;
    empty.hidden = visible !== 0;
    if (more) more.hidden = visible >= matches;
  };

  const findRepoTarget = (hash) => {
    if (!hash || hash === '#') return null;
    try {
      const id = decodeURIComponent(hash.slice(1));
      return cards.find(({ element }) => element.id === id) || null;
    } catch {
      return null;
    }
  };

  const revealRepo = (hash) => {
    const card = findRepoTarget(hash);
    if (!card) return null;
    const wasHidden = card.element.hidden;
    if (wasHidden) {
      expanded = true;
      search.value = '';
      activeFilter = 'all';
      updateResults();
    }
    return { element: card.element, wasHidden };
  };

  const revealHashTarget = () => {
    const target = revealRepo(window.location.hash);
    if (target?.wasHidden) {
      window.requestAnimationFrame(() => target.element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    }
  };

  search.addEventListener('input', updateResults);
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !search.value) return;
    event.preventDefault();
    search.value = '';
    updateResults();
  });
  sort.addEventListener('change', () => {
    transitionResults(() => {
      sortCards();
      updateResults();
    });
  });
  filters.forEach((button) => {
    button.addEventListener('click', () => {
      transitionResults(() => {
        activeFilter = button.dataset.projectFilter;
        updateResults();
      });
    });
  });
  reset.addEventListener('click', () => {
    search.value = '';
    activeFilter = 'all';
    updateResults();
    // The reset button disappears with the empty state; continue in the search field.
    search.focus({ preventScroll: true });
  });
  showAll?.addEventListener('click', () => {
    const firstNewCard = [...grid.querySelectorAll('.repo-card')].find((element) => element.hidden);
    expanded = true;
    transitionResults(updateResults);
    // The expansion control disappears; keep keyboard focus in the new results.
    firstNewCard?.querySelector('h3 a')?.focus();
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || link.origin !== window.location.origin || link.pathname !== window.location.pathname || link.search !== window.location.search) return;
    const target = revealRepo(link.hash);
    if (!target) return;
    // Reveal before native fragment navigation, then focus its repository link.
    window.requestAnimationFrame(() => target.element.querySelector('h3 a')?.focus({ preventScroll: true }));
  });
  window.addEventListener('hashchange', revealHashTarget);

  sortCards();
  more?.classList.remove('requires-js');
  updateResults();
  section.querySelectorAll('.project-controls.requires-js').forEach((controls) => {
    controls.hidden = false;
    controls.classList.remove('requires-js');
  });
  revealHashTarget();
})();
