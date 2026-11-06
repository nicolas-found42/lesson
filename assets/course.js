/* Optional browser-local checkpoints and reading steps. Static navigation and
 * exercises remain in the HTML. No accounts, telemetry, or network calls. */
(function () {
  'use strict';
  var KEY = 'lesson.course.v1';
  var state = { completed: [], steps: {} };
  var persistent = true;
  function readState() {
    var previous = state;
    state = { completed: [], steps: {} };
    persistent = true;
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object') {
        if (Array.isArray(saved.completed)) state.completed = saved.completed.filter(function (n) { return Number.isInteger(n) && n >= 1 && n <= 116; });
        if (saved.steps && typeof saved.steps === 'object' && !Array.isArray(saved.steps)) {
          Object.keys(saved.steps).forEach(function (key) {
            var value = saved.steps[key];
            if (/^\d+$/.test(key) && Number(key) >= 1 && Number(key) <= 116 && Number.isInteger(value) && value >= 0 && value < 200) state.steps[key] = value;
          });
        }
      }
    } catch (error) { state = previous; persistent = false; }
  }
  readState();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); persistent = true; }
    catch (error) { persistent = false; }
  }
  function watch(repaint) {
    function refresh() { if (persistent) readState(); repaint(); }
    window.addEventListener('storage', function (event) { if (event.key === KEY || event.key === null) refresh(); });
    window.addEventListener('pageshow', function (event) { if (event.persisted) refresh(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  }
  var checkpoint = document.querySelector('.lesson-checkpoint');
  if (!checkpoint) {
    var links = Array.from(document.querySelectorAll('.session-lessons a[data-lesson]'));
    if (!links.length) return;
    function paintHome() {
      links.forEach(function (link) {
        link.nextElementSibling.textContent = state.completed.indexOf(Number(link.dataset.lesson)) !== -1 ? ' · Task recorded' : '';
      });
      document.querySelectorAll('.course-session').forEach(function (session) {
        var items = Array.from(session.querySelectorAll('[data-lesson]'));
        var count = items.filter(function (item) { return state.completed.indexOf(Number(item.dataset.lesson)) !== -1; }).length;
        session.querySelector('.session-progress').textContent = count ? count + ' of ' + items.length + ' tasks recorded' : '';
      });
      var next = links.find(function (link) { return state.completed.indexOf(Number(link.dataset.lesson)) === -1; });
      var resume = document.getElementById('course-resume');
      var progress = document.getElementById('course-progress');
      if (next) {
        resume.href = next.getAttribute('href');
        resume.textContent = (state.completed.length ? 'Continue: ' : 'Start: ') + next.textContent + ' →';
        var session = next.closest('.course-session');
        document.getElementById('start-title').textContent = session.querySelector('h3').textContent;
        document.getElementById('next-description').textContent = session.querySelector('.session-outcome').textContent;
        progress.textContent = new Set(state.completed.filter(function (n) { return n <= 15; })).size + ' of 15 first-launch tasks recorded. One lesson is enough for today.';
      } else {
        resume.href = '#study-plan'; resume.textContent = 'Revisit your study plan →';
        document.getElementById('start-title').textContent = 'You have recorded every task';
        document.getElementById('next-description').textContent = 'Try applying what you learned to a fresh project, or revisit a task you want to practice.';
        progress.textContent = '116 tasks recorded by you. Reopen any lesson to practice or undo its checkpoint.';
      }
      document.getElementById('storage-note').textContent = persistent ? 'Checkpoints are optional and saved only in this browser. They are your own record, not a grade. Bookmark your next lesson if storage is unavailable.' : 'Saved progress could not be read in this browser. You can still follow the plan; bookmark your next lesson. No grade or account is required.';
    }
    paintHome();
    watch(paintHome);
    function revealPlanTarget() {
      var target = document.getElementById(location.hash.slice(1));
      if (!target) return;
      for (var parent = target; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    }
    window.addEventListener('hashchange', revealPlanTarget);
    revealPlanTarget();
    return;
  }
  var id = Number(checkpoint.dataset.lesson);
  var complete = checkpoint.querySelector('[data-complete]');
  var status = checkpoint.querySelector('.checkpoint-status');
  function paintCheckpoint() {
    var done = state.completed.indexOf(id) !== -1;
    complete.setAttribute('aria-pressed', String(done));
    complete.textContent = done ? 'Task recorded — undo checkpoint' : 'I did the task — record checkpoint';
    status.textContent = (done ? 'Task recorded by you. This is a self-check, not a grade. ' : 'Try the task and check its expected outcome before recording it. ') + (persistent ? 'Checkpoints stay in this browser; you can stop here and return later.' : 'Progress is only in memory: saving is unavailable. Bookmark the next lesson before leaving.');
  }
  complete.hidden = false;
  complete.addEventListener('click', function () {
    var record = complete.getAttribute('aria-pressed') !== 'true';
    if (persistent) readState();
    state.completed = state.completed.filter(function (n) { return n !== id; });
    if (record) state.completed.push(id);
    save(); paintCheckpoint();
  });
  paintCheckpoint();
  watch(paintCheckpoint);
  var main = document.querySelector('main');
  var nodes = Array.from(main.children).filter(function (node) { return !node.classList.contains('lesson-brief'); });
  var steps = [], current;
  nodes.forEach(function (node) {
    if (!current || node.tagName === 'H2') {
      current = document.createElement('section'); current.className = 'reading-step';
      main.insertBefore(current, node); steps.push(current);
    }
    current.appendChild(node);
  });
  if (steps.length < 2) return;
  var index = Math.min(state.steps[id] || 0, steps.length - 1), full = false, returnIndex = null;
  var controls = document.createElement('div'); controls.className = 'reading-controls';
  controls.innerHTML = '<p class="reading-position" aria-live="polite"></p><div class="reading-actions"><button type="button" data-back>Previous section</button><button type="button" data-forward>Next section</button><button type="button" data-full aria-pressed="false">Show full lesson</button></div><p>Use “Show full lesson” to search this page or read everything together. Your reading position is saved when storage is available.</p>';
  main.insertBefore(controls, steps[0]);
  var bottom = document.createElement('div'); bottom.className = 'reading-controls reading-bottom';
  bottom.innerHTML = '<div class="reading-actions"><button type="button" data-continue>Continue reading →</button><button type="button" data-return hidden>Back to where I was reading</button><a href="#lesson-practice">Try the task</a></div>';
  main.appendChild(bottom);
  var continueButton = bottom.querySelector('[data-continue]');
  var returnButton = bottom.querySelector('[data-return]');
  var back = controls.querySelector('[data-back]'), forward = controls.querySelector('[data-forward]'), all = controls.querySelector('[data-full]');
  function show(focus) {
    steps.forEach(function (step, n) { step.hidden = !full && n !== index; });
    var heading = steps[index].querySelector('h2');
    controls.querySelector('.reading-position').textContent = full ? 'Full lesson · ' + steps.length + ' sections' : 'Section ' + (index + 1) + ' of ' + steps.length + (heading ? ': ' + heading.textContent : '');
    continueButton.hidden = full || index === steps.length - 1;
    returnButton.hidden = returnIndex === null;
    back.disabled = full || index === 0; forward.disabled = full || index === steps.length - 1;
    all.setAttribute('aria-pressed', String(full)); all.textContent = full ? 'Read in steps' : 'Show full lesson';
    if (focus) {
      var target = heading || steps[index]; target.tabIndex = -1; target.focus();
    }
  }
  function move(delta) { index += delta; if (persistent) readState(); state.steps[id] = index; save(); paintCheckpoint(); show(true); }
  continueButton.addEventListener('click', function () { move(1); });
  returnButton.addEventListener('click', function () { index = returnIndex; returnIndex = null; if (persistent) readState(); state.steps[id] = index; save(); paintCheckpoint(); show(true); });
  back.addEventListener('click', function () { move(-1); });
  forward.addEventListener('click', function () { move(1); });
  all.addEventListener('click', function () { full = !full; show(false); });
  function reveal(target) {
    var section = target && target.closest('.reading-step');
    if (section) { index = steps.indexOf(section); if (persistent) readState(); state.steps[id] = index; save(); paintCheckpoint(); show(false); }
  }
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (link) {
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if (target && target.closest('.reading-step') !== steps[index]) returnIndex = index;
      reveal(target);
    }
  });
  window.addEventListener('hashchange', function () { reveal(document.getElementById(location.hash.slice(1))); });
  show(false);
  reveal(document.getElementById(location.hash.slice(1)));
})();
