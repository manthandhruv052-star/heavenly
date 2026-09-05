/* ============================================================
   Heavenly Captured — motion + chat
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------
   Contact-sheet cells. Built here so the markup stays clean.
   Swap these URLs for real portfolio frames.
   ------------------------------------------------------------ */
const SHEET_IMAGES = [
  '1606800052052-a08af7148866', '1595407753234-0882f1e77954',
  '1620145648299-f926ac0a9268', '1600628421055-4d30de868b8f',
  '1583939003579-730e3918a45a', '1591604466107-ec97de577aff',
  '1604608672516-f1b9b1a0a3f9', '1519741497674-611481863552',
  '1519689680058-324335c77eba', '1606800052052-a08af7148866',
  '1595407753234-0882f1e77954', '1620145648299-f926ac0a9268',
];

(function buildSheet() {
  const grid = $('#sheetGrid');
  if (!grid) return;
  grid.innerHTML = SHEET_IMAGES.map((id) =>
    `<div class="sheet__cell" style="background-image:url('https://images.unsplash.com/photo-${id}?q=80&w=700&auto=format&fit=crop')"></div>`
  ).join('');
})();

/* ============================================================
   PRELOADER → HERO
   One orchestrated opening. Everything else on the page is
   triggered by the visitor's own scrolling.
   ============================================================ */
function bootIntro() {
  const loader = $('#loader');
  const fill = $('#loaderFill');
  const pct = $('#loaderPct');

  const finish = () => {
    loader.style.display = 'none';
    document.body.classList.remove('is-locked');
    $('#chatFab').classList.add('is-nudge');
    $('#rail').classList.add('is-on');
  };

  if (REDUCED) {
    $$('.hero__title .w').forEach((w) => gsap.set(w, { y: 0, opacity: 1 }));
    finish();
    return;
  }

  document.body.classList.add('is-locked');

  const words = $$('.loader__word');
  const counter = { v: 0 };

  const tl = gsap.timeline();

  tl.from(words, { yPercent: 115, duration: 1.1, stagger: .12, ease: 'expo.out' })
    .to(fill, { right: '0%', duration: 1.7, ease: 'power2.inOut' }, .25)
    .to(counter, {
      v: 100, duration: 1.7, ease: 'power2.inOut',
      onUpdate: () => { pct.textContent = Math.round(counter.v); },
    }, .25)
    // curtain lift
    .to(loader, { yPercent: -100, duration: 1.15, ease: 'expo.inOut', onComplete: finish }, '+=.2')
    // …straight into the shutter: the two blades part on a horizontal slit,
    // so the loader's curtain and the hero reveal read as one gesture.
    .to('.hero__blade--t', { yPercent: -100, duration: 1.5, ease: 'expo.inOut' }, '-=.95')
    .to('.hero__blade--b', { yPercent: 100, duration: 1.5, ease: 'expo.inOut' }, '<')
    // the image pushes in as the blades clear
    .from('.hero__dolly', { scale: 1.28, duration: 2.4, ease: 'expo.out' }, '<')
    .from('.hero__kicker', { opacity: 0, y: 18, duration: .8, ease: 'power2.out' }, '-=1.5')
    .from('.hero__title .w', {
      yPercent: 118, duration: 1.25, stagger: .07, ease: 'expo.out',
    }, '-=1.35')
    .from('.hero__sub', { opacity: 0, y: 20, duration: .9, ease: 'power2.out' }, '-=.75')
    .from('.hero__meta', { opacity: 0, duration: .8 }, '-=.6');
}

/* ============================================================
   HERO PARALLAX — the whole frame dollies out as you leave,
   so the first scroll feels like a camera move, not a jump cut.
   ============================================================ */
function heroParallax() {
  if (REDUCED) return;

  gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: .8,
    },
  })
    .to('#heroDolly', { yPercent: 16, scale: 1.12, ease: 'none' }, 0)
    .to('#heroContent', { yPercent: -32, opacity: 0, ease: 'none' }, 0);
}

/* ============================================================
   HERO — cross-dissolving film cuts
   ============================================================ */
