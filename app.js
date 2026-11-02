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
    ind.style.width = a.offsetWidth + "px";
    ind.style.transform = `translateX(${a.offsetLeft}px)`;
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

  /* ---------- terminal line types itself ---------- */
  const typed = $("#typed");
  if (!reduce && typed) {
    const full = typed.textContent;
    typed.textContent = "";
    typed.setAttribute("aria-label", full);
    let i = 0;
    setTimeout(function next() {
      typed.textContent = full.slice(0, ++i);
      if (i < full.length) setTimeout(next, full[i - 1] === "." ? 240 : 42);
    }, 800);
  }

  /* ---------- marquee: double the track so the loop has no seam ---------- */
  $$(".marquee-row").forEach((row) => {
    const track = $(".marquee-track", row);
    const copy = track.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    row.append(copy);
  });
  const marquee = $(".marquee");
  if (marquee) new IntersectionObserver(([e]) => marquee.classList.toggle("off", !e.isIntersecting)).observe(marquee);

  /* ---------- the perimeter: traffic, gates and the visitor's attacks ---------- */
  (function perimeter() {
    const hero = $("#hero");
    const stage = $("#pmstage");
    const canvas = $("#pm");
    const core = $("#pmcore");
    const log = $("#pm-log");
    const ctx = canvas.getContext("2d");
    const triesEl = $("#pm-tries");
    if (!ctx) return;

    const TEAL = "45,212,191";
    const RED = "251,113,133";
    const GATES = [
      { label: "rate limit", k: 1, dash: [26, 12], speed: .05, dir: 1 },
      { label: "signature", k: .69, dash: [3, 7], speed: .09, dir: -1 },
      { label: "role + row-level security", k: .42, dash: [58, 10], speed: .035, dir: 1 },
    ];
    let W = 0, H = 0, cx = 0, cy = 0, S = 0, coreR = 56, dpr = 1, wide = true;
    let packets = [], flashes = [], sparks = [], tags = [], pulse = 0;
    let px = 0, py = 0, tx = 0, ty = 0;
    let running = false, last = 0, bornAt = 0, nextSpawn = 0, nextLog = 0, quietUntil = 0, tries = 0;

    const resize = () => {
      const r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      wide = innerWidth > 1000;
      if (wide) {
        S = Math.min(W * .235, H * .4);
        cx = W * .69;
        cy = Math.max(S + 84, H * .41);
      } else {
        S = Math.min(W * .46, H * .47);
        cx = W / 2;
        cy = H / 2;
      }
      coreR = Math.max(34, S * .19);
      core.style.setProperty("--cx", cx + "px");
      core.style.setProperty("--cy", cy + "px");
      core.style.setProperty("--core", coreR * 2 + "px");
      if (!running) draw(performance.now());
    };

    const gateR = (i) => GATES[i].k * S;
    const addLog = (text, kind) => {
      const li = document.createElement("div");
      if (kind) li.className = kind;
      const t = document.createElement("time");
      t.textContent = new Date().toTimeString().slice(0, 8);
      const s = document.createElement("span");
      s.textContent = text;
      li.append(t, s);
      log.append(li);
      while (log.children.length > 12) log.firstChild.remove();
    };

    /* a packet travels inward in polar space and either passes a gate or stops there */
    const spawn = (o) => {
      const a = o.a ?? Math.random() * Math.PI * 2;
      const r0 = o.r0 ?? S * (1.75 + Math.random() * .5);
      packets.push({
        a, r: r0, r0,
        speed: o.speed ?? (S * (.75 + Math.random() * .5)),
        curl: o.curl ?? (Math.random() - .5) * .35,
        bad: !!o.bad,
        stop: o.stop ?? -1,
        size: o.size ?? 1,
        next: 0,
        text: o.text,
        hit: o.hit,
        tag: o.tag,
      });
    };
    const flash = (gate, a, rgb, life = 1) => flashes.push({ gate, a, rgb, life, max: life });
    const burst = (x, y, rgb, n = 12) => {
      for (let i = 0; i < n; i++) {
        const t = Math.random() * Math.PI * 2;
        const v = 60 + Math.random() * 150;
        sparks.push({ x, y, vx: Math.cos(t) * v, vy: Math.sin(t) * v, life: .5 + Math.random() * .4, rgb });
      }
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

    const runAttack = (name, btn) => {
      tries += 1;
      triesEl.textContent = tries;
      quietUntil = performance.now() + 4200;
      btn?.classList.add("live");
      const done = () => btn?.classList.remove("live");
      if (name === "flood") {
        addLog("one IP, hundreds of requests a minute");
        const hit = () => {
          addLog("per-IP limit reached");
          addLog("429 too many requests", "no");
          done();
        };
        if (reduce) { flash(0, -.6, RED, 1.2); hit(); redrawSoon(); return; }
        const a = Math.random() * Math.PI * 2;
        const total = 26;
        for (let i = 0; i < total; i++) {
          setTimeout(() => spawn({
            a: a + (Math.random() - .5) * .8,
            bad: true, stop: 0, speed: S * (1.9 + Math.random() * .6), size: .8, curl: 0,
            r0: S * 1.6,
            tag: i === total - 1 ? "429" : null,
            hit: i === total - 1 ? hit : null,
          }), i * 38);
        }
        return;
      }
      const atk = ATTACKS[name];
      atk.first.forEach((l) => addLog(l));
      const hit = () => { atk.after.forEach(([l, k], i) => setTimeout(() => addLog(l, k), i * 240)); done(); };
      if (reduce) { flash(atk.stop, -.6, RED, 1.2); hit(); redrawSoon(); return; }
      spawn({
        a: -Math.PI * (.15 + Math.random() * .7), bad: true, stop: atk.stop, r0: S * 1.55,
        speed: S * .85, curl: (Math.random() - .5) * .5, size: 1.9,
        text: atk.text, tag: atk.tag, hit,
      });
    };
    const redrawSoon = () => { draw(performance.now()); setTimeout(() => { flashes = []; draw(performance.now()); }, 1200); };
    $$(".attack").forEach((b) => b.addEventListener("click", () => runAttack(b.dataset.attack, b)));

    /* clicking the rings sends a bad request from that exact spot */
    canvas.addEventListener("pointerdown", (e) => {
      if (reduce) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left - cx, y = e.clientY - r.top - cy;
      const d = Math.hypot(x, y);
      let stop = -1;
      for (let i = 0; i < GATES.length; i++) if (d > gateR(i)) { stop = i; break; }
      if (stop < 0) stop = 2;
      tries += 1;
      triesEl.textContent = tries;
      quietUntil = performance.now() + 2600;
      spawn({ a: Math.atan2(y, x), r0: Math.max(d, gateR(stop) + 8), bad: true, stop, speed: S * 1.2, curl: 0, size: 1.5, tag: stop === 0 ? "429" : stop === 1 ? "403" : "0 rows" });
      addLog(`request from the outside ${["hits the rate limit", "fails the signature check", "has no access to that row"][stop]}`, "no");
    });

    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - .5) * 14;
      ty = ((e.clientY - r.top) / r.height - .5) * 14;
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; });

    const ambientLines = [
      ["200 POST /webhook/orders  signature ok", "ok"],
      ["200 GET /orders/1042  role=user, own row", "ok"],
      ["200 GET /health  heartbeat ok", "ok"],
      ["403 POST /webhook/orders  bad signature", "no"],
      ["429 GET /orders  per-IP limit", "no"],
    ];

    const ease = (k) => 1 - Math.pow(1 - k, 3);

    function draw(now) {
      const age = reduce ? 1 : Math.min(1, (now - bornAt) / 1500);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const ox = cx + px, oy = cy + py;

      /* rings sweep in, then keep turning */
      GATES.forEach((g, i) => {
        const r = g.k * S;
        const k = ease(Math.max(0, Math.min(1, age * 1.5 - i * .22)));
        const spin = reduce ? 0 : (now / 1000) * g.speed * g.dir;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(spin - Math.PI / 2);
        ctx.setLineDash(g.dash);
        ctx.lineWidth = i === 1 ? 2.5 : 1.5;
        ctx.strokeStyle = `rgba(${TEAL},${i === 1 ? .55 : .42})`;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2 * k);
        ctx.stroke();
        ctx.restore();
      });

      /* gate names sit on calm space above the rings */
      if (age > .7) {
        ctx.setLineDash([]);
        ctx.font = "500 12px " + getComputedStyle(document.body).getPropertyValue("--mono");
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        GATES.forEach((g, i) => {
          const r = g.k * S;
          const y = oy - r;
          const w = ctx.measureText(g.label).width + 14;
          ctx.fillStyle = "rgba(5,8,22,.92)";
          ctx.fillRect(ox - w / 2, y - 10, w, 20);
          ctx.fillStyle = `rgba(179,188,205,${Math.min(1, (age - .7) * 3.4)})`;
          ctx.fillText(g.label, ox, y);
        });
      }

      /* where a gate just acted */
      flashes.forEach((f) => {
        const r = gateR(f.gate);
        const k = f.life / f.max;
        ctx.setLineDash([]);
        ctx.lineWidth = 2 + 4 * k;
        ctx.strokeStyle = `rgba(${f.rgb},${k})`;
        ctx.beginPath();
        ctx.arc(ox, oy, r, f.a - .34, f.a + .34);
        ctx.stroke();
      });

      /* packets */
      packets.forEach((p) => {
        const x = ox + Math.cos(p.a) * p.r;
        const y = oy + Math.sin(p.a) * p.r;
        const len = 18 * p.size + (p.bad ? 10 : 0);
        const tailA = p.a - p.curl * .05;
        const x2 = ox + Math.cos(tailA) * (p.r + len);
        const y2 = oy + Math.sin(tailA) * (p.r + len);
        const rgb = p.bad ? RED : TEAL;
        const fade = Math.min(1, (p.r0 - p.r) / 70 + (p.size > 1 ? 1 : 0));
        const g = ctx.createLinearGradient(x, y, x2, y2);
        g.addColorStop(0, `rgba(${rgb},${.95 * fade})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.setLineDash([]);
        ctx.strokeStyle = g;
        ctx.lineWidth = 2 * p.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.fillStyle = `rgba(${rgb},${fade})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.6 * p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.text) {
          ctx.font = "500 12px " + getComputedStyle(document.body).getPropertyValue("--mono");
          ctx.textAlign = "center";
          ctx.fillStyle = `rgb(${RED})`;
          ctx.fillText(p.text, x, y - 16);
        }
      });

      /* sparks and verdict tags */
      sparks.forEach((s) => {
        ctx.strokeStyle = `rgba(${s.rgb},${Math.min(1, s.life * 2)})`;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * .03, s.y - s.vy * .03);
        ctx.stroke();
      });
      tags.forEach((t) => {
        const k = Math.min(1, t.life);
        ctx.font = "700 " + (t.big ? 20 : 14) + "px " + getComputedStyle(document.body).getPropertyValue("--disp");
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(${RED},${k})`;
        ctx.fillText(t.text, t.x, t.y);
      });

      /* the core answers each clean request */
      if (pulse > 0) {
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${TEAL},${pulse * .7})`;
        ctx.beginPath();
        ctx.arc(ox, oy, coreR + (1 - pulse) * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function step(now) {
      if (!running) return;
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;

      px += (tx - px) * .06;
      py += (ty - py) * .06;
      core.style.setProperty("--px", px.toFixed(2) + "px");
      core.style.setProperty("--py", py.toFixed(2) + "px");

      if (now > nextSpawn && now - bornAt > 1100) {
        const bad = Math.random() < .2;
        spawn({ bad, stop: bad ? Math.floor(Math.random() * 3) : -1, tag: null });
        nextSpawn = now + 170 + Math.random() * 300;
      }
      if (now > nextLog && now > quietUntil && now - bornAt > 1800) {
        const [l, k] = ambientLines[Math.random() < .72 ? Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2)];
        addLog(l, k);
        nextLog = now + 1700 + Math.random() * 1500;
      }

      const ox = cx + px, oy = cy + py;
      packets = packets.filter((p) => {
        const before = p.r;
        p.r -= p.speed * dt;
        p.a += p.curl * dt * (p.r / p.r0);
        for (let i = p.next; i < GATES.length; i++) {
          const r = gateR(i);
          if (before > r && p.r <= r) {
            p.next = i + 1;
            if (p.stop === i) {
              const x = ox + Math.cos(p.a) * r, y = oy + Math.sin(p.a) * r;
              flash(i, p.a, RED, p.size > 1.2 ? 1.1 : .55);
              burst(x, y, RED, p.size > 1.2 ? 22 : 6);
              if (p.tag) tags.push({ text: p.tag, x, y: y - 14, life: 1.5, big: true });
              p.hit?.();
              return false;
            }
            flash(i, p.a, TEAL, .28);
          }
        }
        if (p.r <= coreR) { pulse = 1; return false; }
        return true;
      });
      flashes = flashes.filter((f) => (f.life -= dt) > 0);
      sparks = sparks.filter((s) => {
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vx *= .94; s.vy *= .94;
        return (s.life -= dt) > 0;
      });
      tags = tags.filter((t) => { t.y -= 22 * dt; return (t.life -= dt) > 0; });
      pulse = Math.max(0, pulse - dt * 1.6);

      draw(now);
      requestAnimationFrame(step);
    }

    const start = () => {
      if (running || reduce) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(step);
    };
    const stop = () => { running = false; };

    bornAt = performance.now();
    resize();
    addEventListener("resize", resize, { passive: true });
    document.fonts?.ready.then(() => { if (!running) draw(performance.now()); });
    addLog("200 GET /health  heartbeat ok", "ok");
    if (reduce) { draw(performance.now()); return; }
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
      if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 720, easing: "cubic-bezier(.16,1,.3,1)" });
    });
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  /* ---------- coordinator: a replay of a task that fails, gets repaired and lands ---------- */
  (function flow() {
    const root = $("#flow");
    if (!root) return;
    const rows = $$("li", root);
    const out = $("#flowlog");
    const STEPS = [
      [0, "task: access-control, one worker owns its files"],
      [1, "codex-1 builds it in its own worktree"],
      [2, "claude-1 inspects the exact commit's diff"],
      [3, "check failed: exit code 1", "bad"],
      [4, "failure returned with evidence, repair round 1 of 3"],
      [1, "codex-1 submits a corrected commit"],
      [2, "earlier review void, claude-1 reviews the new commit"],
      [3, "checks pass, verifier hash unchanged"],
      [5, "integrated after checks on the combined branch"],
    ];
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
  })();

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
      if (!reduce) el.animate([{ opacity: 0, transform: "translateY(14px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 460, easing: "cubic-bezier(.16,1,.3,1)" });
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

  /* ---------- a quiet light follows the pointer across panels ---------- */
  $$(".spot, .rag, .shopbot").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });
  });

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

