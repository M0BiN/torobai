'use strict';

// One interruptible interaction for native disclosures, including dynamic pages.
window.TorobMotion = (() => {
  const active = new Map();
  const dialogs = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.25, .1, .25, 1)';
  const contents = new WeakMap();
  const isOpen = (details) => Boolean(details.open || details.hasAttribute('open'));
  const intended = (details) => active.get(details)?.open ?? isOpen(details);

  function nativeState(details, open) {
    details.open = open;
    details.toggleAttribute('open', open);
    details.querySelector('summary')?.setAttribute('aria-expanded', String(open));
  }

  function finish(details, record) {
    if (active.get(details) !== record) return;
    active.delete(details);
    cancelAnimationFrame(record.frame);
    if (record.animation) {
      record.animation.onfinish = record.animation.oncancel = null;
      record.animation.cancel();
    }
    nativeState(details, record.open);
    record.target.style.height = '';
    record.target.style.overflow = '';
    record.target.style.visibility = '';
    record.target.inert = false;
    delete details.dataset.disclosureState;
  }

  function contentFor(details, summary) {
    if (contents.has(details)) return contents.get(details);
    const panel = document.createElement('div');
    const inner = document.createElement('div');
    panel.className = 'disclosure-reveal';
    inner.className = 'disclosure-content';
    // Move existing nodes: form state, event handlers and element identity survive.
    for (const node of [...details.childNodes]) if (node !== summary) inner.append(node);
    panel.append(inner);
    details.append(panel);
    details.dataset.disclosureEnhanced = '';
    contents.set(details, { panel, inner });
    return { panel, inner };
  }

  function setOpen(details, open, animate = true) {
    if (!details) return;
    const summary = [...details.children].find((el) => el.tagName === 'SUMMARY');
    if (!summary) return;
    const previous = active.get(details);
    if (previous?.open === open && animate) return;
    if (!previous && isOpen(details) === open) return;

    const panel = details.hasAttribute('data-disclosure-popover')
      ? [...details.children].find((el) => el.hasAttribute('data-disclosure-panel'))
      : null;
    // Native details hide their content slot. Never close/reopen that slot just
    // to measure a destination: it can invalidate layout and flash the content.
    if (!animate || reduced.matches || typeof details.animate !== 'function') {
      if (previous) finish(details, previous);
      nativeState(details, open);
      return;
    }
    const content = panel ? null : contentFor(details, summary);
    const target = panel || content.panel;
    const height = isOpen(details) ? target.getBoundingClientRect().height : 0;
    const appearance =
      previous && panel
        ? previous.animation
          ? window.getComputedStyle(panel)
          : previous.start
        : null;
    const opacity = appearance?.opacity;
    const transform = appearance?.transform;
    const clipPath = appearance?.clipPath;
    if (previous) {
      cancelAnimationFrame(previous.frame);
      if (previous.animation) {
        previous.animation.onfinish = previous.animation.oncancel = null;
        previous.animation.cancel();
      }
      active.delete(details);
    }
    if (!panel) {
      target.style.height = `${height}px`;
      target.style.overflow = 'clip';
    } else {
      target.style.visibility = 'hidden';
    }
    target.inert = !open;
    nativeState(details, true);
    summary.setAttribute('aria-expanded', String(open));
    details.dataset.disclosureState = open ? 'opening' : 'closing';
    const start = {
      opacity: opacity ?? (open ? 0 : 1),
      transform: transform ?? (open ? 'translateY(-8px)' : 'none'),
      clipPath: clipPath ?? (open ? 'inset(0 0 100% 0 round 12px)' : 'inset(0 0 0% 0 round 12px)')
    };
    const record = { open, target, start, animation: null, frame: null };
    active.set(details, record);
    // Establish a clipped start before measuring newly revealed content. Using
    // its own inner box avoids the summary, native slot and open-only spacing.
    record.frame = requestAnimationFrame(() => {
      if (active.get(details) !== record) return;
      try {
        const frames = panel
          ? [
              start,
              {
                opacity: open ? 1 : 0,
                transform: open ? 'none' : 'translateY(-8px)',
                clipPath: open ? 'inset(0 0 0% 0 round 12px)' : 'inset(0 0 100% 0 round 12px)'
              }
            ]
          : [
              { height: `${height}px` },
              { height: `${open ? content.inner.getBoundingClientRect().height : 0}px` }
            ];
        record.animation = target.animate(frames, {
          duration: open ? 340 : 280,
          easing,
          fill: 'both'
        });
        target.style.visibility = '';
        record.animation.onfinish = record.animation.oncancel = () => finish(details, record);
      } catch {
        finish(details, record);
      }
    });
  }

  function settle() {
    for (const [details, record] of active) finish(details, record);
  }

  function dialogState(dialog, open) {
    const previous = dialogs.get(dialog);
    if (!previous && Boolean(dialog.open) === open) return;
    const appearance = previous ? window.getComputedStyle(dialog) : null;
    const opacity = appearance?.opacity;
    const transform = appearance?.transform;
    if (previous) {
      previous.onfinish = previous.oncancel = null;
      previous.cancel();
      dialogs.delete(dialog);
    }
    if (open && !dialog.open) dialog.showModal();
    if (reduced.matches || typeof dialog.animate !== 'function') {
      if (!open) dialog.close();
      return;
    }
    try {
      const animation = dialog.animate(
        [
          {
            opacity: opacity || (open ? 0 : 1),
            transform: transform || (open ? 'translateY(8px) scale(.985)' : 'none')
          },
          { opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(6px) scale(.985)' }
        ],
        { duration: open ? 220 : 160, easing, fill: 'both' }
      );
      dialogs.set(dialog, animation);
      animation.onfinish = animation.oncancel = () => {
        if (dialogs.get(dialog) !== animation) return;
        dialogs.delete(dialog);
        animation.onfinish = animation.oncancel = null;
        if (!open) dialog.close();
        animation.cancel();
      };
    } catch {
      if (!open) dialog.close();
    }
  }

  document.addEventListener('click', (event) => {
    const summary = event.target.closest('summary');
    const details = summary?.parentElement;
    const control = event.target.closest('a,button,input,select,textarea,label');
    if (details?.tagName === 'DETAILS' && !(control && summary.contains(control))) {
      event.preventDefault();
      setOpen(details, !intended(details));
    }
    for (const other of document.querySelectorAll('details[data-disclosure-popover]')) {
      if (!other.contains(event.target) && intended(other)) setOpen(other, false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = [...document.querySelectorAll('details[data-disclosure-popover]')].filter(
      intended
    );
    const details = open.find((el) => el.contains(event.target)) || open.at(-1);
    if (!details) return;
    event.preventDefault();
    setOpen(details, false);
    details.querySelector('summary').focus({ preventScroll: true });
  });
  let viewportWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === viewportWidth) return;
    viewportWidth = window.innerWidth;
    settle();
  });
  document.addEventListener(
    'cancel',
    (event) => {
      if (event.target.tagName !== 'DIALOG') return;
      event.preventDefault();
      dialogState(event.target, false);
    },
    true
  );
  reduced.addEventListener?.('change', () => {
    if (!reduced.matches) return;
    settle();
    for (const animation of dialogs.values()) animation.finish();
  });
  return { setOpen, settle, dialog: dialogState };
})();
