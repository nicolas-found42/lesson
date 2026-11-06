/* Shared lesson behaviour: agent tabs, recall boxes, quizzes. No dependencies.
 *
 * Tabs:    <div class="agent-tabs"> with tab buttons [role=tab][data-tab=NAME] and panels [role=tabpanel][data-panel=NAME].
 *          The chosen agent is remembered across lessons (localStorage, optional).
 * Recall:  <div class="recall"><textarea></textarea><button class="btn reveal">Reveal</button><div class="answer">…</div></div>
 * Quiz:    <div class="quiz" data-correct="2"> (0-based index of the right option) containing .q, button.opt x N, .why
 *          Keep every option the same length; vary which index is correct between questions.
 */
(function () {
  document.documentElement.classList.add("js");
  // Carry the reader's motion choice from the home page into reading pages.
  try {
    if (localStorage.getItem("lesson.motion") === "off") document.documentElement.dataset.motion = "off";
  } catch (error) { /* Reading and quizzes do not require storage. */ }
  // WebKit does not consistently scroll a focused pre with arrow keys.
  document.querySelectorAll('pre[tabindex="0"]').forEach(function (block) {
    block.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          (event.key !== "ArrowLeft" && event.key !== "ArrowRight") ||
          block.scrollWidth <= block.clientWidth) return;
      block.scrollLeft += event.key === "ArrowRight" ? 40 : -40;
      event.preventDefault();
    });
  });
  var KEY = "lesson.agent";
  function store(get, v) {
    try { return get ? localStorage.getItem(KEY) : localStorage.setItem(KEY, v); } catch (e) { return null; }
  }
  function selectTab(root, name) {
    root.querySelectorAll('[role="tab"]').forEach(function (t) {
      var on = t.dataset.tab === name;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    root.querySelectorAll('[role="tabpanel"]').forEach(function (p) { p.hidden = p.dataset.panel !== name; });
  }
  document.querySelectorAll(".agent-tabs").forEach(function (root) {
    var tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    var saved = store(true);
    var first = tabs[0] && tabs[0].dataset.tab;
    var start = tabs.some(function (t) { return t.dataset.tab === saved; }) ? saved : first;
    selectTab(root, start);
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        store(false, t.dataset.tab);
        document.querySelectorAll(".agent-tabs").forEach(function (r) { selectTab(r, t.dataset.tab); });
      });
      t.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
        if (n === null) return;
        var next = tabs[(n + tabs.length) % tabs.length];
        next.focus(); next.click();
      });
    });
  });
  document.querySelectorAll(".recall").forEach(function (r) {
    var b = r.querySelector(".reveal"), a = r.querySelector(".answer");
    if (b && a) b.addEventListener("click", function () { a.classList.add("show"); b.disabled = true; });
  });
  var quizzes = document.querySelectorAll(".quiz");
  var done = 0, right = 0;
  quizzes.forEach(function (q) {
    var correct = parseInt(q.dataset.correct, 10);
    var opts = Array.from(q.querySelectorAll("button.opt"));
    opts.forEach(function (o, i) {
      o.addEventListener("click", function () {
        if (q.dataset.done) return;
        q.dataset.done = "1"; done++;
        if (i === correct) right++;
        opts.forEach(function (x, j) {
          x.disabled = true;
          if (j === correct) x.classList.add("correct");
          else if (j === i) x.classList.add("wrong");
        });
        var why = q.querySelector(".why"); if (why) why.classList.add("show");
        var s = document.querySelector(".quiz-score");
        if (s) s.textContent = right + " of " + quizzes.length + " correct" + (done < quizzes.length ? " so far" : "");
      });
    });
  });
})();

/* ---- Components added for the full course ----
 * Prompt:    <div class="prompt"><button class="copy">Copy</button><pre>text</pre></div>
 * Do-it:     <div class="doit"><ol><li><label><input type="checkbox"> step</label></li>…</ol><div class="expect">what you should see</div><p class="progress"></p></div>
 *            The "expect" box is revealed when every box is ticked.
 * Order:     <div class="order" data-items> with <button class="item" data-pos="1">…</button> listed in ANY (shuffled) order;
 *            learner clicks them in the right sequence; wrong click flashes red; <p class="status"></p> reports.
 */
(function () {
  document.querySelectorAll(".prompt .copy").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.parentNode.querySelector("pre").innerText;
      var ok = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1500); };
      try { navigator.clipboard.writeText(t).then(ok, function () { b.textContent = "Select and copy"; }); } catch (e) { b.textContent = "Select and copy"; }
    });
  });
  document.querySelectorAll(".doit").forEach(function (d) {
    var boxes = Array.from(d.querySelectorAll('input[type="checkbox"]'));
    var ex = d.querySelector(".expect"), pr = d.querySelector(".progress");
    function upd() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      if (pr) pr.textContent = n + " of " + boxes.length + " steps done";
      if (ex) ex.classList.toggle("show", n === boxes.length);
    }
    boxes.forEach(function (b) { b.addEventListener("change", upd); });
    upd();
  });
  document.querySelectorAll(".order").forEach(function (o) {
    var items = Array.from(o.querySelectorAll("button.item"));
    var next = 1, st = o.querySelector(".status");
    items.forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.classList.contains("placed")) return;
        if (parseInt(b.dataset.pos, 10) === next) {
          b.classList.add("placed"); b.textContent = next + ". " + b.textContent.replace(/^\d+\.\s*/, ""); next++;
          if (st) st.textContent = next > items.length ? "Correct: that is the order." : "Good. Which comes next?";
        } else {
          b.classList.add("miss"); setTimeout(function () { b.classList.remove("miss"); }, 700);
          if (st) st.textContent = "Not yet. Think about what must already be true before that step.";
        }
      });
    });
  });
})();
