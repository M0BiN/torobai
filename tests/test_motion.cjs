// DOM/scheduling regression checks; geometry and WAAPI are simulated, not a browser.
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { window, document } = parseHTML(`<body>
  <details id="accordion"><summary>Terms <button id="summaryButton">Help</button></summary><form><input id="value" value="kept"><button id="inside">Action</button></form></details>
  <details id="other" open><summary>Open terms</summary><div>Terms</div></details>
  <details id="popover" data-disclosure-popover><summary>Filter</summary><div data-disclosure-panel><input></div></details>
  <button id="outside">Elsewhere</button><dialog id="dialog"><button>Done</button></dialog>
</body>`);
const $ = (id) => document.getElementById(id),
  animations = [],
  frames = new Map();
let nextFrame = 0,
  inFrame = false,
  focus,
  reducedChange;
const media = {
  matches: false,
  addEventListener: (_event, fn) => {
    reducedChange = fn;
  }
};
window.innerWidth = 1200;
window.HTMLElement.prototype.focus = function (options) {
  focus = { node: this, options };
};
window.HTMLElement.prototype.getBoundingClientRect = function () {
  // Native slot geometry is deliberately unusable: the old test masked this risk.
  assert.notEqual(this.tagName, 'DETAILS');
  if (this.classList.contains('disclosure-content')) {
    assert.equal(inFrame, true, 'measure revealed content on the scheduled frame');
    return { height: this._naturalHeight ?? 160 };
  }
  return { height: this._height ?? (this.style.height ? parseFloat(this.style.height) : 160) };
};
window.getComputedStyle = (el) => ({
  opacity: el._opacity ?? '1',
  transform: el._transform ?? 'none',
  clipPath: el._clipPath ?? 'inset(0 0 0% 0 round 12px)'
});
window.HTMLElement.prototype.animate = function (keyframes, options) {
  const el = this;
  const animation = {
    el,
    frames: keyframes,
    options,
    cancelled: false,
    onfinish: null,
    oncancel: null,
    cancel() {
      this.cancelled = true;
      delete el._height;
      this.oncancel?.();
    },
    finish() {
      this.onfinish?.();
    }
  };
  animations.push(animation);
  return animation;
};
$('dialog').showModal = function () {
  this.open = true;
};
$('dialog').close = function () {
  this.open = false;
};
const ctx = vm.createContext({
  window,
  document,
  matchMedia: () => media,
  requestAnimationFrame: (fn) => {
    frames.set(++nextFrame, fn);
    return nextFrame;
  },
  cancelAnimationFrame: (id) => frames.delete(id)
});
vm.runInContext(
  fs.readFileSync(require('node:path').resolve(__dirname, '../app/static/motion.js'), 'utf8'),
  ctx
);
const motion = window.TorobMotion;
const tick = () => {
  const pending = [...frames.values()];
  frames.clear();
  inFrame = true;
  try {
    for (const fn of pending) fn();
  } finally {
    inFrame = false;
  }
};
const click = (el) => {
  const e = new window.Event('click', { bubbles: true, cancelable: true });
  el.dispatchEvent(e);
  return e;
};
const accordion = $('accordion'),
  summary = accordion.querySelector('summary');
const input = $('value');
input.value = 'edited';

// Start is clipped before opening. No full-height paint or synchronous slot measurement.
assert.equal(click(summary).defaultPrevented, true);
const panel = accordion.querySelector('.disclosure-reveal');
assert.equal(panel.style.height, '0px');
assert.equal(accordion.open, true);
assert.equal(animations.length, 0);
assert.equal($('value'), input);
assert.equal(input.value, 'edited');
tick();
let animation = animations.at(-1);
assert.equal(animation.el, panel);
assert.equal(animation.frames[0].height, '0px');
assert.equal(animation.frames[1].height, '160px');
assert.equal(summary.getAttribute('aria-expanded'), 'true');
animation.finish();
assert.equal(panel.style.height, '');
assert.equal(panel.style.overflow, '');
assert.equal(accordion.dataset.disclosureState, undefined);

// Keep content visible and inert through exit; no close/reopen for measurement.
const states = [],
  toggle = accordion.toggleAttribute;
accordion.toggleAttribute = function (name, value) {
  if (name === 'open') states.push(value);
  return toggle.call(this, name, value);
};
click(summary);
tick();
animation = animations.at(-1);
assert.deepEqual(states, [true]);
assert.equal(panel.inert, true);
assert.equal(animation.frames[0].height, '160px');
assert.equal(animation.frames[1].height, '0px');
assert.equal(summary.getAttribute('aria-expanded'), 'false');
animation.finish();
assert.equal(accordion.open, false);
assert.equal(panel.inert, false);
assert.deepEqual(states, [true, false]);

// Reverse from current geometry. Obsolete frames/callbacks cannot overwrite intent.
click(summary);
tick();
const old = animations.at(-1),
  stale = old.onfinish;
