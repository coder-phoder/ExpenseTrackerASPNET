// ExpenseTracker landing, login, register and admin pages: background canvas, scroll-linked story, reveal-on-scroll,
// the auth form meter and the admin overview's count-up, people table and live-data columns.
// Options on <body>: data-bg="columns|calm|off", data-motion="0..1.5", data-story-length="420" (vh).
(function () {
  'use strict';

  var body = document.body;
  var nav = document.querySelector('.lp-nav');
  var hero = document.querySelector('.lp-hero');
  var story = document.getElementById('story');
  var mq = document.querySelector('.lp-mq');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mode = (body.dataset.bg || 'columns').toLowerCase();
  var k = parseFloat(body.dataset.motion || '1');
  body.style.setProperty('--k', String(k));
  if (story && body.dataset.storyLength) story.style.height = body.dataset.storyLength + 'vh';

  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // Reveal on scroll
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.style.setProperty('--r', '1'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.style.setProperty('--r', '1'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // Login/Register: the brand mark doubles as a form meter. Each bar (a column naming its inputs in
  // data-fields) fills as those inputs become valid, so the logo is whole when the form is ready.
  var form = document.querySelector('.au-card form');
  if (form) {
    var cols = document.querySelectorAll('.au-meter > [data-fields]');
    var score = function (el) {
      var v = el.value, min = +el.dataset.valLengthMin || 0, other = el.dataset.valEqualtoOther;
      if (!v) return 0;
      if (other) return v === form.elements[other.slice(2)].value ? 1 : .5; // other is "*.Password"
      if (v.length < min) return .9 * v.length / min;
      return el.validity.valid ? 1 : .5;
    };
    var meter = function () {
      cols.forEach(function (col, i) {
        var names = col.dataset.fields.split(' ');
        var sum = names.reduce(function (s, n) { return s + score(form.elements[n]); }, 0);
        body.style.setProperty('--m' + (i + 1), (sum / names.length).toFixed(3));
      });
    };
    form.addEventListener('input', meter);
    form.addEventListener('change', meter); // autofill
    meter();

    var show = form.querySelector('.au-show');
    if (show) show.addEventListener('click', function () {
      var on = show.textContent === 'Show';
      show.textContent = on ? 'Hide' : 'Show';
      show.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
      form.querySelectorAll('#Password, #ConfirmPassword').forEach(function (el) { el.type = on ? 'text' : 'password'; });
    });
  }

  // Admin: headline numbers count up from zero once, on load. Distinct from the table rows' data-count sort keys.
  var counters = document.querySelectorAll('[data-countup]');
  if (counters.length && !reduced) {
    var money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    var plain = new Intl.NumberFormat('en-IN');
    var t0 = performance.now();
    var countUp = function (now) {
      var p = ease(cl((now - t0) / 1400));
      counters.forEach(function (el) {
        var v = Math.round(el.dataset.countup * p);
        el.textContent = el.dataset.format === 'money' ? money.format(v) : plain.format(v);
      });
      if (p < 1) requestAnimationFrame(countUp);
    };
    requestAnimationFrame(countUp);
  }

  // Admin: the year grid scrolls sideways on narrow screens; start it at today.
  var heat = document.querySelector('.ad-heat-scroll');
  if (heat) heat.scrollLeft = heat.scrollWidth;

  // Admin people table: search by name or email; sort by any column (names A-Z first, numbers high-low first).
  var rows = document.getElementById('user-rows');
  if (rows) {
    var label = function (n) { return n + (n === 1 ? ' user' : ' users'); };
    document.querySelectorAll('.ad-sort').forEach(function (button) {
      button.addEventListener('click', function () {
        var th = button.parentElement, key = button.dataset.sort, current = th.getAttribute('aria-sort');
        var dir = current ? (current === 'ascending' ? 'descending' : 'ascending') : (key === 'name' ? 'ascending' : 'descending');
        document.querySelectorAll('.ad-users th[aria-sort]').forEach(function (t) { t.removeAttribute('aria-sort'); });
        th.setAttribute('aria-sort', dir);
        var compare = function (a, b) { return key === 'name' ? a.dataset.name.localeCompare(b.dataset.name) : a.dataset[key] - b.dataset[key]; };
        Array.prototype.slice.call(rows.rows)
          .sort(function (a, b) { return dir === 'ascending' ? compare(a, b) : compare(b, a); })
          .forEach(function (tr) { rows.appendChild(tr); });
      });
    });
    var search = document.getElementById('user-search');
    if (search) search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase(), shown = 0;
      Array.prototype.forEach.call(rows.rows, function (tr) {
        tr.hidden = tr.dataset.search.indexOf(q) < 0;
        if (!tr.hidden) shown++;
      });
      document.getElementById('no-match').hidden = shown > 0;
      document.getElementById('user-count').textContent = q ? shown + ' of ' + label(rows.rows.length) : label(rows.rows.length);
    });
  }

  // Scroll-linked values
  function setStory(s) {
    function seg(a, b) { return cl((s - a) / (b - a)); }
    var v = {
      ty1: seg(.04, .09), ty2: seg(.09, .14), ty3: seg(.14, .18), ty4: seg(.18, .21), ty5: seg(.21, .23),
      press: Math.max(0, 1 - Math.abs(s - .255) / .015),
      clr: seg(.275, .295),
      alert: ease(seg(.26, .29)),
      ins: ease(seg(.27, .31)),
      pa: ease(seg(.33, .37)),
      co: seg(.325, .345) * (1 - seg(.45, .47)),
      cal: ease(seg(.35, .41)) * (1 - ease(seg(.64, .69))),
      hit: seg(.44, .47) * (1 - seg(.6, .64)),
      modal: ease(seg(.48, .54)) * (1 - ease(seg(.6, .64))),
      an: ease(seg(.66, .72)),
      bars: seg(.71, .87),
      split: ease(seg(.85, .93)),
      tip: seg(.92, .95),
      nA: 1 - seg(.32, .36), nB: seg(.33, .37) * (1 - seg(.64, .68)), nC: seg(.65, .69),
      st1: 1 - seg(.30, .34), st2: seg(.34, .38) * (1 - seg(.62, .66)), st3: seg(.66, .70),
      w2: ease(seg(.31, .37)), w3: ease(seg(.63, .69)),
      r1: seg(0, .33), r2: seg(.33, .66), r3: seg(.66, 1)
    };
    for (var i = 1; i <= 5; i++) { var t = v['ty' + i]; v['fc' + i] = t > 0 && t < 1 ? 1 : 0; }
    var ct = ease(seg(.34, .45));
    v.cx = 71 - 60.43 * ct;
    v.cy = 36 + 6.5 * ct - Math.sin(Math.PI * ct) * 12;
    v.cs = 1 - .3 * ct;
    for (var key in v) story.style.setProperty('--' + key, (+v[key]).toFixed(4));
  }

  function update() {
    var vh = window.innerHeight || 800;
    var de = document.documentElement;
    if (nav) {
      nav.style.setProperty('--pg', cl(window.scrollY / Math.max(1, de.scrollHeight - vh)).toFixed(4));
      nav.style.setProperty('--nav', cl(window.scrollY / 80).toFixed(3));
    }
    if (hero) hero.style.setProperty('--hero', cl(-hero.getBoundingClientRect().top / (vh * 0.7)).toFixed(4));
    if (story) {
      var sr = story.getBoundingClientRect();
      setStory(cl(-sr.top / Math.max(1, sr.height - vh)));
    }
    if (mq) {
      var mr = mq.getBoundingClientRect();
      mq.style.setProperty('--mq', cl((vh - mr.top) / (vh + mr.height)).toFixed(4));
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  // Background canvases
  var pointer = { x: -9999, y: -9999, sx: null, amt: 0 };
  window.addEventListener('pointermove', function (e) { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

  var tips = [['₹1,240.00', 'Groceries', 0], ['₹85.00', 'Auto fare', 1], ['₹18,000.00', 'Rent', 0], ['₹60.00', 'Chai', 1], ['₹2,150.00', 'Electricity bill', 0], ['₹320.00', 'Lunch', 1], ['₹1,899.00', 'Shoes', 0], ['₹449.00', 'Mobile recharge', 0]];
  // [rgb, x, y, radius, phase, drift, alpha]
  var lightBlobs = [
    ['185,203,245', .16, .3, .5, 0, .08, .9],
    ['248,207,174', .84, .24, .46, 1.7, .07, .9],
    ['191,230,210', .72, .82, .5, 3.1, .08, .85],
    ['217,202,242', .3, .86, .46, 4.4, .07, .85],
    ['245,227,168', .52, .55, .28, 2.2, .1, .5]
  ];
  var darkBlobs = [
    ['42,120,214', .2, .95, .5, 0, .08, .5],
    ['235,104,52', .82, 1, .4, 1.7, .07, .32],
    ['80,170,130', .56, 1.05, .45, 3.1, .08, .32],
    ['140,120,220', .4, .75, .35, 4.4, .07, .35]
  ];
  var darkCols = ['201,214,246', '248,211,182', '191,227,208', '220,207,243'];
  var fields = [
    { el: document.getElementById('lp-hero-canvas'), dark: false },
    { el: document.getElementById('lp-cta-canvas'), dark: true }
  ];
  // Admin: a canvas with data-days ([count, label] per day, oldest first) draws real activity instead of the decorative wave.
  fields.forEach(function (f) {
    if (!f.el || !f.el.dataset.days) return;
    f.days = JSON.parse(f.el.dataset.days);
    f.max = Math.max.apply(null, f.days.map(function (d) { return d[0]; }).concat(1));
  });

  function bar(ctx, x, y, w, h) {
    var r = Math.min(4, w / 2, h);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, [r, r, 0, 0]); else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function drawField(f, t) {
    var c = f.el;
    if (!c) return;
    var r = c.getBoundingClientRect();
    if (r.width < 2 || r.bottom < -40 || r.top > window.innerHeight + 40) return;
    var isStatic = reduced || mode === 'off';
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    var key = W + 'x' + H + pal.ink; // a theme switch redraws a still canvas too
    if (isStatic && f.key === key) return;
    f.key = key;
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var w = r.width, h = r.height, dark = f.dark;
    ctx.clearRect(0, 0, w, h);
    var tt = isStatic ? 0 : t * (mode === 'calm' ? .4 : 1);

    (dark ? darkBlobs : lightBlobs).forEach(function (b) {
      var cx = (b[1] + Math.sin(tt * .13 + b[4]) * b[5]) * w;
      var cy = (b[2] + Math.cos(tt * .11 + b[4]) * b[5]) * h;
      var R = b[3] * Math.max(w, h);
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, 'rgba(' + b[0] + ',' + b[6] * (dark ? 1 : pal.glow) + ')');
      g.addColorStop(1, 'rgba(' + b[0] + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });

    if (!dark) {
      ctx.font = '11px SFMono-Regular, Menlo, Consolas, monospace';
      for (var y = h - 100, i = 1; y > 110; y -= 100, i++) {
        ctx.globalAlpha = .6; ctx.fillStyle = pal.surface;
        ctx.fillRect(0, Math.round(y), w, 1);
        ctx.globalAlpha = .4; ctx.fillStyle = pal.ink;
        if (!f.days) ctx.fillText('₹' + (i * 5000).toLocaleString('en-IN'), 20, y - 8);
      }
      ctx.globalAlpha = 1;
    }
    if (mode === 'off') return;

    var gap = w < 640 ? 22 : 30, bw = w < 640 ? 7 : 10;
    var n = Math.ceil(w / gap) + 1, off = (w - (n - 1) * gap) / 2;
    var mx = -9999, amt = 0;
    if (!dark) {
      var inside = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
      pointer.amt += ((inside ? 1 : 0) - pointer.amt) * .06;
      pointer.sx = pointer.sx == null ? pointer.x : pointer.sx + (pointer.x - pointer.sx) * .12;
      mx = pointer.sx - r.left;
      amt = pointer.amt;
    }
    var showTip = !dark && !isStatic && mode === 'columns';
    var cyc = 3.2, kk = Math.floor(t / cyc), ph = (t % cyc) / cyc;
    var tipIdx = -1, tip = null;
    if (showTip) {
      var span = Math.max(1, Math.floor(n * .24));
      tipIdx = (kk % 2 ? Math.floor(n * .7) : Math.floor(n * .05)) + ((((kk + 7) * 2654435761) >>> 0) % span);
    }
    for (var j = 0; j < n; j++) {
      var x = off + j * gap;
      var v = .5 + .22 * Math.sin(j * .37 + tt * .55) + .16 * Math.sin(j * .13 - tt * .31 + 1.7) + .1 * Math.sin(j * .91 + tt * 1.3);
      if (f.days) { var day = f.days[f.days.length - n + j]; v = day ? .05 + .95 * day[0] / f.max + .04 * Math.sin(j * .37 + tt * .55) : 0; }
      var d = (x - mx) / 120, lift = Math.exp(-d * d) * amt;
      var hh = h * (dark ? (.08 + .26 * v) : (.12 + .42 * v + .2 * lift));
      if (dark) {
        ctx.fillStyle = 'rgba(' + darkCols[j % 4] + ',.5)';
      } else {
        var kind = j % 9 === 4 ? 'b' : j % 13 === 7 ? 'o' : 'w';
        var a = kind === 'w' ? .55 + .4 * lift : .34 + .45 * lift;
        ctx.globalAlpha = kind === 'w' ? a : 1;
        ctx.fillStyle = kind === 'b' ? 'rgba(42,120,214,' + a + ')' : kind === 'o' ? 'rgba(235,104,52,' + a + ')' : pal.surface;
      }
      bar(ctx, x - bw / 2, h - hh, bw, hh);
      ctx.globalAlpha = 1;
      if (j === tipIdx) tip = { x: x, y: h - hh };
    }

    var item = tips[kk % tips.length];
    if (f.days && tip) { var td = f.days[f.days.length - n + tipIdx]; item = td && [td[0] + (td[0] === 1 ? ' expense' : ' expenses'), td[1], 0]; }
    if (tip && item) {
      var al = ph < .14 ? ph / .14 : ph > .82 ? Math.max(0, (1 - ph) / .18) : 1;
      ctx.globalAlpha = al;
      ctx.fillStyle = item[2] ? 'rgba(235,104,52,.95)' : 'rgba(42,120,214,.95)';
      bar(ctx, tip.x - bw / 2, tip.y, bw, h - tip.y);
      var f1 = '600 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      var f2 = '400 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      var t2 = ' ' + item[1];
      ctx.font = f1; var w1 = ctx.measureText(item[0]).width;
      ctx.font = f2; var w2 = ctx.measureText(t2).width;
      var bwid = w1 + w2 + 18, bh = 26;
      var bx = Math.max(8, Math.min(w - bwid - 8, tip.x - bwid / 2));
      var by = tip.y - bh - 10;
      ctx.shadowColor = 'rgba(29,36,51,.14)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
      ctx.fillStyle = pal.surface;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bwid, bh, 7); else ctx.rect(bx, by, bwid, bh);
      ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = pal.ink; ctx.font = f1; ctx.fillText(item[0], bx + 9, by + bh / 2);
      ctx.globalAlpha = al * .7; ctx.font = f2; ctx.fillText(t2, bx + 9 + w1, by + bh / 2);
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }
  }

  // The light-section canvases draw in the theme's colours (landing.css, theme.css): white and ink by day, dark surface and light ink by night.
  var rootStyle = getComputedStyle(document.documentElement);
  var pal = {};
  function loop(now) {
    requestAnimationFrame(loop);
    var t = now / 1000;
    pal.surface = rootStyle.getPropertyValue('--surface').trim();
    pal.ink = rootStyle.getPropertyValue('--ink').trim();
    pal.glow = parseFloat(rootStyle.getPropertyValue('--glow')) || 1;
    fields.forEach(function (f) { drawField(f, t); });
  }
  requestAnimationFrame(loop);
})();
