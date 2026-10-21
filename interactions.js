(() => {
  'use strict';

  const root = document.documentElement;
  const animations = new Set();
  const elementAnimations = new WeakMap();
  const tabControllers = new Map();
  const maps = [...document.querySelectorAll('.security-map')];
  const motionAllowed = () => root.dataset.motion === 'on';

  const showControl = (element) => {
    if (!element) return;
    element.hidden = false;
    element.classList.remove('requires-js');
  };

  const cancelAnimation = (element) => {
    elementAnimations.get(element)?.cancel();
    elementAnimations.delete(element);
  };

  const enter = (element, distance = 12) => {
    cancelAnimation(element);
    if (!motionAllowed() || typeof element.animate !== 'function') return;
    const animation = element.animate([
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
    animations.add(animation);
    elementAnimations.set(element, animation);
    const release = () => {
      animations.delete(animation);
      if (elementAnimations.get(element) === animation) elementAnimations.delete(element);
    };
    animation.addEventListener('finish', release, { once: true });
    animation.addEventListener('cancel', release, { once: true });
  };

  const syncMap = (map) => {
    const buttons = [...map.querySelectorAll('[data-area-target]')];
    const focused = buttons.find((button) => button === document.activeElement);
    const hovered = buttons.find((button) => button.matches(':hover'));
    const selected = buttons.find((button) =>
      document.getElementById(button.dataset.areaTarget)?.getAttribute('aria-selected') === 'true'
    );
    const active = focused || hovered || selected;
    if (active) map.dataset.active = active.dataset.areaTarget;
    else delete map.dataset.active;
  };

  document.querySelectorAll('[data-tab-group]').forEach((group) => {
    const tabs = [...group.querySelectorAll('.panel-tabs [role="tab"][aria-controls]')]
      .filter((tab) => tab.closest('[data-tab-group]') === group)
      .filter((tab) => {
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        return panel?.getAttribute('role') === 'tabpanel' && panel.closest('[data-tab-group]') === group;
      });
    if (!tabs.length) return;

    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    let selectedTab = null;

    const select = (tab, { focus = false, animate = true } = {}) => {
      if (!tabs.includes(tab)) return;
      const changed = selectedTab !== tab;
      tabs.forEach((item, index) => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        cancelAnimation(panels[index]);
        panels[index].hidden = !selected;
      });
      selectedTab = tab;
      group.dataset.activeTab = tab.id || tab.getAttribute('aria-controls');
      if (focus) tab.focus({ preventScroll: true });
      const tablist = tab.closest('.panel-tabs');
      if (tablist && tablist.scrollWidth > tablist.clientWidth) {
        const bounds = tablist.getBoundingClientRect();
        const tabBounds = tab.getBoundingClientRect();
        const offset = tabBounds.left < bounds.left ? tabBounds.left - bounds.left - 8
          : tabBounds.right > bounds.right ? tabBounds.right - bounds.right + 8 : 0;
        if (offset) tablist.scrollBy({ left: offset, behavior: 'instant' });
      }
      if (changed && animate) enter(panels[tabs.indexOf(tab)]);
      maps.forEach(syncMap);
    };

    tabs.forEach((tab, index) => {
      tabControllers.set(tab, { select, group });
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        let nextIndex;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        select(tabs[nextIndex], { focus: true });
      });
    });

    select(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0], { animate: false });
    group.dataset.tabsReady = 'true';
    group.querySelectorAll('.panel-tabs').forEach((tablist) => {
      if (tablist.closest('[data-tab-group]') === group) showControl(tablist);
    });
  });

  const tabLayout = window.matchMedia('(max-width: 720px)');
  const updateTabOrientation = () => {
    document.querySelectorAll('.panel-tabs[role="tablist"]').forEach((tablist) => {
      const vertical = window.getComputedStyle(tablist).flexDirection.startsWith('column');
      tablist.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
    });
  };
  updateTabOrientation();
  if (tabLayout.addEventListener) tabLayout.addEventListener('change', updateTabOrientation);
  else tabLayout.addListener(updateTabOrientation);

  maps.forEach((map) => {
    map.querySelectorAll('[data-area-target]').forEach((button) => {
      const tab = document.getElementById(button.dataset.areaTarget);
      const controller = tabControllers.get(tab);
      if (!controller) return;
      button.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        controller.select(tab, { focus: true });
        const destination = document.getElementById('work') || controller.group;
        destination.scrollIntoView({ block: 'start', behavior: motionAllowed() ? 'smooth' : 'instant' });
      });
      ['pointerenter', 'pointerleave', 'focus', 'blur'].forEach((type) => {
        button.addEventListener(type, () => syncMap(map));
      });
    });
    syncMap(map);
  });

  // Fragment links remain useful even when their destination is inside an
  // inactive tab. Native fragment navigation still owns browser history.
  const findTarget = (hash) => {
    try { return hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; }
    catch { return null; }
  };
  const revealTargetPanel = (target) => {
    const ancestors = [];
    for (let panel = target?.closest('[role="tabpanel"]'); panel; panel = panel.parentElement?.closest('[role="tabpanel"]')) {
      ancestors.unshift(panel);
    }
    ancestors.forEach((panel) => {
      for (const [tab, controller] of tabControllers) {
        if (tab.getAttribute('aria-controls') === panel.id) controller.select(tab, { animate: false });
      }
    });
  };
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.origin !== window.location.origin || link.pathname !== window.location.pathname || link.search !== window.location.search) return;
    if (link.hasAttribute('data-area-target') && link.closest('.security-map')) return;
    revealTargetPanel(findTarget(link.hash));
  }, true);
  const revealHash = () => revealTargetPanel(findTarget(window.location.hash));
  window.addEventListener('hashchange', revealHash);
  revealHash();

  const header = document.querySelector('.site-header');
  const menuButton = document.getElementById('nav-menu-toggle');
  const navigation = document.getElementById('primary-nav');
  if (header && menuButton && navigation) {
    const mobile = window.matchMedia('(max-width: 720px)');
    let menuOpen = false;
    const setMenu = (open, restoreFocus = false) => {
      menuOpen = mobile.matches && open;
      header.dataset.menuOpen = String(menuOpen);
      menuButton.setAttribute('aria-expanded', String(menuOpen));
      menuButton.setAttribute('aria-label', menuOpen ? 'Close navigation' : 'Open navigation');
      navigation.hidden = mobile.matches && !menuOpen;
      if (restoreFocus) menuButton.focus({ preventScroll: true });
    };
    menuButton.setAttribute('aria-controls', navigation.id);
    menuButton.addEventListener('click', () => setMenu(!menuOpen));
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a[href]')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuOpen) {
        event.preventDefault();
        setMenu(false, true);
      }
    });
    document.addEventListener('click', (event) => {
      if (menuOpen && !header.contains(event.target)) setMenu(false);
    });
    const resetMenu = () => setMenu(false);
    if (mobile.addEventListener) mobile.addEventListener('change', resetMenu);
    else mobile.addListener(resetMenu);
    root.dataset.navigation = 'enhanced';
    setMenu(false);
    showControl(menuButton);
  }

  if (header) {
    let scrollFrame = 0;
    const updateHeader = () => {
      scrollFrame = 0;
      header.dataset.scrolled = String(window.scrollY > 24);
    };
    window.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateHeader);
    }, { passive: true });
    updateHeader();
  }

  document.querySelectorAll('details.panel-disclosure, details.experience-entry, details.skill-details').forEach((details) => {
    details.addEventListener('toggle', () => {
      [...details.children].filter((child) => child.tagName !== 'SUMMARY').forEach((child) => {
        if (details.open) enter(child, 8);
        else cancelAnimation(child);
      });
    });
  });

  new MutationObserver(() => {
    if (motionAllowed()) return;
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  }).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
})();
