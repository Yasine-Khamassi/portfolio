(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  /* ---------- headings rise word by word ---------- */
  $$(".split").forEach((h) => {
    const text = h.textContent.trim();
    h.setAttribute("aria-label", text);
    h.textContent = "";
    text.split(/\s+/).forEach((word, i) => {
      const w = document.createElement("span");
      w.className = "w";
      w.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.textContent = word;
      inner.style.setProperty("--i", i);
      w.append(inner);
      h.append(w, " ");
    });
  });

  /* ---------- reveal on scroll ---------- */
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      seen.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
  $$(".split, [data-r], .tl-item").forEach((el) => seen.observe(el));
  $$(".tiles, .controls").forEach((group) => $$("[data-r]", group).forEach((el, i) => el.style.setProperty("--i", i)));

  /* ---------- nav: stuck state, progress, sliding indicator ---------- */
  const nav = $("#nav");
  const bar = $("#progress");
  const links = $$("#navlinks a");
  const ind = $("#navind");
  const targets = links.map((a) => $(a.getAttribute("href")));
  let active = -1;
  const moveInd = () => {
    if (active < 0) { ind.style.opacity = 0; return; }
    const a = links[active];
    ind.style.opacity = 1;
    ind.style.width = a.offsetWidth - 24 + "px";
    ind.style.transform = `translateX(${a.offsetLeft + 12}px)`;
  };
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle("stuck", y > 16);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    let cur = -1;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight * .4) cur = i; });
    if (cur !== active) {
      active = cur;
      links.forEach((a, i) => {
        a.classList.toggle("on", i === cur);
        if (i === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      moveInd();
    }
    updateRail();
  };

  const menuBtn = $("#menubtn");
  const menu = $("#menu");
  const setMenu = (open) => {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  menuBtn.addEventListener("click", () => setMenu(menu.hidden));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

  /* ---------- timeline rail fills as you read ---------- */
  const tl = $("#tl");
  const fill = $("#tlfill");
  const items = $$(".tl-item");
  function updateRail() {
    const r = tl.getBoundingClientRect();
    const line = innerHeight * .62;
    const p = Math.max(0, Math.min(1, (line - r.top) / r.height));
    fill.style.transform = `scaleY(${p})`;
    items.forEach((it) => {
      const node = $(".tl-node", it).getBoundingClientRect();
      it.classList.toggle("lit", node.top + node.height / 2 < line);
    });
  }

  /* ---------- numbers count up once ---------- */
  const fmt = (n, el) => {
    const v = el.dataset.comma ? Math.round(n).toLocaleString("en-US") : String(Math.round(n));
    return (el.dataset.before || "") + v + (el.dataset.after || "");
  };
  const counter = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      counter.unobserve(e.target);
      const el = e.target;
      const to = +el.dataset.count;
      if (reduce) return;
      const start = performance.now();
      const dur = 1500;
      const tick = (t) => {
        const k = Math.min(1, (t - start) / dur);
        el.textContent = fmt(to * (1 - Math.pow(1 - k, 4)), el);
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = fmt(0, el);
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 });
  $$(".num[data-count]").forEach((el) => counter.observe(el));

  /* ---------- the name runs the full width of the page ---------- */
  const heroName = $("#hero-title");
  const fitName = () => {
    if (innerWidth > 1000 && innerHeight <= 680) { heroName.style.fontSize = ""; return; }
    const parts = $$(".hn", heroName);
    heroName.style.fontSize = "100px";
    /* stacked on a phone, so the longer word sets the size there */
    const width = innerWidth <= 640
      ? parts[1].firstElementChild.getBoundingClientRect().width
      : parts[1].getBoundingClientRect().right - parts[0].getBoundingClientRect().left;
    heroName.style.fontSize = (100 * heroName.clientWidth / width).toFixed(2) + "px";
  };
  fitName();
  document.fonts?.ready.then(fitName);
  addEventListener("resize", fitName, { passive: true });

  /* ---------- marquee: double the track so the loop has no seam ---------- */
  $$(".marquee-row").forEach((row) => {
    const track = $(".marquee-track", row);
    const copy = track.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    row.append(copy);
  });
  const marquee = $(".marquee");
  if (marquee) new IntersectionObserver(([e]) => marquee.classList.toggle("off", !e.isIntersecting)).observe(marquee);

  /* ---------- the bench: traffic crosses three gates, and the visitor can attack them ---------- */
  (function perimeter() {
    const stage = $("#pmstage");
    const canvas = $("#pm");
    const log = $("#pm-log");
    const ctx = canvas.getContext("2d");
    const triesEl = $("#pm-tries");
    if (!ctx) return;

    const LAVENDER = "207,196,255";
    const LIME = "200,240,49";
    const VIOLET = "169,143,255";
    const BLACK = "8,8,13";
    const GATES = [
      { label: "rate limit", short: "rate limit", k: .26 },
      { label: "signature", short: "signature", k: .5 },
      { label: "role + row-level security", short: "role + RLS", k: .74 },
    ];
    const COBALT = "15,69,216";
    const TRUST = [.5, .7, .92];
    const HEAD = 40, LANE = 10;
    let W = 0, H = 0, dpr = 1;
    let packets = [], flashes = [], marks = [], tags = [];
    const stopped = GATES.map(() => 0);
    let running = false, last = 0, nextSpawn = 0, nextLog = 0, quietUntil = 0, tries = 0;

    const mono = () => getComputedStyle(document.body).getPropertyValue("--mono");
    const disp = () => getComputedStyle(document.body).getPropertyValue("--disp");
    const gateX = (i) => Math.round(GATES[i].k * W);
    const lanes = () => Math.max(4, Math.floor((H - HEAD - 16) / LANE));
    const laneY = (n) => HEAD + 8 + (n + .5) * LANE;
    const randLane = () => laneY(Math.floor(Math.random() * lanes()));

    const resize = () => {
      const r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (!running) draw();
    };

    const addLog = (text, kind, ago = 0) => {
      const li = document.createElement("div");
      if (kind) li.className = kind;
      const t = document.createElement("time");
      t.textContent = new Date(Date.now() - ago * 1000).toTimeString().slice(0, 8);
      const s = document.createElement("span");
      s.textContent = text;
      li.append(t, s);
      log.append(li);
      while (log.children.length > 12) log.firstChild.remove();
    };

    /* a request runs left to right on its lane, and either clears a gate or stops at it */
    const spawn = (o) => {
      const len = o.len ?? 12 + Math.random() * 56;
      packets.push({
        x: o.x ?? -len,
        y: o.y ?? randLane(),
        len,
        speed: o.speed ?? W * (.14 + Math.random() * .16),
        stop: o.stop ?? -1,
        hot: !!o.hot,
        weight: o.weight ?? 2 + Math.floor(Math.random() * 3),
        next: 0,
        text: o.text,
        tag: o.tag,
        hit: o.hit,
      });
    };
    const flash = (gate, y, rgb, life = 1, reach = 40) => flashes.push({ gate, y, rgb, life, max: life, reach });
    const refuse = (gate, y, big) => {
      stopped[gate] += 1;
      flash(gate, y, VIOLET, big ? 1.2 : .6, big ? 72 : 16);
      marks.push({ x: gateX(gate) - 4, y, life: big ? 1.8 : 1.5, max: big ? 1.8 : 1.5, size: big ? 10 : 6 });
    };

    const ATTACKS = {
      forge: {
        stop: 1, tag: "403", text: "forged signature",
        first: ["POST /webhook/orders  x-signature: forged"],
        after: [["HMAC-SHA256 mismatch, constant-time compare"], ["403 rejected, fails closed", "no"]],
      },
      read: {
        stop: 2, tag: "0 rows", text: "someone else's order",
        first: ["GET /orders/1043  valid JWT, role=user"],
        after: [["Row-Level Security: not this user's row"], ["0 rows returned", "no"]],
      },
      hijack: {
        stop: 2, tag: "denied", text: "injected instruction",
        first: ["doc says: read RESTRICTED-ASSET-9", "model obeys, calls query_inventory"],
        after: [["gateway: tool call denied outside the model"], ["restricted asset never read", "no"]],
      },
    };

    const redrawSoon = () => { draw(); setTimeout(() => { flashes = []; marks = []; tags = []; draw(); }, 1200); };

    const runAttack = (name, btn) => {
      tries += 1;
      triesEl.textContent = tries;
      quietUntil = performance.now() + 4200;
      btn?.classList.add("live");
      const done = () => btn?.classList.remove("live");
      const mid = laneY(Math.floor(lanes() * (.2 + Math.random() * .6)));
      if (name === "flood") {
        addLog("one IP, hundreds of requests a minute");
        const hit = () => {
          addLog("per-IP limit reached");
          addLog("429 too many requests", "no");
          done();
        };
        if (reduce) { refuse(0, mid, true); tags.push({ text: "429", x: gateX(0), y: mid, life: 1.2, max: 1.2 }); hit(); redrawSoon(); return; }
        const total = 26;
        for (let i = 0; i < total; i++) {
          setTimeout(() => spawn({
            y: mid + (Math.floor(Math.random() * 13) - 6) * LANE,
            hot: true, stop: 0, speed: W * .42, len: 24, weight: 2,
            tag: i === total - 1 ? "429" : null,
            hit: i === total - 1 ? hit : null,
          }), i * 38);
        }
        return;
      }
      const atk = ATTACKS[name];
      atk.first.forEach((l) => addLog(l));
      const hit = () => { atk.after.forEach(([l, k], i) => setTimeout(() => addLog(l, k), i * 240)); done(); };
      if (reduce) { refuse(atk.stop, mid, true); tags.push({ text: atk.tag, x: gateX(atk.stop), y: mid, life: 1.2, max: 1.2 }); hit(); redrawSoon(); return; }
      spawn({ y: mid, hot: true, stop: atk.stop, speed: W * .3, len: 64, weight: 4, text: atk.text, tag: atk.tag, hit });
    };
    $$(".attack").forEach((b) => b.addEventListener("click", () => runAttack(b.dataset.attack, b)));

    /* clicking the strip sends a bad request from that exact spot, into the next gate along */
    canvas.addEventListener("pointerdown", (e) => {
      if (reduce) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let stop = GATES.findIndex((_, i) => gateX(i) > x);
      const from = stop < 0 ? gateX(2) - 64 : x;
      if (stop < 0) stop = 2;
      tries += 1;
      triesEl.textContent = tries;
      quietUntil = performance.now() + 2600;
      spawn({ x: from, y: Math.max(HEAD + 12, y), hot: true, stop, speed: W * .34, len: 32, weight: 3, tag: stop === 0 ? "429" : stop === 1 ? "403" : "0 rows" });
      addLog(`request from the outside ${["hits the rate limit", "fails the signature check", "has no access to that row"][stop]}`, "no");
    });

    const ambientLines = [
      ["200 POST /webhook/orders  signature ok", "ok"],
      ["200 GET /orders/1042  role=user, own row", "ok"],
      ["200 GET /health  heartbeat ok", "ok"],
      ["403 POST /webhook/orders  bad signature", "no"],
      ["429 GET /orders  per-IP limit", "no"],
    ];

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "butt";

      /* gates: cobalt bars, named on top, counting what they stopped */
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      GATES.forEach((g, i) => {
        const x = gateX(i);
        ctx.fillStyle = `rgb(${COBALT})`;
        ctx.fillRect(x - 2, HEAD - 8, 5, H);
        ctx.font = "500 12px " + mono();
        ctx.fillStyle = `rgb(${LAVENDER})`;
        const name = W < 600 ? g.short : g.label;
        ctx.fillText(name, x - 2, HEAD - 20);
        if (W >= 600 && stopped[i]) {
          ctx.fillStyle = `rgb(${VIOLET})`;
          ctx.fillText(String(stopped[i]), x - 2 + ctx.measureText(name).width + 8, HEAD - 20);
        }
      });

      /* where a gate just acted */
      flashes.forEach((f) => {
        ctx.fillStyle = `rgba(${f.rgb},${f.life / f.max})`;
        ctx.fillRect(gateX(f.gate) - 2, Math.max(HEAD - 8, f.y - f.reach), 5, f.reach * 2);
      });

      /* requests earn trust gate by gate: dim, brighter, then lime once the last gate clears them */
      packets.forEach((p) => {
        ctx.lineWidth = p.weight;
        ctx.strokeStyle = p.hot ? `rgb(${VIOLET})` : p.next >= GATES.length ? `rgb(${LIME})` : `rgba(${LAVENDER},${TRUST[p.next]})`;
        ctx.beginPath();
        ctx.moveTo(p.x - p.len, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (p.text) {
          ctx.font = "500 12px " + mono();
          const w = ctx.measureText(p.text).width + 12;
          const lx = p.x - p.len;
          ctx.fillStyle = `rgb(${VIOLET})`;
          ctx.fillRect(lx, p.y - 24, w, 20);
          ctx.fillStyle = `rgb(${BLACK})`;
          ctx.textAlign = "left";
          ctx.fillText(p.text, lx + 6, p.y - 14);
        }
      });

      /* refused here */
      marks.forEach((m) => {
        ctx.fillStyle = `rgba(${VIOLET},${Math.min(1, m.life / m.max * 1.6)})`;
        ctx.fillRect(m.x - m.size, m.y - m.size / 2, m.size, m.size);
      });
      tags.forEach((t) => {
        const k = Math.min(1, t.life * 1.4);
        ctx.font = "600 32px " + disp();
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${VIOLET},${k})`;
        ctx.fillText(t.text, t.x - 12, t.y);
      });

    }

    function step(now) {
      if (!running) return;
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;

      if (now > nextSpawn) {
        const bad = Math.random() < .22;
        spawn({ stop: bad ? Math.floor(Math.random() * GATES.length) : -1 });
        nextSpawn = now + 36 + Math.random() * 96;
      }
      if (now > nextLog && now > quietUntil) {
        const [l, k] = ambientLines[Math.random() < .72 ? Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2)];
        addLog(l, k);
        nextLog = now + 1700 + Math.random() * 1500;
      }

      packets = packets.filter((p) => {
        const before = p.x;
        p.x += p.speed * dt;
        for (let i = p.next; i < GATES.length; i++) {
          const x = gateX(i);
          if (before <= x && p.x > x) {
            p.next = i + 1;
            if (p.stop === i) {
              refuse(i, p.y, p.hot && p.weight > 2.5);
              if (p.tag) tags.push({ text: p.tag, x, y: p.y, life: 1.5 });
              p.hit?.();
              return false;
            }
            flash(i, p.y, LIME, .22, 6);
          }
        }
        return p.x - p.len <= W;
      });
      flashes = flashes.filter((f) => (f.life -= dt) > 0);
      marks = marks.filter((m) => (m.life -= dt) > 0);
      tags = tags.filter((t) => (t.life -= dt) > 0);

      draw();
      requestAnimationFrame(step);
    }

    const start = () => {
      if (running || reduce) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(step);
    };
    const stop = () => { running = false; };

    resize();
    /* start with traffic already on the wire, not an empty strip filling up */
    for (let i = 0; i < Math.round(W / 9); i++) spawn({ x: Math.random() * W });
    packets.forEach((p) => { p.next = GATES.filter((_, i) => gateX(i) < p.x).length; });
    addEventListener("resize", resize, { passive: true });
    document.fonts?.ready.then(() => { if (!running) draw(); });
    [[19, 2], [15, 0], [11, 4], [8, 1], [4, 3], [1, 2]].forEach(([ago, n]) => addLog(ambientLines[n][0], ambientLines[n][1], ago));
    if (reduce) { draw(); return; }
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: .05 }).observe(stage);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  })();

  /* ---------- project scenes: one at a time on a sticky stage ---------- */
  (function story() {
    const stage = $("#stage");
    const blocks = $$(".story-item");
    const scenes = new Map(blocks.map((b) => [b, $(".scene", b)]));
    const wide = matchMedia("(min-width: 1001px)");
    const place = () => {
      blocks.forEach((b) => {
        const s = scenes.get(b);
        if (wide.matches) stage.append(s);
        else b.prepend(s);
      });
      setActive(blocks.find((b) => b.classList.contains("on")) || blocks[0]);
    };

    /* role table */
    const roleEls = $$("#rbroles span");
    const rows = $$("#rbrows li");
    const ACCESS = [[1, 1, 1, 1, 1], [1, 1, 1, 0, 0], [1, 0, 0, 0, 0]];
    let role = 0;
    const paintRole = () => {
      roleEls.forEach((el, i) => el.classList.toggle("on", i === role));
      rows.forEach((li, i) => li.classList.toggle("deny", !ACCESS[role][i]));
    };
    paintRole();

    /* signature check */
    const WANT = "9f2c41e7a05b3dd8c16e".split("");
    const FORGED = "9f2c41e7b15b3dd8c1a2".split("");
    const gotEl = $("#hkgot"), wantEl = $("#hkwant"), hkBar = $("#hkbar"), verdict = $("#hkverdict"), hkState = $("#hkstate");
    let forged = false, hkTimer = 0;
    const fillHex = (el, arr) => { el.textContent = ""; arr.forEach((c) => { const b = document.createElement("b"); b.textContent = c; el.append(b); }); };
    const hookRun = () => {
      const got = forged ? FORGED : WANT;
      fillHex(gotEl, got);
      fillHex(wantEl, WANT);
      verdict.className = "hk-verdict";
      hkState.textContent = "checking";
      hkBar.style.transform = "scaleX(0)";
      const g = [...gotEl.children], w = [...wantEl.children];
      if (reduce) {
        g.forEach((b, i) => { const c = got[i] === WANT[i] ? "same" : "diff"; b.className = c; w[i].className = c; });
        hkBar.style.transform = "scaleX(1)";
        verdict.textContent = "403 rejected, fails closed";
        verdict.className = "hk-verdict show no";
        hkState.textContent = "rejected";
        return;
      }
      let i = 0;
      const tick = () => {
        if (i < WANT.length) {
          const c = got[i] === WANT[i] ? "same" : "diff";
          g[i].className = c; w[i].className = c;
          i += 1;
          hkBar.style.transform = `scaleX(${i / WANT.length})`;
          hkTimer = setTimeout(tick, 95);
          return;
        }
        verdict.textContent = forged ? "403 rejected, fails closed" : "200 verified, order processed";
        verdict.className = `hk-verdict show ${forged ? "no" : "ok"}`;
        hkState.textContent = forged ? "rejected" : "accepted";
        forged = !forged;
        hkTimer = setTimeout(hookRun, 2600);
      };
      hkTimer = setTimeout(tick, 400);
    };

    let current = null, loop = 0;
    function setActive(block) {
      if (block === current) return;
      current = block;
      blocks.forEach((b) => {
        b.classList.toggle("on", b === block);
        scenes.get(b).classList.toggle("on", wide.matches ? b === block : true);
      });
      clearInterval(loop);
      clearTimeout(hkTimer);
      const id = block.dataset.scene;
      if (id === "s-rbac" && !reduce) loop = setInterval(() => { role = (role + 1) % 3; paintRole(); }, 2400);
      if (id === "s-hook") hookRun();
      $$("#s-delivery svg").forEach((svg) => { if (svg.pauseAnimations) { if (id === "s-delivery" && !reduce) svg.unpauseAnimations(); else svg.pauseAnimations(); } });
    }

    const watch = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    blocks.forEach((b) => watch.observe(b));

    if (!wide.matches) {
      /* on a phone each scene runs while it's on screen */
      const phone = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.closest(".story-item")); });
      }, { threshold: .5 });
      blocks.forEach((b) => phone.observe(scenes.get(b)));
    }
    wide.addEventListener("change", place);
    place();
  })();

  /* ---------- AI lab: flip every result between attack and defence ---------- */
  (function lab() {
    const list = $("#runs");
    const flip = $("#flip");
    const btns = $$("button", flip);
    const runs = $$(".run", list);
    runs.forEach((run) => {
      const box = $(".dots", run);
      for (let i = 0; i < +run.dataset.total; i++) {
        const d = document.createElement("i");
        d.style.setProperty("--i", i);
        box.append(d);
      }
    });
    const paint = (mode) => {
      $("#ai-lab").dataset.mode = mode;
      list.dataset.mode = mode;
      flip.dataset.mode = mode;
      btns.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === mode)));
      runs.forEach((run) => {
        const dots = $$(".dots i", run);
        const kind = run.dataset.kind;
        const a = +run.dataset.a, d = +run.dataset.d;
        dots.forEach((dot, i) => {
          dot.className = "";
          if (mode === "attack") { if (i < a) dot.className = "hit"; return; }
          if (kind === "detect") { if (i < a) dot.className = "caught"; return; }
          if (kind === "govern") { dot.className = i < d ? "open" : "held"; return; }
          dot.className = i < d ? "hit" : (i < a ? "held" : "");
        });
      });
    };
    paint("attack");
    let touched = false;
    btns.forEach((b, i) => {
      b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1;
      b.addEventListener("click", () => { touched = true; paint(b.dataset.mode); btns.forEach((x) => { x.tabIndex = x === b ? 0 : -1; }); });
      b.addEventListener("keydown", (e) => {
        if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
        e.preventDefault();
        const other = btns[1 - i];
        other.focus();
        other.click();
      });
    });
    /* flip once by itself the first time it comes into view, so nobody misses the point */
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setTimeout(() => {
        if (touched) return;
        paint("defend");
        btns.forEach((x) => { x.tabIndex = x.dataset.mode === "defend" ? 0 : -1; });
      }, reduce ? 0 : 1700);
    }, { threshold: .35 }).observe(list);
  })();

  /* ---------- shared: animate rows from where they were to where they are ---------- */
  const flipRows = (els, change) => {
    const before = new Map(els.map((el) => [el, el.getBoundingClientRect().top]));
    change();
    if (reduce) return;
    els.forEach((el) => {
      const dy = (before.get(el) ?? 0) - el.getBoundingClientRect().top;
      if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 720, easing: "cubic-bezier(.22,1,.36,1)" });
    });
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  /* ---------- agent workflows: replays that show a step failing, getting repaired and landing ---------- */
  const replay = (rootSel, logSel, STEPS, row0) => {
    const root = $(rootSel);
    if (!root) return;
    const rows = $$("li", root);
    const out = $(logSel);
    let run = 0, visible = false;
    const show = (i) => {
      const [row, text, bad] = STEPS[i];
      rows.forEach((r, n) => {
        r.classList.toggle("on", n === row && !bad);
        r.classList.toggle("bad", n === row && !!bad);
        r.classList.toggle("done", n < row);
      });
      out.textContent = text;
      out.classList.toggle("bad", !!bad);
    };
    const play = async () => {
      const id = ++run;
      for (let i = 0; i < STEPS.length; i++) {
        show(i);
        await wait(STEPS[i][2] ? 1900 : 1350);
        if (id !== run) return;
      }
      rows.forEach((r) => { r.classList.remove("on", "bad"); r.classList.add("done"); });
      await wait(3200);
      if (id === run && visible) play();
    };
    if (reduce) { show(STEPS.length - 1); rows.forEach((r) => r.classList.add("done")); return; }
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) play();
      else if (!visible) run += 1;
    }, { threshold: .3 }).observe(root);
  };
  replay("#bugflow", "#bugflowlog", [
    [0, "report: the Pay button does nothing on my phone"],
    [1, "reading the page's code, logs and recent commits"],
    [2, "opening the app in a browser at the reported screen size"],
    [3, "reproduced: the click never reaches the button"],
    [4, "verdict: genuine and in scope"],
    [5, "root cause: an overlay from the last commit covers the button"],
    [6, "targeted patch applied"],
    [7, "tests pass, browser regression fails", "bad"],
    [8, "revising the patch, retry 1"],
    [7, "all checks pass, the original bug no longer reproduces"],
    [9, "pull request opened with root cause and evidence"],
    [10, "outcome recorded, waiting for human approval"],
  ]);
  replay("#flow", "#flowlog", [
    [0, "task: access-control, one worker owns its files"],
    [1, "codex-1 builds it in its own worktree"],
    [2, "claude-1 inspects the exact commit's diff"],
    [3, "check failed: exit code 1", "bad"],
    [4, "failure returned with evidence, repair round 1 of 3"],
    [1, "codex-1 submits a corrected commit"],
    [2, "earlier review void, claude-1 reviews the new commit"],
    [3, "checks pass, verifier hash unchanged"],
    [5, "integrated after checks on the combined branch"],
  ]);

  /* ---------- RAG trace: a question moves through the real pipeline stages ---------- */
  (function trace() {
    const root = $("#trace");
    if (!root) return;
    const DOCS = {
      "T1059.001": "Command and Scripting Interpreter: PowerShell",
      "T1059.003": "Command and Scripting Interpreter: Windows Command Shell",
      "T1546.013": "Event Triggered Execution: PowerShell Profile",
      "T1562.010": "Impair Defenses: Downgrade Attack",
      "T1021.006": "Remote Services: Windows Remote Management",
    };
    const FIRST = ["T1059.003", "T1021.006", "T1059.001", "T1562.010", "T1546.013"];
    const RERANKED = ["T1059.001", "T1546.013", "T1562.010", "T1059.003", "T1021.006"];
    const COPY = {
      en: {
        q: "How do attackers abuse PowerShell?",
        toggle: "Translate to Arabic",
        answer: [
          ["Attackers use PowerShell to run commands and scripts during execution.", 1],
          [" They can persist by editing PowerShell profiles.", 2],
          [" They can also downgrade to an older version to avoid logging.", 3],
        ],
      },
      ar: {
        q: "كيف يستغل المهاجمون PowerShell؟",
        toggle: "Back to English",
        answer: [
          ["يستخدم المهاجمون PowerShell لتشغيل الأوامر والسكربتات أثناء التنفيذ.", 1],
          [" وقد يعدّلون ملفات التعريف الخاصة به للبقاء في النظام.", 2],
          [" وقد يرجعون لإصدار أقدم لتفادي التسجيل.", 3],
        ],
      },
    };
    const list = $("#tracelist");
    const ans = $("#traceans");
    const ask = $("#traceask");
    const toggle = $("#tracelang");
    const steps = $$("#tracesteps li");
    const rows = new Map();
    Object.entries(DOCS).forEach(([id, name]) => {
      const li = document.createElement("li");
      const rank = document.createElement("b");
      const code = document.createElement("code");
      code.textContent = id;
      const label = document.createElement("span");
      label.textContent = name;
      li.append(rank, code, label);
      rows.set(id, li);
    });
    const order = (ids) => {
      ids.forEach((id, i) => {
        const li = rows.get(id);
        li.firstChild.textContent = i + 1;
        list.append(li);
      });
    };
    order(FIRST);
    let run = 0, visible = false, lang = "en";
    const setStep = (i, skip) => steps.forEach((s, n) => {
      s.className = n === i ? "on" : n < i ? (skip === n ? "passed" : "done") : "";
    });
    const cite = (n) => {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "cite";
      c.textContent = n;
      c.setAttribute("aria-label", `Source ${n}: ${RERANKED[n - 1]}`);
      const target = rows.get(RERANKED[n - 1]);
      c.addEventListener("mouseenter", () => target.classList.add("hl"));
      c.addEventListener("mouseleave", () => target.classList.remove("hl"));
      c.addEventListener("focus", () => target.classList.add("hl"));
      c.addEventListener("blur", () => target.classList.remove("hl"));
      return c;
    };
    const play = async () => {
      const id = ++run;
      const live = () => id === run;
      const copy = COPY[lang];
      ask.textContent = copy.q;
      ask.lang = lang;
      ask.dir = lang === "ar" ? "rtl" : "ltr";
      $("span", toggle).textContent = copy.toggle;
      ans.textContent = "";
      ans.dir = ask.dir;
      ans.lang = lang;
      ans.classList.remove("on");
      rows.forEach((r) => { r.classList.remove("show", "top", "hl"); });
      order(FIRST);
      const skip = lang === "en" ? 0 : -1;
      setStep(0, skip);
      await wait(lang === "en" ? 350 : 1000);
      if (!live()) return;
      setStep(1, skip);
      for (const fid of FIRST) {
        rows.get(fid).classList.add("show");
        await wait(130);
        if (!live()) return;
      }
      await wait(650);
      if (!live()) return;
      setStep(2, skip);
      await wait(350);
      if (!live()) return;
      flipRows([...rows.values()], () => order(RERANKED));
      await wait(620);
      if (!live()) return;
      RERANKED.slice(0, 3).forEach((fid) => rows.get(fid).classList.add("top"));
      setStep(3, skip);
      ans.classList.add("on");
      for (const [text, n] of copy.answer) {
        const span = document.createElement("span");
        ans.append(span);
        if (reduce) span.textContent = text;
        else for (let i = 0; i < text.length; i += 2) {
          span.textContent = text.slice(0, i + 2);
          await wait(14);
          if (!live()) return;
        }
        ans.append(cite(n));
      }
      setStep(4, skip);
      if (reduce) return;
      await wait(9000);
      if (live() && visible) play();
    };
    toggle.addEventListener("click", () => { lang = lang === "en" ? "ar" : "en"; play(); });
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) play();
    }, { threshold: .3 }).observe(root);
  })();

  /* ---------- eval chart: bars grow, values count ---------- */
  (function bars() {
    const box = $("#bars");
    if (!box) return;
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      box.classList.add("in");
      if (reduce) return;
      $$(".bar-v", box).forEach((el, i) => {
        const to = +el.dataset.countTo;
        const start = performance.now() + i * 120;
        const tick = (t) => {
          const k = Math.max(0, Math.min(1, (t - start) / 1300));
          el.textContent = "0." + String(Math.round(to * (1 - Math.pow(1 - k, 4)))).padStart(3, "0");
          if (k < 1) requestAnimationFrame(tick);
        };
        el.textContent = "0.000";
        requestAnimationFrame(tick);
      });
    }, { threshold: .4 }).observe(box);
  })();

  /* ---------- store platform: an example chat builds upward like messaging, in either language ---------- */
  (function chat() {
    const log = $("#chatlog");
    if (!log) return;
    const toggle = $("#chatlang");
    const COPY = {
      en: {
        by: "AI assistant",
        toggle: "Translate to Arabic",
        script: [
          ["me", "Do you have Cambodian oud oil?"],
          ["ai", "Yes. Cambodian oud oil 12 ml is 349 SAR, long-lasting and in stock.", { name: "Cambodian oud oil 12 ml", price: "349 SAR", stock: "In stock" }],
          ["me", "Where's my order, number 1042?"],
          ["ai", "Order 1042 left with SMSA yesterday and should reach you within 2 days."],
          ["me", "I'd like to talk to the team"],
          ["ai", "Of course, I'm connecting you with the team now."],
        ],
      },
      ar: {
        by: "مساعد ذكي",
        toggle: "Back to English",
        script: [
          ["me", "عندكم دهن عود كمبودي؟"],
          ["ai", "إيه موجود. دهن عود كمبودي 12 مل بسعر 349 ر.س، ثباته عالي ومتوفر الحين.", { name: "دهن عود كمبودي 12 مل", price: "349 ر.س", stock: "متوفر" }],
          ["me", "وين طلبي رقم 1042؟"],
          ["ai", "طلبك رقم 1042 طلع مع SMSA أمس، ويوصلك خلال يومين."],
          ["me", "أبي أكلم الفريق"],
          ["ai", "أبشر، بوصّلك بالفريق الحين."],
        ],
      },
    };
    let lang = "en";
    const bubble = (who, text, card) => {
      const el = document.createElement("div");
      el.className = `msg ${who}`;
      if (who === "ai") {
        const by = document.createElement("span");
        by.className = "by";
        by.textContent = COPY[lang].by;
        el.append(by);
      }
      const t = document.createElement("p");
      t.textContent = text;
      el.append(t);
      if (card) {
        const c = document.createElement("div");
        c.className = "pcard";
        const n = document.createElement("b");
        n.textContent = card.name;
        const m = document.createElement("span");
        m.textContent = `${card.price} · ${card.stock}`;
        c.append(n, m);
        el.append(c);
      }
      return el;
    };
    const add = (el) => {
      const old = [...log.children];
      flipRows(old, () => log.append(el));
      if (!reduce) el.animate([{ opacity: 0, transform: "translateY(14px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 460, easing: "cubic-bezier(.22,1,.36,1)" });
    };
    const typing = () => {
      const el = document.createElement("div");
      el.className = "msg ai typing";
      el.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
      return el;
    };
    let run = 0, visible = false;
    const play = async () => {
      const id = ++run;
      const copy = COPY[lang];
      log.textContent = "";
      log.lang = lang;
      log.dir = lang === "ar" ? "rtl" : "ltr";
      $("span", toggle).textContent = copy.toggle;
      if (reduce) { copy.script.slice(0, 4).forEach(([w, t, c]) => log.append(bubble(w, t, c))); return; }
      for (const [who, text, card] of copy.script) {
        if (who === "ai") {
          const dots = typing();
          add(dots);
          await wait(1150);
          if (id !== run) return;
          const next = bubble(who, text, card);
          flipRows([...log.children].filter((x) => x !== dots), () => dots.replaceWith(next));
          next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
        } else {
          add(bubble(who, text));
        }
        await wait(who === "me" ? 500 : 1900);
        if (id !== run) return;
      }
      await wait(2600);
      if (id === run && visible) play();
    };
    toggle.addEventListener("click", () => { lang = lang === "en" ? "ar" : "en"; play(); });
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) play();
      else if (!visible) run += 1;
    }, { threshold: .25 }).observe($("#chat"));
  })();

  /* ---------- copy the email address ---------- */
  const copy = $("#copy");
  if (copy) copy.addEventListener("click", async () => {
    const txt = $("#copytxt");
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      copy.classList.add("done");
      txt.textContent = "Copied";
    } catch {
      txt.textContent = "Press Ctrl+C";
      getSelection()?.selectAllChildren($(".mail-link"));
    }
    setTimeout(() => { copy.classList.remove("done"); txt.textContent = "Copy"; }, 2200);
  });

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { moveInd(); onScroll(); }, { passive: true });
  document.fonts?.ready.then(moveInd);
  onScroll();
})();

