(() => {
  'use strict';

  const root = document.documentElement;
  const desktop = window.matchMedia('(min-width: 960px)');
  const hero = document.querySelector('.hero-story');
  const heroStage = hero?.querySelector('.hero-stage');
  const gallery = document.querySelector('#work.work-gallery');
  const sticky = gallery?.querySelector('.gallery-sticky');
  const viewport = gallery?.querySelector('.gallery-viewport');
  const track = gallery?.querySelector('.gallery-track');
  const cards = track ? [...track.querySelectorAll('.feature-story')] : [];
  const previous = document.getElementById('gallery-prev');
  const next = document.getElementById('gallery-next');
  const position = document.getElementById('gallery-position');
  const readingLines = [...document.querySelectorAll('[data-reading] .reading-line')];
  const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
  const motionOn = () => root.dataset.motion === 'on';
  const setStyle = (element, property, value) => {
    if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
  };
  const showControl = (element, visible = true) => {
    if (!element) return;
    element.hidden = !visible;
    element.classList.remove('requires-js');
  };

  let frame = 0;
  let needsMeasurement = true;
  let pinned = false;
  let distance = 0;
  let galleryStart = 0;
  let heroStart = 0;
  let heroRange = 0;
  let cardStops = [];
  let currentCard = 0;
  let keyboardNavigation = true;

  const updatePosition = (index) => {
    currentCard = index;
    if (position) {
      const text = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      if (position.textContent !== text) position.textContent = text;
    }
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index >= cards.length - 1;
  };

  const unpinGallery = () => {
    pinned = false;
    distance = 0;
    cardStops = [];
    if (gallery) {
      delete gallery.dataset.pinned;
      gallery.style.removeProperty('height');
      gallery.style.removeProperty('--gallery-distance');
      gallery.style.removeProperty('--gallery-x');
    }
    if (viewport) viewport.scrollLeft = 0;
    showControl(previous, false);
    showControl(next, false);
    updatePosition(0);
  };

  const measure = () => {
    needsMeasurement = false;
    const enhanced = desktop.matches && motionOn();
    if (hero && heroStage && enhanced) {
      heroStart = hero.getBoundingClientRect().top + window.scrollY;
      heroRange = Math.max(0, hero.offsetHeight - heroStage.offsetHeight);
    } else {
      heroRange = 0;
      hero?.style.removeProperty('--hero-progress');
    }

    if (!enhanced || !gallery || !sticky || !viewport || !track || cards.length < 2) {
      unpinGallery();
      return;
    }

    // Base CSS is a complete vertical gallery. Measure its horizontal variant
    // only after opting in, without hiding any of the original articles.
    gallery.dataset.pinned = 'true';
    const measuredDistance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    if (measuredDistance < 1) {
      unpinGallery();
      return;
    }

    pinned = true;
    distance = measuredDistance;
    const top = Number.parseFloat(window.getComputedStyle(sticky).top) || 0;
    const stickyHeight = sticky.getBoundingClientRect().height;
    const sectionTop = gallery.getBoundingClientRect().top + window.scrollY;
    galleryStart = sectionTop - top;
    const firstCardLeft = cards[0].getBoundingClientRect().left;
    // Keep the track's intentional leading gutter when advancing a card.
    cardStops = cards.map((card) => clamp(card.getBoundingClientRect().left - firstCardLeft, 0, distance));
    setStyle(gallery, '--gallery-distance', `${distance}px`);
    setStyle(gallery, 'height', `${Math.ceil(stickyHeight + distance)}px`);
    showControl(previous);
    showControl(next);
    // Overflow clipping should prevent this; reset browsers that scroll a
    // clipped ancestor while bringing a newly focused link into view.
    viewport.scrollLeft = 0;
  };

  const update = () => {
    frame = 0;
    if (document.hidden) return;
    if (needsMeasurement) measure();

    if (hero && heroRange > 0) {
      setStyle(hero, '--hero-progress', clamp((window.scrollY - heroStart) / heroRange).toFixed(4));
    }
    if (pinned) {
      const travelled = clamp(window.scrollY - galleryStart, 0, distance);
      setStyle(gallery, '--gallery-x', `${-travelled.toFixed(2)}px`);
      const closest = cardStops.reduce((best, stop, index) =>
        Math.abs(stop - travelled) < Math.abs(cardStops[best] - travelled) ? index : best, 0);
      updatePosition(closest);
    }
    readingLines.forEach((line) => {
      if (!motionOn()) {
        line.style.removeProperty('--read-progress');
        return;
      }
      const bounds = line.getBoundingClientRect();
      const progress = clamp((window.innerHeight * 0.85 - bounds.top) / (window.innerHeight * 0.4 + bounds.height));
      setStyle(line, '--read-progress', progress.toFixed(4));
    });
  };

  const schedule = (remeasure = false) => {
    if (remeasure) needsMeasurement = true;
    if (document.hidden || frame) return;
    frame = window.requestAnimationFrame(update);
  };

  const scrollToCard = (index, behavior = 'smooth') => {
    if (!pinned || !cardStops.length) return;
    const destination = clamp(index, 0, cards.length - 1);
    window.scrollTo({
      top: galleryStart + cardStops[destination],
      behavior: motionOn() ? behavior : 'instant'
    });
  };

  previous?.addEventListener('click', () => scrollToCard(currentCard - 1));
  next?.addEventListener('click', () => scrollToCard(currentCard + 1));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') keyboardNavigation = true;
  });
  document.addEventListener('pointerdown', () => { keyboardNavigation = false; }, { passive: true });
  track?.addEventListener('focusin', (event) => {
    if (!pinned || !keyboardNavigation) return;
    const card = event.target.closest('.feature-story');
    const index = cards.indexOf(card);
    if (index < 0) return;
    viewport.scrollLeft = 0;
    // Instant alignment lets the focused link remain visible through repeated
    // Tab presses rather than competing with an unfinished smooth scroll.
    scrollToCard(index, 'instant');
    schedule();
  });

  window.addEventListener('scroll', () => schedule(), { passive: true });
  window.addEventListener('resize', () => schedule(true), { passive: true });
  window.addEventListener('load', () => schedule(true), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    } else schedule(true);
  });
  const onBreakpoint = () => schedule(true);
  if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
  else desktop.addListener(onBreakpoint);
  new MutationObserver(() => {
    // Motion off must also work while this tab is hidden, without waiting for
    // another animation frame to restore the ordinary document layout.
    if (!motionOn()) {
      unpinGallery();
      hero?.style.removeProperty('--hero-progress');
      readingLines.forEach((line) => line.style.removeProperty('--read-progress'));
    }
    schedule(true);
  }).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => schedule(true));
    [hero, heroStage, sticky, viewport, track].filter(Boolean).forEach((element) => observer.observe(element));
  }
  if (document.fonts?.ready) document.fonts.ready.then(() => schedule(true));
  schedule(true);

  const dialog = document.getElementById('site-menu');
  const menuToggle = document.getElementById('menu-toggle');
  if (!dialog || !menuToggle || typeof dialog.showModal !== 'function') return;

  const menuLinks = [...dialog.querySelectorAll('a[data-menu-link]')];
  let restoreMenuFocus = true;
  let returnFocus = menuToggle;
  const preview = (link) => {
    const index = link.dataset.previewIndex ?? link.dataset.menuLink;
    if (index !== undefined && index !== '') dialog.dataset.preview = index;
  };
  const closeMenu = (restore = true) => {
    restoreMenuFocus = restore;
    if (dialog.open) dialog.close();
  };
  const hashTarget = (link) => {
    try {
      const url = new URL(link.href, window.location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return null;
      return document.getElementById(decodeURIComponent(url.hash.slice(1)));
    } catch {
      return null;
    }
  };
  const focusTarget = (target) => {
    const heading = target.matches('h1,h2,h3,h4,h5,h6,summary')
      ? target : target.querySelector('h1,h2,h3,h4,h5,h6,summary') || target;
    const hadTabindex = heading.hasAttribute('tabindex');
    if (!hadTabindex) {
      heading.setAttribute('tabindex', '-1');
      heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
    }
    heading.focus({ preventScroll: true });
  };

  menuToggle.setAttribute('aria-controls', dialog.id);
  menuToggle.setAttribute('aria-haspopup', 'dialog');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.addEventListener('click', () => {
    if (dialog.open) {
      closeMenu();
      return;
    }
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : menuToggle;
    restoreMenuFocus = true;
    dialog.showModal();
    menuToggle.setAttribute('aria-expanded', 'true');
  });
  dialog.querySelectorAll('[data-menu-close]').forEach((button) => button.addEventListener('click', () => closeMenu()));
  dialog.addEventListener('cancel', () => { restoreMenuFocus = true; });
  dialog.addEventListener('close', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    if (restoreMenuFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
  });
  menuLinks.forEach((link) => {
    link.addEventListener('pointerenter', () => preview(link));
    link.addEventListener('focus', () => preview(link));
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = hashTarget(link);
      closeMenu(!target);
      // Native anchors keep browser history and any case/repository handlers.
      if (target) window.requestAnimationFrame(() => focusTarget(target));
    });
  });
  const firstPreviewLink = menuLinks.find((link) => link.dataset.previewIndex !== undefined || link.dataset.menuLink);
  if (firstPreviewLink) preview(firstPreviewLink);
  showControl(menuToggle);
})();
