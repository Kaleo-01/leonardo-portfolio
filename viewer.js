const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('#motion');
let paused = reduced.matches;
const projects = [...document.querySelectorAll('.project')];
let expandedStage = null;
function applyMotion() {
  document.documentElement.classList.toggle('motion-paused', paused);
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.textContent = paused ? 'Enable motion' : 'Pause motion';
  for (const p of projects) {
    const v = p.querySelector('model-viewer');
    if (paused) { v.autoRotate = false; p.querySelector('.rotate').setAttribute('aria-pressed', 'false'); }
  }
}
motionButton.addEventListener('click', () => { paused = !paused; applyMotion(); });
reduced.addEventListener('change', e => {paused = e.matches; applyMotion();});
applyMotion();
const revealObserver = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) {e.target.classList.add('visible');revealObserver.unobserve(e.target);}
}, {threshold:.08});
document.querySelectorAll('.reveal').forEach(e => revealObserver.observe(e));
document.documentElement.classList.add('motion-ready');
let ticking = false;
function updateScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  document.querySelector('.reading-progress').style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  let active = null;
  for (const p of projects) if (p.getBoundingClientRect().top < innerHeight * .55) active = p.id;
  for (const a of document.querySelectorAll('.project-nav a')) {
    const selected = a.hash === `#${active}`;
    a.classList.toggle('active', selected);
    if (selected) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  }
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateScroll); } }, {passive:true});
addEventListener('resize', updateScroll);
updateScroll();
function closeExpanded() {
  if (!expandedStage) return;
  const button = expandedStage.querySelector('.expand');
  expandedStage.classList.remove('expanded');
  button.textContent = '↗'; button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', `Expand ${expandedStage.closest('.project').querySelector('h2').textContent}`);
  document.body.classList.remove('has-expanded');
  document.querySelector('.topbar').inert = false;
  document.querySelector('footer').inert = false;
  document.querySelectorAll('main > :not(.collection)').forEach(e => e.inert = false);
  for (const p of projects) { p.inert = false; p.querySelector('.project-copy').inert = false; }
  expandedStage = null; button.focus();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeExpanded();
  if (e.key === 'Tab' && expandedStage) {
    const buttons = [...expandedStage.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();}
    else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
  }
});
for (const p of projects) {
  const v = p.querySelector('model-viewer'), status = p.querySelector('.model-status');
  const rotate = p.querySelector('.rotate'), views = [...p.querySelectorAll('[data-view]')];
  const controls = p.querySelectorAll('.controls button');
  let failed = false, inView = false, interacted = false;
  const setRotation = value => {v.autoRotate = value;rotate.setAttribute('aria-pressed', String(value));};
  v.addEventListener('load', () => {failed = false;p.dataset.modelLoaded = 'true';status.textContent = 'READY TO EXPLORE';controls.forEach(b => b.disabled = false);});
  v.addEventListener('progress', e => {if (!failed && !v.loaded && v.getAttribute('src')) status.textContent = `LOADING MODEL · ${Math.round(e.detail.totalProgress * 100)}%`;});
  v.addEventListener('error', () => {failed = true;status.textContent = 'Unable to load model. Refresh to try again.';controls.forEach(b => b.disabled = true);});
  v.addEventListener('camera-change', e => {
    if (e.detail.source === 'user-interaction') {interacted = true; views.forEach(b => b.setAttribute('aria-pressed', 'false'));}
  });
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView && v.dataset.src) {v.setAttribute('src', v.dataset.src);delete v.dataset.src;}
    if (!inView) v.autoRotate = false;
    else if (!paused && rotate.getAttribute('aria-pressed') === 'true') v.autoRotate = true;
  }, {rootMargin:'150px'});
  observer.observe(v);
  for (const b of views) b.addEventListener('click', () => {
    interacted = true;setRotation(false);v.resetTurntableRotation();v.cameraOrbit = b.dataset.view;v.fieldOfView = '30deg';v.cameraTarget = 'auto auto auto';
    views.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  });
  rotate.addEventListener('click', () => {
    interacted = true;
    if (paused) {paused = false;applyMotion();}
    setRotation(!v.autoRotate);
  });
  p.querySelector('.reset').addEventListener('click', () => {setRotation(false);v.resetTurntableRotation();views[0].click();});
  const stage = p.querySelector('.stage'), expand = p.querySelector('.expand');
  expand.addEventListener('click', () => {
    if (expandedStage === stage) {closeExpanded();return;}
    closeExpanded();expandedStage = stage;
    stage.classList.add('expanded');expand.textContent = '×';expand.setAttribute('aria-label','Close expanded view');expand.setAttribute('aria-expanded','true');
    document.body.classList.add('has-expanded');
    document.querySelector('.topbar').inert = true;document.querySelector('footer').inert = true;
    document.querySelectorAll('main > :not(.collection)').forEach(e => e.inert = true);
    for (const other of projects) {if (other !== p) other.inert = true;}
    p.querySelector('.project-copy').inert = true;
    expand.focus();
  });
  // A short camera introduction runs once, only before the visitor takes control.
  v.addEventListener('load', () => {
    if (!paused && !interacted && inView) {
      v.cameraOrbit = p.id === 'mail-box' ? '225deg 70deg 105%' : '45deg 70deg 105%';
      setTimeout(() => {if (!paused && !interacted) v.cameraOrbit = views[0].dataset.view;}, 900);
    }
  }, {once:true});
}
import('./model-viewer.min.js').catch(() => {
  document.querySelectorAll('.model-status').forEach(s => s.textContent = 'Unable to start 3D viewer. Refresh to try again.');
});