function heroFrames() {
  const frames = $$('.hero__frame');
  const num = $('#frameNum');
  if (frames.length < 2) return;

  let i = 0;
  setInterval(() => {
    const prev = frames[i];
    i = (i + 1) % frames.length;
    const next = frames[i];

    num.textContent = String(i + 1).padStart(2, '0');

    if (REDUCED) {
      prev.classList.remove('is-active');
      next.classList.add('is-active');
      return;
    }

    gsap.set(next, { opacity: 0, scale: 1.1 });
    next.classList.add('is-active');
    gsap.to(next, { opacity: 1, scale: 1, duration: 1.9, ease: 'power2.inOut' });
    gsap.to(prev, {
      opacity: 0, duration: 1.9, ease: 'power2.inOut',
      onComplete: () => prev.classList.remove('is-active'),
    });
  }, 5200);
}

/* ============================================================
   NAV + RAIL
   The rail is the whole navigation: four dots that mark where
   you are. No menu to open, nothing to read until you hover.
   ============================================================ */
function navState() {
  ScrollTrigger.create({
    start: 'top -80',
    onUpdate: (self) => $('#nav').classList.toggle('is-stuck', self.scroll() > 80),
  });

  const links = $$('#rail a');
  const fill = $('#railFill');
  const rail = $('#rail');

  // Grow the progress line down the rail as the page advances.
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => { fill.style.height = `${self.progress * 100}%`; },
  });

  // Mark the section currently filling the viewport.
  links.forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (!section) return;

    const mark = (on) => {
      if (!on) return;
      links.forEach((l) => l.classList.toggle('is-here', l === link));
    };

    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => mark(self.isActive),
    });
  });

  // Above the first tracked section nothing should look selected.
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom 55%',
    onToggle: (self) => {
      if (self.isActive) links.forEach((l) => l.classList.remove('is-here'));
    },
  });

  // Hide the rail once the visitor reaches the footer — there is
  // nowhere left to jump to.
  ScrollTrigger.create({
    trigger: '.foot',
    start: 'top 90%',
    onToggle: (self) => rail.classList.toggle('is-on', !self.isActive),
  });
}

/* ============================================================
   MARQUEE — seamless loop
   ============================================================ */
function marquee() {
  const track = $('#marqueeTrack');
  if (!track || REDUCED) return;

  track.innerHTML += track.innerHTML; // duplicate for seamless wrap
  const half = track.scrollWidth / 2;

  gsap.to(track, {
    x: -half,
    duration: 26,
    ease: 'none',
    repeat: -1,
    modifiers: { x: (x) => `${parseFloat(x) % half}px` },
  });
}

/* ============================================================
   STORY — reveal + counting stats
   ============================================================ */
function story() {
  if (!REDUCED) {
    gsap.from('.story__img', {
      scrollTrigger: { trigger: '.story', start: 'top 72%' },
      scale: 1.18, duration: 1.6, ease: 'expo.out',
    });

    gsap.from('.story__h, .story__text p', {
      scrollTrigger: { trigger: '.story__text', start: 'top 78%' },
      y: 30, opacity: 0, duration: 1, stagger: .12, ease: 'power3.out',
    });
  }

  $$('.story__stats dd').forEach((el) => {
    const target = +el.dataset.count;
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => {
        if (REDUCED) { el.textContent = target.toLocaleString('en-IN'); return; }
        const o = { v: 0 };
        gsap.to(o, {
          v: target, duration: 1.9, ease: 'power2.out',
          onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-IN'); },
        });
      },
    });
  });
}

/* ============================================================
   FILMSTRIP — horizontal scrub, pinned
   ============================================================ */
function filmstrip() {
  const track = $('#stripTrack');
  const pin = $('#stripPin');
  const bar = $('#stripProgress');
  if (!track || REDUCED) return;

  // On a very wide viewport the strip can be narrower than the screen; a
  // negative distance would scroll it backwards, so clamp at zero.
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);

  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.strip',
      pin: pin,
      start: 'top top',
      end: () => `+=${distance() || 1}`,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => { bar.style.width = `${self.progress * 100}%`; },
    },
  });
}

