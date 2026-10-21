(() => {
  'use strict';

  // Small, event-driven details. The larger scroll scenes live in story.js.
  const root = document.documentElement;
  const halo = document.querySelector('.cursor-halo');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const activeAnimations = new Set();
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  let motion = root.dataset.motion === 'on';
  let inputFrame = 0;
  let pendingPointer = null;
  let magneticElement = null;

  const resetMagnet = () => {
    if (magneticElement) magneticElement.style.translate = '0px 0px';
    magneticElement = null;
  };
  const resetPointer = () => {
    if (inputFrame) window.cancelAnimationFrame(inputFrame);
    inputFrame = 0;
    pendingPointer = null;
    resetMagnet();
    if (halo) halo.dataset.active = 'false';
  };
  const applyPointer = () => {
    inputFrame = 0;
    if (!pendingPointer || !motion || !finePointer.matches) return;
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
  };
  document.addEventListener('pointermove', (event) => {
    if (document.hidden || !motion || !finePointer.matches || event.pointerType === 'touch' || !(event.target instanceof Element)) return;
    pendingPointer = { x: event.clientX, y: event.clientY, target: event.target };
    if (!inputFrame) inputFrame = window.requestAnimationFrame(applyPointer);
  }, { passive: true });
  document.addEventListener('pointerleave', resetPointer);
  window.addEventListener('blur', resetPointer);
  if (finePointer.addEventListener) finePointer.addEventListener('change', resetPointer);

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      visible.forEach((entry, index) => {
        revealObserver.unobserve(entry.target);
        if (!motion || typeof entry.target.animate !== 'function') return;
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

  const syncPreferences = () => {
    motion = root.dataset.motion === 'on';
    if (!motion) {
      resetPointer();
      activeAnimations.forEach((animation) => animation.cancel());
      activeAnimations.clear();
    }
  };
  new MutationObserver(syncPreferences).observe(root, {
    attributes: true, attributeFilter: ['data-motion']
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetPointer();
  });
  window.addEventListener('pagehide', resetPointer);
})();
