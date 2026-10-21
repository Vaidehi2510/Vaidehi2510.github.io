(() => {
  'use strict';

  const root = document.documentElement;
  const canvas = document.getElementById('signal-canvas');
  const observatory = document.getElementById('signal-observatory');
  const demo = document.getElementById('design-demo');
  const halo = document.querySelector('.cursor-halo');
  const heroCopy = document.querySelector('.hero-copy');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const parallaxElements = [...document.querySelectorAll('[data-parallax]')];
  const activeAnimations = new Set();
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const motionAllowed = () => root.dataset.motion === 'on';

  let motion = motionAllowed();
  let canvasVisible = false;
  let canvasFrame = 0;
  let inputFrame = 0;
  let scrollFrame = 0;
  let lastFrame = 0;
  let sceneTime = 0;
  let sceneWidth = 0;
  let sceneHeight = 0;
  let targetMode = 0;
  let currentMode = 0;
  let previousMode = 0;
  let modeMix = 1;
  let pointer = { x: 0, y: 0 };
  let targetPointer = { x: 0, y: 0 };
  let pendingPointer = null;
  let magneticElement = null;
  let tiltedElement = null;
  let context = null;

  try {
    context = canvas && canvas.getContext('2d', { alpha: true });
  } catch {
    // The CSS sculpture remains visible if canvas is unavailable.
  }

  const palettes = [
    [[191, 171, 255], [255, 192, 165], [208, 225, 255]],
    [[168, 199, 255], [222, 194, 255], [193, 240, 230]],
    [[255, 199, 167], [220, 182, 255], [255, 232, 205]]
  ];
  const geometry = [];
  const familyCount = 3;
  const ribbonCount = 11;
  const sampleCount = 84;
  const turn = Math.PI * 2;

  const rotatePoint = (point, xAngle, yAngle, zAngle = 0) => {
    const xCos = Math.cos(xAngle);
    const xSin = Math.sin(xAngle);
    const yCos = Math.cos(yAngle);
    const ySin = Math.sin(yAngle);
    const zCos = Math.cos(zAngle);
    const zSin = Math.sin(zAngle);
    const y = point.y * xCos - point.z * xSin;
    const z = point.y * xSin + point.z * xCos;
    const x = point.x * yCos + z * ySin;
    const rotatedZ = -point.x * ySin + z * yCos;
    return { x: x * zCos - y * zSin, y: x * zSin + y * zCos, z: rotatedZ };
  };

  // Three hand-shaped arrangements share topology, so changing the workflow
  // gently reshapes the sculpture instead of replacing it with a new scene.
  for (let mode = 0; mode < 3; mode += 1) {
    const ribbons = [];
    for (let family = 0; family < familyCount; family += 1) {
      for (let ribbon = 0; ribbon < ribbonCount; ribbon += 1) {
        const offset = (ribbon / (ribbonCount - 1) - 0.5) * 0.25;
        const points = [];
        for (let sample = 0; sample <= sampleCount; sample += 1) {
          const angle = sample / sampleCount * turn;
          const phase = family * turn / familyCount;
          const wave = Math.sin(angle * (mode === 1 ? 2 : 3) + phase);
          const radius = 0.89 + Math.cos(angle * 3 + phase) * (mode === 1 ? 0.045 : 0.09);
          const point = {
            x: Math.cos(angle) * (radius + offset * 0.72),
            y: Math.sin(angle) * (radius + offset * 0.72),
            z: wave * (mode === 2 ? 0.31 : 0.2) + offset * 0.92
          };
          points.push(rotatePoint(point,
            0.46 + family * 0.82 + mode * 0.13,
            -0.32 + family * 0.53 - mode * 0.1,
            family * turn / familyCount + mode * 0.18
          ));
        }
        ribbons.push({ family, ribbon, points });
      }
    }
    geometry.push(ribbons);
  }

  const colorFor = (family, alpha, light) => {
    const before = palettes[previousMode][family];
    const after = palettes[targetMode][family];
    const channel = (index) => {
      const value = before[index] + (after[index] - before[index]) * modeMix;
      return Math.round(light ? value * 0.55 : value);
    };
    return `rgba(${channel(0)},${channel(1)},${channel(2)},${alpha})`;
  };

  const drawScene = () => {
    if (!context || !sceneWidth || !sceneHeight) return;
    const width = sceneWidth;
    const height = sceneHeight;
    const light = root.dataset.theme === 'light';
    const centerX = width * 0.5;
    const centerY = height * 0.49;
    const radius = Math.min(width, height) * 0.365;
    context.clearRect(0, 0, width, height);

    const haze = context.createRadialGradient(centerX, centerY, radius * 0.05, centerX, centerY, radius * 1.38);
    haze.addColorStop(0, light ? 'rgba(144,105,212,0.055)' : 'rgba(163,118,255,0.09)');
    haze.addColorStop(0.58, light ? 'rgba(157,128,212,0.035)' : 'rgba(153,122,245,0.045)');
    haze.addColorStop(1, 'rgba(145,110,220,0)');
    context.fillStyle = haze;
    context.fillRect(0, 0, width, height);

    const yaw = sceneTime * 0.075 + 0.55 + pointer.x * 0.2;
    const pitch = -0.22 + Math.sin(sceneTime * 0.11) * 0.13 + pointer.y * 0.14;
    const roll = -0.16 + Math.sin(sceneTime * 0.07) * 0.12;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosX = Math.cos(pitch);
    const sinX = Math.sin(pitch);
    const cosZ = Math.cos(roll);
    const sinZ = Math.sin(roll);
    const project = (point) => {
      const y = point.y * cosX - point.z * sinX;
      const z = point.y * sinX + point.z * cosX;
      const x = point.x * cosY + z * sinY;
      const depth = -point.x * sinY + z * cosY;
      const perspective = 3.6 / (3.6 - depth);
      return {
        x: centerX + (x * cosZ - y * sinZ) * radius * perspective,
        y: centerY + (x * sinZ + y * cosZ) * radius * perspective,
        z: depth
      };
    };

    const paths = [];
    const ribbonStep = width < 420 ? 2 : 1;
    geometry[targetMode].forEach((ribbon, ribbonIndex) => {
      if (ribbon.ribbon % ribbonStep !== 0) return;
      const oldPoints = geometry[previousMode][ribbonIndex].points;
      const projected = ribbon.points.map((point, index) => {
        const old = oldPoints[index];
        return project({
          x: old.x + (point.x - old.x) * modeMix,
          y: old.y + (point.y - old.y) * modeMix,
          z: old.z + (point.z - old.z) * modeMix
        });
      });
      for (let index = 0; index < sampleCount; index += 7) {
        const points = projected.slice(index, index + 8);
        paths.push({ points, depth: points.reduce((sum, point) => sum + point.z, 0) / points.length,
          family: ribbon.family, ribbon: ribbon.ribbon });
      }
    });
    paths.sort((first, second) => first.depth - second.depth);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    paths.forEach((path) => {
      const front = clamp((path.depth + 1.2) / 2.4, 0, 1);
      const edge = path.ribbon === 0 || path.ribbon === ribbonCount - 1;
      const alpha = (light ? 0.24 : 0.16) + front * (edge ? 0.68 : 0.55);
      context.beginPath();
      path.points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.strokeStyle = colorFor(path.family, alpha.toFixed(3), light);
      context.lineWidth = edge ? 1.25 + front * 0.45 : 0.65 + front * 0.4;
      context.stroke();
    });

    // A few points travel along the same ribbons. They are abstract signals,
    // not an invented representation of live security events.
    for (let index = 0; index < 6; index += 1) {
      const family = index % familyCount;
      const ribbon = geometry[targetMode][family * ribbonCount + 5];
      const oldRibbon = geometry[previousMode][family * ribbonCount + 5];
      const position = ((sceneTime * (0.025 + index * 0.002) + index * 0.171) % 1) * sampleCount;
      const pointIndex = Math.floor(position);
      const interpolatePoint = (sample) => {
        const before = oldRibbon.points[sample];
        const after = ribbon.points[sample];
        return { x: before.x + (after.x - before.x) * modeMix,
          y: before.y + (after.y - before.y) * modeMix,
          z: before.z + (after.z - before.z) * modeMix };
      };
      const first = interpolatePoint(pointIndex);
      const second = interpolatePoint(pointIndex + 1);
      const blend = position - pointIndex;
      const point = project({ x: first.x + (second.x - first.x) * blend,
        y: first.y + (second.y - first.y) * blend,
        z: first.z + (second.z - first.z) * blend });
      const strength = clamp((point.z + 1.3) / 2.6, 0.18, 1);
      const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 13);
      glow.addColorStop(0, colorFor(family, strength * 0.5, light));
      glow.addColorStop(1, colorFor(family, 0, light));
      context.fillStyle = glow;
      context.beginPath();
      context.arc(point.x, point.y, 13, 0, turn);
      context.fill();
      context.fillStyle = colorFor(family, strength, light);
      context.beginPath();
      context.arc(point.x, point.y, 1.6 + strength, 0, turn);
      context.fill();
    }
    canvas.dataset.rendered = 'true';
  };

  const shouldRun = () => motion && canvasVisible && !document.hidden && !!context;
  const stopScene = () => {
    if (canvasFrame) window.cancelAnimationFrame(canvasFrame);
    canvasFrame = 0;
    lastFrame = 0;
  };
  const tick = (timestamp) => {
    canvasFrame = 0;
    if (!shouldRun()) return;
    // The sculpture is deliberately slow: a 30 fps ceiling keeps it light on
    // mobile batteries and high-refresh screens without changing its speed.
    if (!lastFrame || timestamp - lastFrame >= 1000 / 30 - 1) {
      const elapsed = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.08) : 1 / 30;
      lastFrame = timestamp;
      sceneTime += elapsed;
      pointer.x += (targetPointer.x - pointer.x) * 0.085;
      pointer.y += (targetPointer.y - pointer.y) * 0.085;
      modeMix = Math.min(1, modeMix + elapsed / 1.1);
      if (modeMix === 1) currentMode = targetMode;
      drawScene();
    }
    canvasFrame = window.requestAnimationFrame(tick);
  };
  const syncScene = () => {
    if (shouldRun()) {
      if (!canvasFrame) canvasFrame = window.requestAnimationFrame(tick);
    } else {
      stopScene();
    }
  };
  const resizeScene = () => {
    if (!context || !canvas || !observatory) return;
    const bounds = canvas.getBoundingClientRect();
    sceneWidth = Math.round(bounds.width);
    sceneHeight = Math.round(bounds.height);
    const ratio = Math.min(window.devicePixelRatio || 1, sceneWidth < 500 ? 1.5 : 2);
    canvas.width = Math.round(sceneWidth * ratio);
    canvas.height = Math.round(sceneHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawScene();
    syncScene();
  };

  const updateMode = () => {
    const modes = ['evidence', 'context', 'action'];
    const nextMode = Math.max(0, modes.indexOf(demo ? demo.dataset.mode : 'evidence'));
    if (nextMode === targetMode) return;
    previousMode = currentMode;
    targetMode = nextMode;
    modeMix = motion ? 0 : 1;
    if (!motion) currentMode = nextMode;
    if (!shouldRun()) drawScene();
  };
  if (context && canvas && observatory) {
    canvasVisible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        canvasVisible = entries.some((entry) => entry.isIntersecting);
        syncScene();
      }, { threshold: 0 }).observe(observatory);
    }
    if ('ResizeObserver' in window) new ResizeObserver(resizeScene).observe(observatory);
    else window.addEventListener('resize', resizeScene, { passive: true });
    resizeScene();
    updateMode();
  }
  if (demo) new MutationObserver(updateMode).observe(demo, { attributes: true, attributeFilter: ['data-mode'] });

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
    targetPointer = { x: 0, y: 0 };
    resetMagnet();
    resetTilt();
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
    if (observatory && observatory.contains(target)) {
      const bounds = observatory.getBoundingClientRect();
      targetPointer.x = clamp((x - bounds.left) / Math.max(bounds.width, 1) * 2 - 1, -1, 1);
      targetPointer.y = clamp((y - bounds.top) / Math.max(bounds.height, 1) * 2 - 1, -1, 1);
    } else {
      targetPointer = { x: 0, y: 0 };
    }
  };
  document.addEventListener('pointermove', (event) => {
    if (!motion || !finePointer.matches || event.pointerType === 'touch' || !(event.target instanceof Element)) return;
    pendingPointer = { x: event.clientX, y: event.clientY, target: event.target };
    if (!inputFrame) inputFrame = window.requestAnimationFrame(applyPointer);
  }, { passive: true });
  document.addEventListener('pointerleave', resetPointer);
  window.addEventListener('blur', resetPointer);
  if (finePointer.addEventListener) finePointer.addEventListener('change', resetPointer);

  const updateScroll = () => {
    scrollFrame = 0;
    if (!motion) return;
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
    if (!motion || scrollFrame) return;
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
    const nextMotion = motionAllowed();
    if (nextMotion !== motion) {
      motion = nextMotion;
      if (!motion) {
        stopScene();
        resetPointer();
        pointer = { x: 0, y: 0 };
        modeMix = 1;
        currentMode = targetMode;
        activeAnimations.forEach((animation) => animation.cancel());
        activeAnimations.clear();
        if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
        scrollFrame = 0;
        if (heroCopy) {
          heroCopy.style.setProperty('--hero-y', '0px');
          heroCopy.style.setProperty('--hero-opacity', '1');
        }
        parallaxElements.forEach((element) => element.style.setProperty('--parallax-y', '0px'));
      } else {
        queueScroll();
      }
    }
    drawScene();
    syncScene();
  };
  new MutationObserver(syncPreferences).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-theme'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetPointer();
    syncScene();
  });
  window.addEventListener('pagehide', () => {
    stopScene();
    resetPointer();
    if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  });
  window.addEventListener('pageshow', syncScene);
})();
