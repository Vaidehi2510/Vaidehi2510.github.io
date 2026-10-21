(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const runningAnimations = new Set();

  const readPreference = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const savePreference = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Preferences still work for this visit if storage is unavailable.
    }
  };

  const showControl = (element) => {
    if (!element) return;
    element.hidden = false;
    element.classList.remove('requires-js');
  };

  const observePreference = (query, listener) => {
    if (query.addEventListener) query.addEventListener('change', listener);
    else query.addListener(listener);
  };

  let themePreference = readPreference('vp-theme');
  if (!['light', 'dark'].includes(themePreference)) themePreference = null;
  const themeButton = document.getElementById('theme-toggle');

  const setTheme = (theme) => {
    root.dataset.theme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === 'dark' ? '#100d18' : '#f7f3ed';
    if (!themeButton) return;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    themeButton.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
    const label = themeButton.querySelector('[data-theme-label]');
    if (label) label.textContent = `${nextTheme === 'light' ? 'Light' : 'Dark'} mode`;
  };

  setTheme(themePreference || 'dark');
  if (themeButton) {
    themeButton.addEventListener('click', () => {
      themePreference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(themePreference);
      savePreference('vp-theme', themePreference);
    });
    showControl(themeButton);
  }

  let motionPreference = readPreference('vp-motion');
  if (!['on', 'off'].includes(motionPreference)) motionPreference = null;
  let motionEnabled = false;
  const motionButton = document.getElementById('motion-toggle');

  const setMotion = (enabled) => {
    motionEnabled = enabled;
    root.dataset.motion = enabled ? 'on' : 'off';
    if (!enabled) {
      runningAnimations.forEach((animation) => animation.cancel());
      runningAnimations.clear();
    }
    if (!motionButton) return;
    motionButton.setAttribute('aria-label', enabled ? 'Pause animations' : 'Resume animations');
    motionButton.setAttribute('aria-pressed', String(!enabled));
    const label = motionButton.querySelector('[data-motion-label]');
    if (label) label.textContent = enabled ? 'Motion on' : 'Motion off';
  };

  setMotion(motionPreference ? motionPreference === 'on' : !reducedMotion.matches);
  if (motionButton) {
    motionButton.addEventListener('click', () => {
      motionPreference = motionEnabled ? 'off' : 'on';
      setMotion(motionPreference === 'on');
      savePreference('vp-motion', motionPreference);
    });
    showControl(motionButton);
  }
  observePreference(reducedMotion, (event) => {
    if (!motionPreference) setMotion(!event.matches);
  });

  const animate = (element, keyframes, options) => {
    if (!motionEnabled || typeof element.animate !== 'function') return null;
    const animation = element.animate(keyframes, options);
    runningAnimations.add(animation);
    const release = () => runningAnimations.delete(animation);
    animation.addEventListener('finish', release, { once: true });
    animation.addEventListener('cancel', release, { once: true });
    return animation;
  };

  const demo = document.getElementById('design-demo');
  if (demo) {
    const tabs = [...demo.querySelectorAll('.demo-tab[data-target]')].filter((tab) =>
      document.getElementById(tab.dataset.target)
    );
    let panelAnimation = null;

    const selectTab = (selectedTab, shouldFocus = false, shouldAnimate = true) => {
      const selectedPanel = document.getElementById(selectedTab.dataset.target);
      const changed = selectedTab.getAttribute('aria-selected') !== 'true';
      if (panelAnimation) panelAnimation.cancel();
      tabs.forEach((tab) => {
        const selected = tab === selectedTab;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        document.getElementById(tab.dataset.target).hidden = !selected;
      });
      demo.dataset.mode = selectedTab.dataset.target.replace(/^demo-/, '');
      const coordinate = demo.querySelector('.lab-coordinate');
      if (coordinate) coordinate.textContent = `0${tabs.indexOf(selectedTab) + 1} / 03`;
      if (shouldFocus) selectedTab.focus();
      if (changed && shouldAnimate) {
        panelAnimation = animate(
          selectedPanel,
          [{ opacity: 0.35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 220, easing: 'ease-out' }
        );
      }
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', (event) => {
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        selectTab(tabs[nextIndex], true);
      });
      showControl(tab);
    });
    if (tabs.length) {
      selectTab(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0], false, false);
      demo.querySelectorAll('[role="tablist"].requires-js').forEach(showControl);
    }
  }

  const progress = document.getElementById('reading-progress');
  const navigation = [...document.querySelectorAll('a[data-nav]')]
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter(({ section }) => section);
  let scrollFramePending = false;

  const updateScroll = () => {
    scrollFramePending = false;
    const availableScroll = root.scrollHeight - window.innerHeight;
    if (progress) {
      const fraction = availableScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / availableScroll)) : 0;
      progress.style.transform = `scaleX(${fraction})`;
    }
    const marker = Math.min(220, window.innerHeight * 0.3);
    let currentSection = null;
    navigation.forEach(({ section }) => {
      if (section.getBoundingClientRect().top <= marker) currentSection = section;
    });
    if (availableScroll > 0 && window.scrollY >= availableScroll - 2 && navigation.length) {
      currentSection = navigation[navigation.length - 1].section;
    }
    navigation.forEach(({ link, section }) => {
      if (section === currentSection) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const scheduleScrollUpdate = () => {
    if (scrollFramePending) return;
    scrollFramePending = true;
    window.requestAnimationFrame(updateScroll);
  };
  if (progress || navigation.length) {
    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
    window.addEventListener('resize', scheduleScrollUpdate);
    window.addEventListener('load', scheduleScrollUpdate, { once: true });
    document.addEventListener('toggle', scheduleScrollUpdate, true);
    if ('ResizeObserver' in window) new ResizeObserver(scheduleScrollUpdate).observe(document.body);
    updateScroll();
  }

  const findHashTarget = (hash) => {
    if (!hash || hash === '#') return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  };

  const openCaseStudy = (hash, focusSummary = false) => {
    const target = findHashTarget(hash);
    if (!target) return null;
    const details = target.matches('details') ? target : target.closest('details');
    if (!details) return null;
    const wasClosed = !details.open;
    details.open = true;
    if (focusSummary) {
      const summary = details.querySelector('summary');
      if (summary) summary.focus({ preventScroll: true });
    }
    return { target, wasClosed };
  };

  document.querySelectorAll('a[data-case-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const openedCase = openCaseStudy(link.hash);
      if (openedCase) {
        window.requestAnimationFrame(() => {
          const summary = openedCase.target.querySelector('summary');
          if (summary) summary.focus({ preventScroll: true });
        });
      }
      // The browser owns fragment navigation and its normal back/forward history.
    });
  });

  const revealHashTarget = () => {
    const openedCase = openCaseStudy(window.location.hash);
    if (openedCase && openedCase.wasClosed) {
      window.requestAnimationFrame(() => openedCase.target.scrollIntoView({ block: 'start', behavior: 'instant' }));
    }
  };
  window.addEventListener('hashchange', revealHashTarget);
  revealHashTarget();

  const copyButton = document.getElementById('copy-email');
  const copyStatus = document.getElementById('copy-status');
  if (copyButton && copyStatus && copyButton.dataset.email) {
    copyButton.addEventListener('click', async () => {
      copyButton.disabled = true;
      copyStatus.textContent = '';
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(copyButton.dataset.email);
        copyStatus.textContent = 'Email address copied.';
      } catch {
        copyStatus.textContent = 'Select the email address to copy it.';
      } finally {
        copyButton.disabled = false;
      }
    });
    showControl(copyButton);
  }
})();
