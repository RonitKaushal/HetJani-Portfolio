(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var isTyping = function () { var a = document.activeElement; return a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA"); };

  $("#year").textContent = new Date().getFullYear();

  // ---------- pixel sprites ----------
  var PALETTE = {
    k: "#26283a", s: "#d5dbe8", d: "#8a93a8", r: "#e05555", y: "#f6c443", o: "#d9962e",
    b: "#2348a3", B: "#7fa6e6", w: "#ffffff", g: "#6cc65f", G: "#3f8f45", n: "#a0683a"
  };
  var SPRITES = {
    heart: ["0rr0rr0", "rrrrrrr", "rrrrrrr", "0rrrrr0", "00rrr00", "000r000"],
    coin: ["00kkkk00", "0kyyyyk0", "kyywyyyk", "kywyyyyk", "kyyyyyyk", "kyyyyyok", "0kyyyok0", "00kkkk00"],
    knight: ["0000rr0000", "000kkkk000", "00kssssk00", "0kssssssk0", "0kskkkksk0", "0kssssssk0", "00kkkkkk00",
      "0kbbbbbbk0", "ksbbybbbsk", "0kbbbbbbk0", "00kd00dk00", "00kk00kk00"],
    slime: ["000kkkk000", "00kgggwk00", "0kgggggwk0", "kggkggkggk", "kggkggkggk", "kggggggggk", "kGGGGGGGGk", "0kkkkkkkk0"],
    sword: ["00s00", "0sws0", "0sws0", "0sws0", "0sws0", "0sws0", "0sws0", "kyyyk", "00n00", "00n00", "00n00", "00k00"],
    potion: ["00kkk00", "00kwk00", "0kkwkk0", "krrrwrk", "krrrrrk", "krrrrrk", "0krrrk0", "00kkk00"],
    car: ["0000kkkkkkk00000", "000kbBBkBBBk0000", "00kbbBBkBBBbk000", "0kkbbbbbbbbbbkk0", "kbbbbbbbbbbbbbyk",
      "kbbbbbbbbbbbbbbk", "krbkkkbbbbbkkkbk", "0kkkdkkkkkkkdkk0", "000kkk00000kkk00"],
    chest: ["00kkkkkkkk00", "0knnnnnnnnk0", "knnnnnnnnnnk", "kkkkkyykkkkk", "knnnnyynnnnk", "knnnnkknnnnk",
      "knnnnnnnnnnk", "knnnnnnnnnnk", "kkkkkkkkkkkk"],
    trophy: ["00kkkkkkkk00", "kkkyyyyyykkk", "kykyyyyywkyk", "kykyyyyywkyk", "0kkyyyyyykk0", "000kyyyyk000",
      "0000kyyk0000", "00000kk00000", "0000kyyk0000", "000kkkkkk000", "000knnnnk000", "000kkkkkk000"]
  };

  function spriteSVG(map) {
    var w = 0, rects = "";
    map.forEach(function (row, y) {
      w = Math.max(w, row.length);
      var x = 0;
      while (x < row.length) {
        var c = row[x], run = 1;
        if (c === "0") { x++; continue; }
        while (row[x + run] === c) run++;
        rects += '<rect x="' + x + '" y="' + y + '" width="' + run + '" height="1" fill="' + PALETTE[c] + '"/>';
        x += run;
      }
    });
    return '<svg viewBox="0 0 ' + w + " " + map.length + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + rects + "</svg>";
  }
  $$("[data-sprite]").forEach(function (el) {
    var map = SPRITES[el.dataset.sprite];
    if (map) el.innerHTML = spriteSVG(map);
  });

  function drawSprite(ctx, map, x, y, size) {
    map.forEach(function (row, ry) {
      for (var rx = 0; rx < row.length; rx++) {
        var c = row[rx];
        if (c === "0") continue;
        ctx.fillStyle = PALETTE[c];
        ctx.fillRect(Math.round(x + rx * size), Math.round(y + ry * size), Math.ceil(size), Math.ceil(size));
      }
    });
  }

  // ---------- split hero name into letters ----------
  var charIndex = 0;
  $$(".split").forEach(function (word) {
    var text = word.textContent;
    word.textContent = "";
    text.split("").forEach(function (ch) {
      var s = document.createElement("span");
      s.className = "char";
      s.textContent = ch;
      s.style.setProperty("--i", charIndex++);
      word.appendChild(s);
    });
  });

  // ---------- stroke lengths for self-drawing svgs ----------
  $$(".draw path, .draw circle, .timeline-line path").forEach(function (el) {
    var len = Math.ceil(el.getTotalLength ? el.getTotalLength() : 600);
    el.style.setProperty("--len", len);
  });
  $$(".checklist").forEach(function (list) {
    $$("li", list).forEach(function (li, i) { li.style.setProperty("--i", i); });
  });

  // ---------- floating pixel items in sections ----------
  [["about", "coin", "4%", "34%", 0.3], ["about", "heart", "52%", "88%", 0.45],
   ["experience", "potion", "90%", "40%", 0.35], ["experience", "coin", "70%", "92%", 0.2],
   ["skills", "sword", "94%", "34%", 0.4], ["skills", "coin", "44%", "16%", 0.25],
   ["contact", "heart", "90%", "8%", 0.3]].forEach(function (f) {
    var el = document.createElement("span");
    el.className = "px floater";
    el.innerHTML = spriteSVG(SPRITES[f[1]]);
    el.style.left = f[2];
    el.style.top = f[3];
    el.dataset.speed = f[4];
    el.dataset.spin = "1";
    el.setAttribute("aria-hidden", "true");
    document.getElementById(f[0]).appendChild(el);
  });

  // ---------- loader ----------
  var loader = $(".loader");
  var count = $("#loader-count");
  var start = performance.now();
  var minTime = reduceMotion ? 0 : 1500;
  var pageReady = document.readyState === "complete";
  window.addEventListener("load", function () { pageReady = true; });

  (function tickLoader(now) {
    var t = clamp((now - start) / minTime, 0, 1);
    var p = pageReady ? t : Math.min(t, 0.9);
    var eased = 1 - Math.pow(1 - p, 3);
    count.textContent = Math.round(eased * 100);
    loader.style.setProperty("--p", eased);
    if (p < 1) return requestAnimationFrame(tickLoader);
    setTimeout(function () {
      loader.classList.add("done");
      body.classList.remove("is-loading");
      body.classList.add("loaded");
      $$(".hero .draw").forEach(function (d, i) { setTimeout(function () { d.classList.add("in"); }, 300 + i * 90); });
    }, 200);
  })(start);

  // ---------- reveal on scroll ----------
  var revealTargets = $$(".reveal, .section .draw");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    revealTargets.forEach(function (t) { io.observe(t); });
  } else {
    revealTargets.forEach(function (t) { t.classList.add("in"); });
  }

  // ---------- pointer + cursor ----------
  var mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  var smooth = { nx: 0, ny: 0 };
  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = e.clientX / innerWidth * 2 - 1;
    mouse.ny = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  var cursor = $(".cursor");
  var cursorDot = $(".cursor-dot");
  var cursorLabel = $(".cursor-label");
  var ring = { x: mouse.x, y: mouse.y };
  if (finePointer) {
    document.addEventListener("pointerover", function (e) {
      var labelled = e.target.closest("[data-cursor]");
      var link = e.target.closest("a, button, .sticker, label, input, textarea");
      cursor.classList.toggle("is-label", !!labelled);
      cursor.classList.toggle("is-link", !labelled && !!link);
      cursorLabel.textContent = labelled ? labelled.getAttribute("data-cursor") : "";
    });
    document.addEventListener("pointerdown", function () { cursor.classList.add("is-down"); });
    document.addEventListener("pointerup", function () { cursor.classList.remove("is-down"); });
  }

  // ---------- hero: 3D parallax desk ----------
  var hero = $(".hero");
  var scene = $(".scene");
  var layers = $$(".scene .layer").map(function (el) {
    return {
      el: el,
      depth: parseFloat(el.dataset.depth) || 0,
      speed: parseFloat(el.dataset.speed) || 0,
      rot: parseFloat(el.dataset.rot) || 0,
      dx: 0, dy: 0, extraRot: 0
    };
  });

  layers.forEach(function (layer) {
    if (!layer.el.classList.contains("drag")) return;
    var el = layer.el, last = null;
    el.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      last = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
      layer.extraRot = layer.rot > 0 ? -4 : 4;
      layers.forEach(function (l) { l.el.style.zIndex = l === layer ? 30 : ""; });
    });
    el.addEventListener("pointermove", function (e) {
      if (!last) return;
      var k = (1400 - layer.depth) / 1400;
      layer.dx += (e.clientX - last.x) * k;
      layer.dy += (e.clientY - last.y) * k;
      last = { x: e.clientX, y: e.clientY };
    });
    var end = function () {
      if (!last) return;
      last = null;
      el.classList.remove("dragging");
      layer.extraRot = 0;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  });

  // WASD / arrows move the camera while the hero is on screen
  var keyEls = {};
  $$(".keys kbd").forEach(function (k) { keyEls[k.dataset.key] = k; });
  var keyMap = { w: "w", arrowup: "w", a: "a", arrowleft: "a", s: "s", arrowdown: "s", d: "d", arrowright: "d" };
  var held = {};
  var cam = { x: 0, z: 0, tx: 0, tz: 0 };
  window.addEventListener("keydown", function (e) {
    var k = keyMap[e.key.toLowerCase()];
    if (!k || isTyping() || scrollY > hero.offsetHeight * 0.6) return;
    if (e.key.indexOf("Arrow") === 0) e.preventDefault();
    held[k] = true;
    if (keyEls[k]) keyEls[k].classList.add("on");
  });
  window.addEventListener("keyup", function (e) {
    var k = keyMap[e.key.toLowerCase()];
    if (!k) return;
    held[k] = false;
    if (keyEls[k]) keyEls[k].classList.remove("on");
  });
  window.addEventListener("blur", function () {
    held = {};
    Object.keys(keyEls).forEach(function (k) { keyEls[k].classList.remove("on"); });
  });

  function renderHero(scrollY) {
    if (scrollY > hero.offsetHeight * 1.2) return;
    smooth.nx = lerp(smooth.nx, reduceMotion ? 0 : mouse.nx, 0.07);
    smooth.ny = lerp(smooth.ny, reduceMotion ? 0 : mouse.ny, 0.07);
    if (held.a) cam.tx = Math.min(cam.tx + 6, 240);
    if (held.d) cam.tx = Math.max(cam.tx - 6, -240);
    if (held.w) cam.tz = Math.min(cam.tz + 8, 300);
    if (held.s) cam.tz = Math.max(cam.tz - 8, -300);
    cam.x = lerp(cam.x, cam.tx, 0.08);
    cam.z = lerp(cam.z, cam.tz, 0.08);

    var s = reduceMotion ? 0 : scrollY;
    scene.style.transform =
      "translateZ(" + (cam.z + s * 0.5).toFixed(1) + "px) " +
      "rotateX(" + (-smooth.ny * 6 + s * 0.015).toFixed(2) + "deg) " +
      "rotateY(" + (smooth.nx * 8 - cam.x * 0.04).toFixed(2) + "deg)";
    layers.forEach(function (l) {
      var x = l.dx + smooth.nx * l.depth * 0.12 + cam.x * (0.3 + l.depth / 300);
      var y = l.dy + smooth.ny * l.depth * 0.12 - s * l.speed * 0.45;
      var r = l.rot + l.extraRot + smooth.nx * l.depth * 0.01;
      l.el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px," + l.depth + "px) rotate(" + r.toFixed(2) + "deg)";
    });
  }

  // ---------- HJ zoom reveal ----------
  var zoom = $(".zoom");
  var zoomImg = $(".zoom-img");
  var zoomMask = $(".zoom-mask");
  var zoomHint = $(".zoom-hint");
  var zoomCopy = $(".zoom-copy");
  var zoomSticky = $(".zoom-sticky");
  var hjGroup = $("#hj-group");
  var CELL = 90;
  var HJ = ["x...x  xxxxx", "x...x  ...x.", "xxxxx  ...x.", "x...x  x..x.", "x...x  .xx.."];
  var hjX0 = 800 - (HJ[0].length * CELL) / 2;
  var hjY0 = 450 - (HJ.length * CELL) / 2;
  var NS = "http://www.w3.org/2000/svg";
  hjGroup.innerHTML = "";
  hjGroup.setAttribute("shape-rendering", "crispEdges");
  HJ.forEach(function (row, y) {
    for (var x = 0; x < row.length; x++) {
      if (row[x] !== "x") continue;
      var r = document.createElementNS(NS, "rect");
      r.setAttribute("x", hjX0 + x * CELL);
      r.setAttribute("y", hjY0 + y * CELL);
      r.setAttribute("width", CELL + 2);
      r.setAttribute("height", CELL + 2);
      r.setAttribute("fill", "#000");
      hjGroup.appendChild(r);
    }
  });
  // zoom into the middle of the H crossbar
  var focusX = hjX0 + 2.5 * CELL, focusY = hjY0 + 2.5 * CELL;
  var maskEl = $("#hj-mask");
  var maskRects = [maskEl.querySelector("rect"), $(".zoom-paper")];
  function sizeZoom() {
    var aspect = innerWidth / innerHeight;
    var hjW = HJ[0].length * CELL, hjH = HJ.length * CELL;
    var W = Math.max(hjW / 0.82, (hjH / 0.55) * aspect);
    var H = W / aspect;
    var x = 800 - W / 2, y = 450 - H / 2;
    zoomMask.setAttribute("viewBox", [x, y, W, H].map(function (v) { return v.toFixed(1); }).join(" "));
    zoomMask.setAttribute("preserveAspectRatio", "none");
    [maskEl].concat(maskRects).forEach(function (el) {
      el.setAttribute("x", x); el.setAttribute("y", y);
      el.setAttribute("width", W); el.setAttribute("height", H);
    });
  }
  sizeZoom();
  window.addEventListener("resize", sizeZoom);

  function renderZoom() {
    var r = zoom.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) return;
    var p = clamp(-r.top / (r.height - innerHeight), 0, 1);
    if (reduceMotion) p = p > 0.3 ? 1 : 0;
    var z = clamp(p / 0.7, 0, 1);
    var s = 1 + Math.pow(z, 3) * 45;
    var k = clamp((s - 1) / 8, 0, 1);
    var tx = lerp(focusX, 800, k), ty = lerp(focusY, 450, k);
    hjGroup.setAttribute("transform", "translate(" + tx.toFixed(1) + " " + ty.toFixed(1) + ") scale(" + s.toFixed(3) + ") translate(" + (-focusX) + " " + (-focusY) + ")");
    zoomMask.style.opacity = (1 - clamp((p - 0.55) / 0.2, 0, 1)).toFixed(3);
    zoomImg.style.setProperty("--s", (1.35 - 0.3 * clamp(p / 0.85, 0, 1)).toFixed(3));
    zoomHint.style.opacity = (1 - clamp(p * 6, 0, 1)).toFixed(2);
    zoomSticky.style.setProperty("--shade", clamp((p - 0.6) / 0.15, 0, 1).toFixed(2));
    zoomCopy.classList.toggle("on", p > 0.72);
  }

  // ---------- cinematic game scenes ----------
  var cines = $$(".cine").map(function (sec) {
    return {
      sec: sec,
      frame: $(".cine-frame", sec),
      img: $(".cine-img", sec),
      floats: $$(".cine-float", sec),
      sprite: $(".cine-sprite", sec)
    };
  });
  function renderCines() {
    cines.forEach(function (c) {
      var r = c.sec.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      var p = clamp(-r.top / (r.height - innerHeight), 0, 1);
      var enter = clamp((innerHeight - r.top) / innerHeight, 0, 1);
      var a = easeInOut(clamp(p / 0.4, 0, 1));
      var mobile = innerWidth <= 900;
      c.frame.style.setProperty("--ci", lerp(mobile ? 10 : 16, 0, a).toFixed(2) + "%");
      c.frame.style.setProperty("--cx", lerp(mobile ? 6 : 22, 0, a).toFixed(2) + "%");
      c.frame.style.setProperty("--cr", lerp(18, 0, a).toFixed(1) + "px");
      c.frame.style.setProperty("--shade", a.toFixed(2));
      c.img.style.setProperty("--s", lerp(1.4, 1.06, a).toFixed(3));
      c.img.style.setProperty("--iy", (reduceMotion ? 0 : (0.5 - p) * 60 + (1 - enter) * 80).toFixed(1) + "px");
      c.sec.classList.toggle("on", p > 0.36);
      c.floats.forEach(function (f, i) {
        var depth = parseFloat(f.dataset.z) || 1;
        var y = reduceMotion ? 0 : (0.62 - p) * 700 * depth;
        f.style.opacity = clamp((p - 0.3) / 0.12, 0, 1).toFixed(2);
        f.style.transform = "translate3d(0," + y.toFixed(1) + "px," + (depth * 60).toFixed(0) + "px) rotate(" + (i % 2 ? 5 : -4) * (1 - p * 0.5) + "deg)";
      });
      if (c.sprite) {
        var sx = reduceMotion ? 0 : (p - 0.6) * innerWidth * 0.9;
        c.sprite.style.opacity = clamp((p - 0.35) / 0.1, 0, 1).toFixed(2);
        c.sprite.style.transform = "translate3d(" + sx.toFixed(1) + "px," + (Math.abs(Math.sin(p * 40)) * -8).toFixed(1) + "px,0)";
      }
    });
  }

  // ---------- tilt cards ----------
  if (finePointer && !reduceMotion) {
    $$(".tilt").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        el.classList.add("tilting");
        el.style.setProperty("--ry", ((px - 0.5) * 16).toFixed(2) + "deg");
        el.style.setProperty("--rx", ((0.5 - py) * 12).toFixed(2) + "deg");
        el.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
        el.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", function () {
        el.classList.remove("tilting");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  // ---------- magnetic buttons ----------
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach(function (el) {
      el.style.transition = "transform .4s cubic-bezier(.2,.9,.3,1.3)";
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + x * 0.3 + "px," + y * 0.4 + "px) rotate(" + x * 0.03 + "deg)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  // ---------- draggable tool stickers ----------
  $$(".sticker").forEach(function (el) {
    var pos = { x: 0, y: 0 }, last = null;
    el.addEventListener("pointerdown", function (e) {
      last = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
    });
    el.addEventListener("pointermove", function (e) {
      if (!last) return;
      pos.x += e.clientX - last.x; pos.y += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      el.style.setProperty("--x", pos.x + "px");
      el.style.setProperty("--y", pos.y + "px");
    });
    var end = function () { last = null; el.classList.remove("dragging"); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  });

  // ---------- timeline drawn by scroll ----------
  var timeline = $(".timeline");
  var timelinePath = $(".timeline-line path");
  function renderTimeline() {
    var r = timeline.getBoundingClientRect();
    var p = clamp((innerHeight * 0.7 - r.top) / r.height, 0, 1);
    timelinePath.style.setProperty("--p", reduceMotion ? 1 : p.toFixed(4));
  }

  // ---------- marquee ----------
  var tapeTrack = $(".tape-track");
  var tapeX = 0, tapeDir = -1;

  var parallaxEls = $$("[data-speed]").filter(function (el) { return !el.closest(".scene"); });

  var topbar = $(".topbar");
  var progress = $(".progress span");
  var navLinks = $$(".nav a[href^='#']");
  var navTargets = navLinks.map(function (a) { return $(a.getAttribute("href")); });
  var lastY = scrollY, velocity = 0;

  function onFrame() {
    var y = scrollY;
    var dy = y - lastY;
    lastY = y;
    velocity = lerp(velocity, dy, 0.1);

    if (finePointer) {
      ring.x = lerp(ring.x, mouse.x, 0.18);
      ring.y = lerp(ring.y, mouse.y, 0.18);
      cursor.style.transform = "translate3d(" + ring.x + "px," + ring.y + "px,0)";
      cursorDot.style.transform = "translate3d(" + mouse.x + "px," + mouse.y + "px,0)";
    }

    renderHero(y);
    renderZoom();
    renderCines();
    renderTimeline();

    if (!reduceMotion) {
      if (dy > 0.5) tapeDir = -1; else if (dy < -0.5) tapeDir = 1;
      tapeX += tapeDir * (0.8 + Math.min(Math.abs(velocity) * 0.6, 14));
      var half = tapeTrack.scrollWidth / 2;
      if (tapeX <= -half) tapeX += half;
      if (tapeX > 0) tapeX -= half;
      tapeTrack.style.transform = "translate3d(" + tapeX.toFixed(1) + "px,0,0)";

      parallaxEls.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        var offset = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.speed);
        el.style.translate = "0 " + offset.toFixed(1) + "px";
        if (el.dataset.spin) el.style.rotate = (offset * 0.15).toFixed(1) + "deg";
      });
    }

    var max = root.scrollHeight - innerHeight;
    progress.style.height = (max > 0 ? (y / max) * 100 : 0) + "%";

    topbar.classList.toggle("scrolled", y > 40);
    if (Math.abs(dy) > 4) topbar.classList.toggle("hidden", dy > 0 && y > innerHeight * 0.6 && !body.classList.contains("menu-open"));

    var mark = y + innerHeight * 0.4, current = -1;
    navTargets.forEach(function (s, i) { if (s && s.offsetTop <= mark) current = i; });
    navLinks.forEach(function (a, i) { a.classList.toggle("active", i === current); });

    requestAnimationFrame(onFrame);
  }
  requestAnimationFrame(onFrame);

  // ---------- mobile menu ----------
  var menuBtn = $(".menu-btn");
  var overlay = $(".menu-overlay");
  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    overlay.setAttribute("aria-hidden", !open);
  }
  menuBtn.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
  overlay.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });

  // ---------- message -> email ----------
  $("#msg-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(e.target);
    var name = data.get("name").trim();
    var subject = encodeURIComponent("Hi Het! Message from " + name);
    var text = encodeURIComponent(data.get("message").trim() + "\n\n— " + name);
    window.location.href = "mailto:hetjani818@gmail.com?subject=" + subject + "&body=" + text;
  });

  // ---------- mini game: knight run ----------
  var game = $("#game");
  var g = game.getContext("2d");
  var scoreEl = $("#score"), bestEl = $("#best");
  var best = 0;
  try { best = parseInt(localStorage.getItem("knightRunBest"), 10) || 0; } catch (err) { best = 0; }
  bestEl.textContent = best;
  var GW = 0, GH = 0, ground = 0, PS = 3;
  var state = "idle", score = 0, speed = 0, spawnIn = 0, frame = 0;
  var knight = { x: 50, y: 0, vy: 0, w: 30, h: 36 };
  var slimes = [], clouds = [];
  var gameVisible = false;

  function sizeGame() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var r = game.getBoundingClientRect();
    if (!r.width) return;
    GW = r.width; GH = r.height;
    game.width = GW * ratio; game.height = GH * ratio;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    PS = GH > 200 ? 3 : 2.4;
    knight.w = 10 * PS; knight.h = 12 * PS;
    ground = GH - 30;
    if (state !== "run") knight.y = ground - knight.h;
    clouds = [];
    for (var i = 0; i < 4; i++) clouds.push({ x: Math.random() * GW, y: 14 + Math.random() * (ground * 0.4), w: 40 + Math.random() * 40 });
    drawGame();
  }

  function resetGame() {
    score = 0; speed = 4.2; spawnIn = 60; slimes = [];
    knight.y = ground - knight.h; knight.vy = 0;
    state = "run";
  }
  function jump() {
    if (state !== "run") { resetGame(); return; }
    if (knight.y >= ground - knight.h - 0.5) knight.vy = -11;
  }

  function drawGame() {
    if (!GW) return;
    g.clearRect(0, 0, GW, GH);
    g.strokeStyle = "rgba(38,40,58,.25)";
    g.lineWidth = 2;
    clouds.forEach(function (c) {
      g.beginPath();
      g.moveTo(c.x, c.y + 10);
      g.quadraticCurveTo(c.x + c.w * 0.25, c.y - 6, c.x + c.w * 0.5, c.y + 4);
      g.quadraticCurveTo(c.x + c.w * 0.75, c.y - 8, c.x + c.w, c.y + 10);
      g.stroke();
    });
    g.fillStyle = "#26283a";
    g.fillRect(0, ground, GW, 3);
    g.fillStyle = "rgba(38,40,58,.35)";
    for (var i = 0; i < GW + 30; i += 30) g.fillRect(i - ((frame * speed) % 30), ground + 10, 12, 2);

    slimes.forEach(function (s) { drawSprite(g, SPRITES.slime, s.x, ground - s.h, s.size); });
    var map = SPRITES.knight;
    var onGround = knight.y >= ground - knight.h - 0.5;
    var bob = state === "run" && onGround && Math.floor(frame / 6) % 2 ? -2 : 0;
    drawSprite(g, map, knight.x, knight.y + bob, PS);

    g.textAlign = "center";
    g.fillStyle = "#26283a";
    if (state === "idle") {
      g.font = "600 14px 'Pixelify Sans', monospace";
      g.fillText("PRESS SPACE OR TAP TO START", GW / 2, GH / 2 - 14);
    } else if (state === "over") {
      g.font = "700 22px 'Pixelify Sans', monospace";
      g.fillStyle = "#e05555";
      g.fillText("GAME OVER", GW / 2, GH / 2 - 22);
      g.font = "26px Caveat, cursive";
      g.fillStyle = "#26283a";
      g.fillText("tap or press space to retry", GW / 2, GH / 2 + 6);
    }
  }

  function stepGame() {
    if (gameVisible && state === "run") {
      frame++;
      knight.vy += 0.6;
      knight.y = Math.min(knight.y + knight.vy, ground - knight.h);
      if (knight.y >= ground - knight.h) knight.vy = 0;
      speed += 0.0015;
      if (--spawnIn <= 0) {
        var size = PS * (0.8 + Math.random() * 0.5);
        slimes.push({ x: GW + 10, size: size, w: 10 * size, h: 8 * size });
        spawnIn = 55 + Math.random() * 70 - Math.min(speed * 3, 30);
      }
      slimes.forEach(function (s) { s.x -= speed; });
      slimes = slimes.filter(function (s) { return s.x + s.w > -10; });
      clouds.forEach(function (c) { c.x -= speed * 0.15; if (c.x + c.w < 0) c.x = GW; });
      score += speed * 0.04;
      scoreEl.textContent = Math.floor(score);

      var kx = knight.x + PS * 2, kw = knight.w - PS * 4, ky = knight.y + PS, kh = knight.h - PS;
      for (var i = 0; i < slimes.length; i++) {
        var s = slimes[i];
        if (kx < s.x + s.w - s.size && kx + kw > s.x + s.size && ky + kh > ground - s.h + s.size) {
          state = "over";
          if (Math.floor(score) > best) {
            best = Math.floor(score);
            bestEl.textContent = best;
            try { localStorage.setItem("knightRunBest", best); } catch (err) { /* storage unavailable */ }
          }
          break;
        }
      }
      drawGame();
    }
    requestAnimationFrame(stepGame);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { gameVisible = entries[0].isIntersecting; }, { threshold: 0.4 }).observe(game);
  } else {
    gameVisible = true;
  }
  game.addEventListener("pointerdown", function (e) { e.preventDefault(); jump(); });
  window.addEventListener("keydown", function (e) {
    if ((e.code === "Space" || e.key === "ArrowUp") && gameVisible && !isTyping()) {
      e.preventDefault();
      jump();
    }
  });
  sizeGame();
  window.addEventListener("resize", sizeGame);
  if (document.fonts) document.fonts.ready.then(drawGame);
  requestAnimationFrame(stepGame);
})();