panel._height = 68;
click(summary);
assert.equal(panel.style.height, '68px');
assert.equal(old.cancelled, true);
tick();
assert.equal(animations.at(-1).frames[0].height, '68px');
panel._height = 29;
click(summary);
tick();
assert.equal(animations.at(-1).frames[0].height, '29px');
stale();
assert.equal(accordion.dataset.disclosureState, 'opening');
animations.at(-1).finish();
assert.equal(accordion.open, true);
assert.equal(panel.style.height, '');
const before = animations.length;
click($('inside'));
click($('summaryButton'));
tick();
assert.equal(animations.length, before);

// Multiple clicks before rendering leave just the latest animation.
click(summary);
const cancelledFrame = [...frames.values()][0];
click(summary);
cancelledFrame();
assert.equal(frames.size, 1);
tick();
animations.at(-1).finish();
assert.equal(accordion.open, true);
assert.equal(accordion.querySelectorAll('.disclosure-reveal').length, 1);

// Popovers reveal downward without changing the toolbar layout height.
const popover = $('popover'),
  popup = popover.querySelector('[data-disclosure-panel]');
click(popover.querySelector('summary'));
assert.equal(popup.style.visibility, 'hidden');
tick();
animation = animations.at(-1);
assert.equal(animation.el, popup);
assert.equal(popup.style.visibility, '');
assert.equal(animation.frames[0].opacity, 0);
assert.equal(animation.frames[0].clipPath, 'inset(0 0 100% 0 round 12px)');
assert.ok(!('height' in animation.frames[0]));
animation.finish();
click($('outside'));
tick();
assert.equal(popover.open, true);
assert.equal(animations.at(-1).frames[1].opacity, 0);
animations.at(-1).finish();
assert.equal(popover.open, false);
click(popover.querySelector('summary'));
click(popover.querySelector('summary'));
tick();
assert.equal(animations.at(-1).frames[0].opacity, 0, 'pending reversal must not flash opaque');
animations.at(-1).finish();
click(popover.querySelector('summary'));
tick();
animations.at(-1).finish();
const escape = new window.Event('keydown', { bubbles: true, cancelable: true });
escape.key = 'Escape';
popup.querySelector('input').dispatchEvent(escape);
tick();
assert.equal(escape.defaultPrevented, true);
assert.equal(focus.node, popover.querySelector('summary'));
assert.equal(focus.options.preventScroll, true);
animations.at(-1).finish();
assert.equal(popover.open, false);

// Reduced motion, missing WAAPI and failures remain usable, including pending frames.
motion.setOpen($('other'), false);
tick();
animations.at(-1).finish();
assert.equal($('other').open, false);
media.matches = true;
const count = animations.length;
motion.setOpen(accordion, false);
assert.equal(accordion.open, false);
assert.equal(animations.length, count);
assert.equal(frames.size, 0);
motion.setOpen(accordion, true);
media.matches = false;
motion.setOpen(accordion, false);
media.matches = true;
reducedChange();
tick();
assert.equal(accordion.open, false);
assert.equal(panel.style.height, '');
media.matches = false;
const animate = accordion.animate;
accordion.animate = null;
motion.setOpen(accordion, true);
assert.equal(accordion.open, true);
assert.equal(frames.size, 0);
accordion.animate = animate;
panel.animate = () => {
  throw new Error('animation failed');
};
motion.setOpen(accordion, false);
tick();
assert.equal(accordion.open, false);
assert.equal(panel.style.height, '');
delete panel.animate;

// Dialog cancellation/reversal uses the shared exit path.
const dialog = $('dialog');
motion.dialog(dialog, true);
assert.equal(dialog.open, true);
const opening = animations.at(-1);
motion.dialog(dialog, false);
assert.equal(opening.cancelled, true);
animations.at(-1).finish();
assert.equal(dialog.open, false);
motion.dialog(dialog, true);
animations.at(-1).finish();
const cancel = new window.Event('cancel', { bubbles: true, cancelable: true });
dialog.dispatchEvent(cancel);
assert.equal(cancel.defaultPrevented, true);
assert.equal(dialog.open, true);
animations.at(-1).finish();
assert.equal(dialog.open, false);

// Mobile browser chrome/keyboard height changes must not abruptly settle motion.
motion.setOpen(accordion, true);
tick();
window.innerHeight = 560;
window.dispatchEvent(new window.Event('resize'));
assert.equal(accordion.dataset.disclosureState, 'opening');
window.innerWidth = 390;
window.dispatchEvent(new window.Event('resize'));
assert.equal(accordion.dataset.disclosureState, undefined);
assert.equal(panel.style.height, '');
motion.setOpen(accordion, false);
motion.settle();
tick();
assert.equal(accordion.open, false);
assert.equal(panel.style.height, '');
assert.equal(frames.size, 0);
console.log(
  'Motion regression passed: frame staging, content measurement, retained nodes, native visibility, reversal, popovers, focus, reduced motion, failures, dialogs and resize.'
);