/* ============================================================
   CONTACT SHEET — scattered frames assemble into a grid,
   then the copy resolves. This is the page's one set piece.
   ============================================================ */
function contactSheet() {
  const cells = $$('.sheet__cell');
  if (!cells.length || REDUCED) return;

  const HERO_CELL = 5; // the frame that steps forward at the end

  // Each cell starts pushed out along its own angle, so they converge inward.
  // Read from the live viewport via functions — ScrollTrigger re-evaluates
  // these on refresh, so a resize rescatters correctly instead of using
  // whatever the window measured at load.
  const scatter = {
    x: (i) => Math.cos((i / cells.length) * Math.PI * 2) * (window.innerWidth * .55),
    y: (i) => Math.sin((i / cells.length) * Math.PI * 2) * (window.innerHeight * .5),
    rotate: (i) => (i % 2 ? 1 : -1) * (14 + (i % 5) * 4),
    scale: .55,
    opacity: 0,
  };

  gsap.set(cells, scatter);
  gsap.set('#sheetCopy', { opacity: 0, y: 24 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.sheet',
      start: 'top top',
      end: '+=180%',
      pin: '.sheet__pin',
      scrub: 1.1,
      invalidateOnRefresh: true,
    },
  });

  tl.fromTo(cells, scatter, {
    x: 0, y: 0, rotate: 0, scale: 1, opacity: 1,
    duration: 1.4, ease: 'power3.out',
    // 'edges' reads as frames snapping inward and is stable across reloads,
    // unlike a random stagger.
    stagger: { each: .05, from: 'edges' },
  })
    .to('#sheetCopy', { opacity: 1, y: 0, duration: .7, ease: 'power2.out' }, '-=.45')
    // one frame steps forward out of the sheet
    .to(cells[HERO_CELL], { scale: 1.06, filter: 'saturate(1.05) brightness(1)', duration: .8 }, '-=.3')
    .to(cells.filter((_, i) => i !== HERO_CELL), { opacity: .34, duration: .8 }, '<');
}

/* ============================================================
   SERVICES + TESTIMONIALS reveal
   ============================================================ */
function reveals() {
  if (REDUCED) return;

  gsap.from('.svc__row', {
    scrollTrigger: { trigger: '.svc__list', start: 'top 76%' },
    y: 34, opacity: 0, duration: .9, stagger: .1, ease: 'power3.out',
  });

  // The river cards are cloned and transformed by their own loop, so
  // reveal the rows as a whole rather than animating individual cards.
  gsap.from('.river__row', {
    scrollTrigger: { trigger: '.river', start: 'top 82%' },
    y: 30, opacity: 0, duration: .9, stagger: .12, ease: 'power3.out',
  });

  gsap.from('.enq__left > *, .enq__form > *', {
    scrollTrigger: { trigger: '.enq', start: 'top 74%' },
    y: 26, opacity: 0, duration: .85, stagger: .07, ease: 'power3.out',
  });
}

/* ============================================================
   TESTIMONIAL RIVER
   Two rows drifting in opposite directions, forever. Scrolling
   the page nudges their speed, so the section responds to you
   without ever demanding a click.
   ============================================================ */
function voiceRiver() {
  const rows = $$('.river__row');
  if (!rows.length || REDUCED) return;

  rows.forEach((row, index) => {
    const track = $('.river__track', row);
    const dir = Number(row.dataset.dir) || 1;

    // Duplicate the cards so the wrap has no visible seam.
    track.innerHTML += track.innerHTML;
    const half = track.scrollWidth / 2;
    if (!half) return;

    // The right-moving row starts shifted back by one loop so it has
    // content on screen instead of animating in from empty space.
    gsap.set(track, { x: dir === 1 ? -half : 0 });

    const drift = gsap.to(track, {
      x: dir === 1 ? 0 : -half,
      duration: 42 + index * 6,
      ease: 'none',
      repeat: -1,
      modifiers: {
        x: (x) => `${gsap.utils.wrap(-half, 0, parseFloat(x))}px`,
      },
    });

    // Scroll velocity leans on the drift, then it eases back to rest.
    ScrollTrigger.create({
      trigger: '.voices',
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 1200, 5);
        gsap.to(drift, { timeScale: boost, duration: .3, overwrite: true });
        gsap.to(drift, { timeScale: 1, duration: 1.1, delay: .3, overwrite: false });
      },
    });
  });
}

