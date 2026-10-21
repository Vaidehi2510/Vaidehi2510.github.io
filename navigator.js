(() => {
  'use strict';

  const trigger = document.getElementById('explore-toggle');
  if (!trigger || document.getElementById('explore-dialog')) return;

  const dialog = document.createElement('dialog');
  if (typeof dialog.showModal !== 'function') return;
  dialog.id = 'explore-dialog';
  dialog.className = 'explore-dialog';
  dialog.setAttribute('aria-labelledby', 'explore-heading');
  dialog.innerHTML = `
    <div class="explore-shell">
      <header class="explore-header">
        <h2 id="explore-heading">Follow your curiosity.</h2>
        <button class="explore-close" type="button" aria-label="Close explorer"><span aria-hidden="true">×</span></button>
      </header>
      <label class="explore-label" for="explore-search">Find a project or section</label>
      <input class="explore-search" id="explore-search" type="search" placeholder="A project, technology, or idea…" autocomplete="off" spellcheck="false" aria-controls="explore-results" aria-describedby="explore-hint" autofocus>
      <p class="explore-status" id="explore-status" role="status" aria-live="polite" aria-atomic="true"></p>
      <ul class="explore-results" id="explore-results"></ul>
      <p class="explore-empty" hidden>No matches. Try a project name, technology, or topic.</p>
      <footer class="explore-hint" id="explore-hint">Tab to browse · Enter to jump · Esc to close</footer>
    </div>`;
  document.body.append(dialog);

  const input = dialog.querySelector('#explore-search');
  const results = dialog.querySelector('#explore-results');
  const status = dialog.querySelector('#explore-status');
  const empty = dialog.querySelector('.explore-empty');
  const closeButton = dialog.querySelector('.explore-close');
  const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const normalize = (value) => clean(value).toLocaleLowerCase();
  const text = (element, selector) => clean(element.querySelector(selector)?.textContent);
  const entries = [];

  const addEntry = (target, title, kind, description, keywords = '') => {
    if (!target?.id || !title) return;
    entries.push({
      target,
      title,
      kind,
      description,
      titleSearch: normalize(title),
      searchable: normalize(`${title} ${kind} ${description} ${keywords}`),
      order: entries.length,
    });
  };

  [
    ['work', 'Selected security projects'],
    ['upstream', 'Upstream contributions'],
    ['projects', 'All public repositories'],
    ['about', 'About Vaidehi'],
    ['contact', 'Get in touch'],
  ].forEach(([id, title]) => {
    const target = document.getElementById(id);
    if (!target) return;
    const description = text(target, '.section-heading > p') || text(target, '.about-copy > p:not(.eyebrow)') || text(target, '.contact-availability');
    addEntry(target, title, 'Section', description, `${id} ${text(target, 'h2')}`);
  });

  document.querySelectorAll('details.case-study[id]').forEach((target) => {
    addEntry(
      target,
      text(target, '.case-summary-title'),
      'Engineering notes',
      text(target, '.case-summary-note') || text(target, '.case-overview'),
      `${target.id} ${text(target, '.case-overview')} ${text(target, '.case-facts')}`
    );
  });

  const repositories = [...document.querySelectorAll('.repo-card[id]')];
  repositories.forEach((target) => {
    addEntry(
      target,
      text(target, 'h3'),
      'Repository',
      text(target, '.repo-description'),
      `${target.dataset.name || ''} ${target.dataset.category || ''} ${text(target, '.repo-area')} ${text(target, '.repo-scope')} ${text(target, '.repo-stack')}`
    );
  });

  const render = () => {
    const query = normalize(input.value);
    const terms = query.split(/\s+/).filter(Boolean);
    let matches;
    if (!query) {
      matches = entries.filter((entry) => entry.kind !== 'Repository');
    } else {
      const score = (entry) => {
        if (entry.titleSearch === query) return 100;
        if (entry.titleSearch.startsWith(query)) return 60;
        if (entry.titleSearch.includes(query)) return 40;
        return terms.filter((term) => entry.titleSearch.includes(term)).length * 5;
      };
      matches = entries.filter((entry) => terms.every((term) => entry.searchable.includes(term)));
      matches.sort((a, b) => score(b) - score(a) || a.order - b.order);
    }

    const shown = matches.slice(0, query ? 17 : 10);
    const fragment = document.createDocumentFragment();
    shown.forEach((entry) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'explore-result';
      link.href = `#${encodeURIComponent(entry.target.id)}`;
      link.dataset.exploreTarget = entry.target.id;
      [
        ['explore-result-kind', entry.kind],
        ['explore-result-title', entry.title],
        ['explore-result-description', entry.description],
        ['explore-result-arrow', '↗'],
      ].forEach(([className, value]) => {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = value;
        if (className === 'explore-result-arrow') span.setAttribute('aria-hidden', 'true');
        link.append(span);
      });
      item.append(link);
      fragment.append(item);
    });
    results.replaceChildren(fragment);
    empty.hidden = shown.length !== 0;
    if (!query) {
      status.textContent = `${shown.length} quick links. Search all ${repositories.length} public repositories.`;
    } else if (matches.length > shown.length) {
      status.textContent = `${shown.length} of ${matches.length} matches shown. Refine your search to narrow the results.`;
    } else {
      status.textContent = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}.`;
    }
    results.scrollTop = 0;
  };

  let returnFocus = trigger;
  let navigationTarget = null;

  const openExplorer = () => {
    if (dialog.open) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
    navigationTarget = null;
    input.value = '';
    render();
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    input.focus({ preventScroll: true });
  };

  const focusDestination = (target) => {
    if (!target.isConnected) return;
    const destination = target.matches('details')
      ? target.querySelector('summary')
      : target.querySelector('h3 a, h2, h3') || target;
    if (!destination) return;
    const temporaryTabIndex = !destination.hasAttribute('tabindex') && !destination.matches('a[href], button, summary');
    if (temporaryTabIndex) {
      destination.tabIndex = -1;
      destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true });
    }
    destination.focus({ preventScroll: true });
  };

  trigger.addEventListener('click', () => dialog.open ? dialog.close() : openExplorer());
  closeButton.addEventListener('click', () => dialog.close());
  input.addEventListener('input', render);

  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    // Search inputs can consume Escape to clear their value before the native
    // dialog sees it. Keep Escape consistent with the rest of the dialog.
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
      return;
    }
    const links = [...results.querySelectorAll('a')];
    if (event.key === 'ArrowDown' && links.length) {
      event.preventDefault();
      links[0].focus();
    } else if (event.key === 'ArrowUp' && links.length) {
      event.preventDefault();
      links[links.length - 1].focus();
    } else if (event.key === 'Enter' && links.length) {
      event.preventDefault();
      links[0].click();
    }
  });

  results.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const links = [...results.querySelectorAll('a')];
    const index = links.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const nextIndex = index + (event.key === 'ArrowDown' ? 1 : -1);
    if (nextIndex < 0) input.focus();
    else links[Math.min(nextIndex, links.length - 1)].focus();
  });

  results.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[data-explore-target]') : null;
    if (!link) return;
    const target = document.getElementById(link.dataset.exploreTarget);
    if (!target) return;
    const details = target.matches('details') ? target : target.closest('details');
    if (details) details.open = true;
    navigationTarget = target;
    dialog.close();
    // Keep native fragment navigation and history. The existing delegated
    // directory handler also reveals a filtered repository before navigation.
  });

  dialog.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    const destination = navigationTarget;
    navigationTarget = null;
    if (destination) {
      // Native navigation handles scrolling, including the site's motion setting.
      window.requestAnimationFrame(() => focusDestination(destination));
    } else {
      const previous = returnFocus?.isConnected && returnFocus.getClientRects().length ? returnFocus : trigger;
      previous.focus({ preventScroll: true });
    }
  });

  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLocaleLowerCase() !== 'k') return;
    event.preventDefault();
    if (event.repeat) return;
    if (dialog.open) dialog.close();
    else openExplorer();
  });

  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.hidden = false;
  trigger.classList.remove('requires-js');
})();
