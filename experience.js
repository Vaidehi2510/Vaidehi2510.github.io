(() => {
  'use strict';

  const root = document.documentElement;
  const halo = document.querySelector('.cursor-halo');
  const heroCopy = document.querySelector('.hero-copy');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const parallaxElements = [...document.querySelectorAll('[data-parallax]')];
  const activeAnimations = new Set();
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const motionAllowed = () => root.dataset.motion === 'on';

  let motion = motionAllowed();
  let inputFrame = 0;
  let scrollFrame = 0;
  let pendingPointer = null;
  let magneticElement = null;
  let tiltedElement = null;

  const resetMagnet = () => {
    if (magneticElement) magneticElement.style.translate = '0px 0px';
    magneticElement = null;
  };
  const resetTilt = () => {
    if (tiltedElement) {
      tiltedElement.style.setProperty('--tilt-x', '0deg');
      tiltedElement.style.setProperty('--tilt-y', '0deg');
      tiltedElement.style.setProperty('--pointer-x', '50%');
      tiltedElement.style.setProperty('--pointer-y', '50%');
    }
    tiltedElement = null;
  };
  const resetPointer = () => {
    if (inputFrame) window.cancelAnimationFrame(inputFrame);
    inputFrame = 0;
    pendingPointer = null;
    resetMagnet();
    resetTilt();
    if (halo) halo.dataset.active = 'false';
  };
  const applyPointer = () => {
    inputFrame = 0;
    if (!pendingPointer || !motion || !finePointer.matches || document.hidden) return;
    const { x, y, target } = pendingPointer;
    if (halo) {
      halo.style.translate = `${x}px ${y}px`;
      halo.dataset.active = 'true';
      halo.dataset.interactive = String(!!target.closest('a, button, summary, input, select, textarea, [role="tab"]'));
    }
    const nextMagnet = target.closest('[data-magnetic]');
    if (nextMagnet !== magneticElement) resetMagnet();
    magneticElement = nextMagnet;
    if (magneticElement) {
      const bounds = magneticElement.getBoundingClientRect();
      const xOffset = clamp((x - bounds.left) / Math.max(bounds.width, 1) - 0.5, -0.5, 0.5);
      const yOffset = clamp((y - bounds.top) / Math.max(bounds.height, 1) - 0.5, -0.5, 0.5);
      magneticElement.style.translate = `${(xOffset * 9).toFixed(2)}px ${(yOffset * 7).toFixed(2)}px`;
    }
    const nextTilt = target.closest('[data-tilt]');
    if (nextTilt !== tiltedElement) resetTilt();
    tiltedElement = nextTilt;
    if (tiltedElement) {
      const bounds = tiltedElement.getBoundingClientRect();
      const xRatio = clamp((x - bounds.left) / Math.max(bounds.width, 1), 0, 1);
      const yRatio = clamp((y - bounds.top) / Math.max(bounds.height, 1), 0, 1);
      tiltedElement.style.setProperty('--tilt-x', `${((0.5 - yRatio) * 5).toFixed(2)}deg`);
      tiltedElement.style.setProperty('--tilt-y', `${((xRatio - 0.5) * 5).toFixed(2)}deg`);
      tiltedElement.style.setProperty('--pointer-x', `${(xRatio * 100).toFixed(2)}%`);
      tiltedElement.style.setProperty('--pointer-y', `${(yRatio * 100).toFixed(2)}%`);
    }
  };
  document.addEventListener('pointermove', (event) => {
    if (!motion || document.hidden || !finePointer.matches || event.pointerType === 'touch' || !(event.target instanceof Element)) return;
    pendingPointer = { x: event.clientX, y: event.clientY, target: event.target };
    if (!inputFrame) inputFrame = window.requestAnimationFrame(applyPointer);
  }, { passive: true });
  document.addEventListener('pointerleave', resetPointer);
  window.addEventListener('blur', resetPointer);
  if (finePointer.addEventListener) finePointer.addEventListener('change', resetPointer);

  const updateScroll = () => {
    scrollFrame = 0;
    if (!motion || document.hidden) return;
    const scroll = window.scrollY;
    if (heroCopy) {
      const progress = clamp(scroll / Math.max(window.innerHeight, 1), 0, 1);
      heroCopy.style.setProperty('--hero-y', `${(progress * 22).toFixed(2)}px`);
      heroCopy.style.setProperty('--hero-opacity', String(1 - progress * 0.12));
    }
    parallaxElements.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const value = Number.parseFloat(element.dataset.parallax);
      const strength = Number.isFinite(value) ? clamp(value, -1, 1) : 0.05;
      const offset = (bounds.top + bounds.height / 2 - window.innerHeight / 2) * strength;
      element.style.setProperty('--parallax-y', `${clamp(offset, -28, 28).toFixed(2)}px`);
    });
  };
  const queueScroll = () => {
    if (!motion || document.hidden || scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScroll);
  };
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  updateScroll();

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      visible.forEach((entry, index) => {
        revealObserver.unobserve(entry.target);
        if (!motion || document.hidden || typeof entry.target.animate !== 'function') return;
        const animation = entry.target.animate([
          { opacity: 0.2, transform: 'translate3d(0, 28px, 0)', filter: 'blur(3px)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0)', filter: 'blur(0px)' }
        ], { duration: 850, delay: Math.min(index * 75, 225), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
        activeAnimations.add(animation);
        const clear = () => activeAnimations.delete(animation);
        animation.addEventListener('finish', clear, { once: true });
        animation.addEventListener('cancel', clear, { once: true });
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -18px 0px' });
    document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
  }

  const cancelAnimations = () => {
    activeAnimations.forEach((animation) => animation.cancel());
    activeAnimations.clear();
  };
  const cancelScroll = () => {
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  };
  const syncPreferences = () => {
    const nextMotion = motionAllowed();
    if (nextMotion === motion) return;
    motion = nextMotion;
    if (!motion) {
      resetPointer();
      cancelAnimations();
      cancelScroll();
      if (heroCopy) {
        heroCopy.style.setProperty('--hero-y', '0px');
        heroCopy.style.setProperty('--hero-opacity', '1');
      }
      parallaxElements.forEach((element) => element.style.setProperty('--parallax-y', '0px'));
    } else {
      queueScroll();
    }
  };
  new MutationObserver(syncPreferences).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resetPointer();
      cancelAnimations();
      cancelScroll();
    } else {
      queueScroll();
    }
  });
  window.addEventListener('pagehide', () => {
    resetPointer();
    cancelAnimations();
    cancelScroll();
  });
  window.addEventListener('pageshow', queueScroll);
})();
