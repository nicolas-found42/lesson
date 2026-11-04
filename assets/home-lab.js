/* Anime.js 4.5.0, MIT, locally bundled. Motion is presentation only: the demo
   state and every navigation action work even if the animation engine fails.
   Upstream: https://github.com/juliangarnier/anime
   Research starting point: https://github.com/rasagy/awesome-creative-coding-js-libraries */
(function () {
  "use strict";
  var lab = document.getElementById("playground");
  var motionButton = document.getElementById("motion-toggle");
  if (!lab || !motionButton) return;
  var root = document.documentElement;
  var preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  var enabled = true;
  try { enabled = localStorage.getItem("lesson.motion") !== "off"; } catch (error) { /* Storage is optional. */ }
  var engine = window.anime;
  var running = new Set();
  var buttons = Array.from(lab.querySelectorAll("[data-lab-step]"));
  var confetti = lab.querySelector(".lab-confetti");
  var joinButton = lab.querySelector(".preview-join");
  var steps = [
    { speaker: "YOU → AGENT", message: "“Make a page for my space club, with a big purple planet.”", caption: "Your idea goes here", explanation: "You describe what you want. The agent needs a clear goal before it starts." },
    { speaker: "AGENT → FILES", message: "“I made the page and added your planet. Let’s open it and see!”", caption: "Files changed → a page to try", explanation: "The agent changes files to build your idea. It can make mistakes, so the job isn’t done yet." },
    { speaker: "YOU → THE PAGE", message: "“I can see the planet. Does the Join button work? Let’s try it!”", caption: "Your turn: try the Join button", explanation: "You test what the agent made. Try the Join button in this demo, then decide what needs fixing." }
  ];

  function canAnimate() { return enabled && !preference.matches && engine && typeof engine.animate === "function"; }
  function animate(targets, settings) {
    if (!canAnimate()) return;
    var animation = engine.animate(targets, Object.assign({}, settings, {
      onComplete: function (self) {
        running.delete(self);
        self.revert();
        if (targets.parentElement === confetti) targets.remove();
      }
    }));
    running.add(animation);
  }
  function cancelMotion() {
    running.forEach(function (animation) { animation.revert(); });
    running.clear();
    confetti.replaceChildren();
  }
  function stopNavigationMotion() {
    cancelMotion();
    document.querySelectorAll("details.unit.animatable").forEach(function (details) {
      details.classList.remove("animatable");
    });
  }
  // Search and bulk navigation commit their new layout immediately, including
  // when they interrupt a manually opened disclosure's native height transition.
  document.querySelectorAll('#browse, a[href^="#unit-"], a[href="#reference"]').forEach(function (controls) {
    controls.addEventListener("click", stopNavigationMotion);
    controls.addEventListener("input", stopNavigationMotion);
  });
  window.addEventListener("hashchange", stopNavigationMotion);
  function syncMotion() {
    var on = enabled && !preference.matches;
    root.dataset.motion = on ? "on" : "off";
    motionButton.setAttribute("aria-pressed", String(on));
    motionButton.querySelector(".motion-state").textContent = on ? "on" : "off";
    motionButton.disabled = preference.matches;
    motionButton.title = preference.matches ? "Your device’s reduced-motion setting is on" : "Turn animations on or off";
    if (!on) cancelMotion();
  }
  motionButton.hidden = false;
  lab.querySelector(".lab-steps").hidden = false;
  lab.querySelector(".lab-instruction").textContent = "Try the three steps. Watch your idea take shape.";
  syncMotion();
  motionButton.addEventListener("click", function () {
    enabled = !enabled;
    try { localStorage.setItem("lesson.motion", enabled ? "on" : "off"); } catch (error) { /* Storage is optional. */ }
    syncMotion();
  });
  preference.addEventListener("change", syncMotion);
  // A background tab or a cached page should not retain transient styles.
  window.addEventListener("pagehide", cancelMotion);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) cancelMotion();
  });

  function celebrate() {
    if (!canAnimate()) return;
    for (var i = 0; i < 14; i += 1) {
      var bit = document.createElement("i");
      confetti.appendChild(bit);
      var angle = (i / 14) * Math.PI * 2;
      animate(bit, { x: [0, Math.cos(angle) * 95], y: [0, Math.sin(angle) * 80 - 15], rotate: [0, i * 37], opacity: [1, 0], duration: 650, ease: "outCubic" });
    }
  }
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      cancelMotion();
      var step = Number(button.dataset.labStep);
      var state = steps[step];
      lab.dataset.step = String(step);
      buttons.forEach(function (item) { item.setAttribute("aria-pressed", String(item === button)); });
      document.getElementById("lab-speaker").textContent = state.speaker;
      document.getElementById("lab-message").textContent = state.message;
      document.getElementById("preview-caption").textContent = state.caption;
      document.getElementById("lab-explanation").textContent = state.explanation;
      joinButton.disabled = step !== 2;
      joinButton.innerHTML = 'Join the adventure <span aria-hidden="true">↗</span>';
      animate(lab.querySelector(".lab-message"), { y: [8, 0], duration: 320, ease: "outCubic" });
      animate(lab.querySelector(".bot svg"), { y: [0, -12, 0], rotate: [0, -8, 0], duration: 520, ease: "outCubic" });
      animate(lab.querySelector(".mini-preview"), { scale: [0.92, 1], duration: 450, ease: "outBack" });
    });
  });
  joinButton.addEventListener("click", function () {
    cancelMotion();
    joinButton.textContent = "You’re in! ✓";
    joinButton.disabled = true;
    document.getElementById("lab-message").textContent = "“The demo button works! Trying the page tells me more than just hearing ‘done’.”";
    document.getElementById("preview-caption").textContent = "One button tested. Nice work!";
    document.getElementById("lab-explanation").textContent = "In your real app, try every important action. If one fails, tell the agent what happened and check its fix.";
    celebrate();
  });
  // Move readable text without dimming it during the animation.
  animate(".hero-copy > *", { y: [15, 0], delay: engine && engine.stagger ? engine.stagger(60) : 0, duration: 500, ease: "outCubic" });
  animate(lab, { y: [18, 0], duration: 650, ease: "outCubic" });
  // A fresh open reveals the cards as a group, without moving the layout or
  // animating filter-driven opens. Keep this shorter than the native unfold.
  document.querySelectorAll("details.unit > summary").forEach(function (summary) {
    summary.addEventListener("click", function () {
      // Revert the previous reveal before a new animation captures its starting
      // styles. Otherwise rapid toggles can restore a half-translated card.
      cancelMotion();
      var details = summary.parentElement;
      if (details.open) return;
      var cards = Array.from(details.querySelectorAll(".lesson-card:not([hidden])"));
      animate(cards, { y: [8, 0], delay: function (target, index) { return Math.min(index * 6, 54); }, duration: 160, ease: "outCubic" });
    });
  });
})();