/* ============================================================
   ENQUIRY FORM
   No backend for this yet — it validates and confirms locally.
   Wire the submit handler to your CRM or an email service.
   ============================================================ */
function enquiry() {
  const form = $('#enqForm');
  const status = $('#enqStatus');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#f-name');
    const mail = $('#f-mail');
    let ok = true;

    [name, mail].forEach((input) => {
      const bad = input === mail
        ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())
        : input.value.trim().length < 2;
      input.parentElement.classList.toggle('is-bad', bad);
      if (bad) ok = false;
    });

    if (!ok) {
      status.textContent = 'Add your name and a valid email so we can reply.';
      status.classList.add('is-bad');
      return;
    }

    status.classList.remove('is-bad');
    status.textContent = `Thanks ${name.value.trim().split(' ')[0]} — we'll be in touch within two days.`;
    form.reset();
  });
}

/* ============================================================
   CHATBOT — streams from /api/chat (Groq, server-side key)
   ============================================================ */
function chatbot() {
  const fab = $('#chatFab');
  const panel = $('#chatPanel');
  const log = $('#chatLog');
  const form = $('#chatForm');
  const input = $('#chatInput');
  const chips = $('#chatChips');

  let open = false;
  let busy = false;
  const history = [];

  const bubble = (text, kind) => {
    const el = document.createElement('div');
    el.className = `msg msg--${kind}`;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };

  const greet = () => {
    if (log.children.length) return;
    bubble("Hi — I'm Aria. Ask me about dates, what coverage includes, or how the albums work.", 'bot');
  };

  const setOpen = (next) => {
    open = next;
    fab.setAttribute('aria-expanded', String(open));
    fab.classList.remove('is-nudge');

    if (open) {
      panel.hidden = false;
      greet();
      gsap.fromTo(panel,
        { opacity: 0, y: 16, scale: .97 },
        { opacity: 1, y: 0, scale: 1, duration: .45, ease: 'power3.out' });
      setTimeout(() => input.focus(), 120);
    } else {
      gsap.to(panel, {
        opacity: 0, y: 12, scale: .98, duration: .28, ease: 'power2.in',
        onComplete: () => { panel.hidden = true; },
      });
    }
  };

  fab.addEventListener('click', () => setOpen(!open));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false); });

  async function send(text) {
    if (busy || !text.trim()) return;
    busy = true;
    chips.classList.add('is-gone');

    bubble(text, 'me');
    history.push({ role: 'user', content: text });
    input.value = '';

    const typing = document.createElement('div');
    typing.className = 'msg msg--bot msg--typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        typing.remove();
        bubble(error || 'The assistant is unavailable right now. Try the enquiry form above.', 'err');
        busy = false;
        return;
      }

      // Stream plain-text deltas straight into the bubble.
      typing.remove();
      const out = bubble('', 'bot');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        out.textContent = full;
        log.scrollTop = log.scrollHeight;
      }

      history.push({ role: 'assistant', content: full });
    } catch {
      typing.remove();
      bubble('Connection lost. Please check your network and try again.', 'err');
    } finally {
      busy = false;
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
  $$('#chatChips button').forEach((b) => b.addEventListener('click', () => send(b.textContent)));
}

/* ============================================================
   BOOT
   ============================================================ */
$('#year').textContent = new Date().getFullYear();

bootIntro();
heroParallax();
heroFrames();
navState();
marquee();
story();
filmstrip();
contactSheet();
reveals();
voiceRiver();
enquiry();
chatbot();

window.addEventListener('load', () => ScrollTrigger.refresh());
