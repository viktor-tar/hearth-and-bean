/*
 * Hearth & Bean: the home page's interaction layer (ported unchanged in behaviour from the Webflow build's app.js).
 *
 * Elements are found through [data-hb="…"] attributes and their classes, so the markup in
 * src/components/home can change freely as long as those stay.
 * Classes this file writes: is-dark, is-hidden, is-on, nav--static, day--pin, day--strip, menu--pin, people--drag,
 * and on <html>: hb-js, hb-motion / hb-static, hb-fine, hb-loaded (the first two also come from the head snippet).
 *
 * initHomeMotion() returns a function that undoes everything (animations, listeners, timers).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

/** The 120 frames of the hero film, public/film/hb-film-001.webp … hb-film-120.webp */
const FILM_FRAMES = 120;
const frameUrl = (i: number) => `/film/hb-film-${String(i + 1).padStart(3, '0')}.webp`;

declare global {
  interface Window {
    hbReady?: boolean;
  }
}

type XY = [number, number];

export function initHomeMotion(): () => void {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const wideMq = matchMedia('(min-width:992px)');
  const wide = wideMq.matches;
  const motion = !reduce;

  root.classList.add('hb-js');
  root.classList.toggle('hb-motion', motion);
  root.classList.toggle('hb-static', !motion);
  if (fine) root.classList.add('hb-fine');
  window.hbReady = true;

  /* everything below is undone by the returned cleanup */
  const ac = new AbortController();
  const on = <K extends keyof WindowEventMap>(
    t: Window | Document | Element,
    type: K | string,
    fn: (e: never) => void,
    opts: AddEventListenerOptions = {},
  ) => t.addEventListener(type, fn as EventListener, { ...opts, signal: ac.signal });
  const timers: number[] = [];
  const intervals: number[] = [];
  const tickers: gsap.TickerCallback[] = [];
  let dead = false;

  const $ = <T extends Element = HTMLElement>(s: string, c?: ParentNode | null) =>
    (c || document).querySelector<T & Element>(s) as T | null;
  const $$ = <T extends Element = HTMLElement>(s: string, c?: ParentNode | null) =>
    Array.from((c || document).querySelectorAll(s)) as T[];
  const hb = <T extends Element = HTMLElement>(name: string, c?: ParentNode | null) =>
    $<T>(`[data-hb="${name}"]`, c);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const pad = (n: number) => (n < 10 ? '0' : '') + n;

  const ctx = gsap.context(() => {});
  const run = (fn: () => void) => ctx.add(fn);

  const nav = hb('nav')!;
  const loaderBar = hb('loader-bar');

  /* Lines that rise out of a mask need an inner element to move */
  $$('.line-mask').forEach((m) => {
    if (m.querySelector(':scope > .line-mask__inner')) return;
    const s = document.createElement('span');
    s.className = 'line-mask__inner';
    while (m.firstChild) s.appendChild(m.firstChild);
    m.appendChild(s);
  });

  /* ------------------------------------------------------------------ */
  /* Right now: the visitor's own clock decides which part of the day it is */
  /* ------------------------------------------------------------------ */
  function nowLine(h: number) {
    if (h < 5) return 'the embers are resting';
    if (h < 8) return 'the oven is going on';
    if (h < 11) return 'first pour';
    if (h < 15) return 'lunch from the fire';
    if (h < 18) return 'the slow hours';
    if (h < 20) return 'the lamps are coming on';
    return 'the fire is lit';
  }
  function tick() {
    const d = new Date();
    const t = pad(d.getHours()) + ':' + pad(d.getMinutes());
    const line = nowLine(d.getHours());
    const a = hb('nav-now'),
      b = hb('footer-clock'),
      c = hb('footer-now');
    if (a) a.textContent = t + ', ' + line;
    if (b) b.textContent = t;
    if (c) c.textContent = 'Right now: ' + line + '.';
  }
  tick();
  intervals.push(window.setInterval(tick, 15000));

  /* ------------------------------------------------------------------ */
  /* Loader                                                              */
  /* ------------------------------------------------------------------ */
  let loaded = false;
  function finishLoading() {
    if (loaded || dead) return;
    loaded = true;
    root.classList.add('hb-loaded');
    if (motion)
      run(() => {
        gsap.from('.hero__aperture', {
          yPercent: 14,
          opacity: 0,
          duration: 1.3,
          ease: 'power3.out',
          delay: 0.15,
          clearProps: 'transform,opacity',
        });
        // fade the two lines, not .hero__type itself: the scroll timeline owns that element's opacity
        gsap.from('.hero__type--ink .hero__line', {
          opacity: 0,
          duration: 1.1,
          ease: 'power2.out',
          delay: 0.35,
          clearProps: 'opacity',
        });
        gsap.from('.hero__meta, .nav', {
          opacity: 0,
          duration: 1.1,
          ease: 'power2.out',
          delay: 0.43,
          stagger: 0.08,
          clearProps: 'opacity',
        });
      });
  }
  timers.push(window.setTimeout(finishLoading, 3200));

  /* ------------------------------------------------------------------ */
  /* The pan: hotspots and list drive each other                         */
  /* ------------------------------------------------------------------ */
  (function pan() {
    const inner = hb('pan-inner');
    if (!inner) return;
    const pts: XY[] = [
      [63, 51],
      [27, 60],
      [46, 58],
      [80, 43],
      [16, 45],
    ];
    const hots = $$('.pan__hotspot'),
      rows = $$('.pan__row');
    let current = -1;
    const idx = (el: Element) => +(el.getAttribute('data-i') || 0);
    function act(i: number) {
      current = i;
      hots.forEach((h) => h.classList.toggle('is-on', idx(h) === i));
      rows.forEach((r) => {
        r.classList.toggle('is-on', idx(r) === i);
        r.setAttribute('aria-expanded', String(idx(r) === i));
      });
      if (!motion) return;
      run(() => {
        if (i < 0) {
          gsap.to(inner, {
            scale: 1,
            xPercent: 0,
            yPercent: 0,
            duration: 1,
            ease: 'power3.out',
            overwrite: true,
          });
          return;
        }
        const s = 1.45,
          p = pts[i];
        gsap.to(inner, {
          scale: s,
          xPercent: (50 - p[0]) * (s - 1),
          yPercent: (50 - p[1]) * (s - 1),
          duration: 1,
          ease: 'power3.out',
          overwrite: true,
        });
      });
    }
    let was = -1,
      pressed = false;
    hots.concat(rows).forEach((el) => {
      const i = idx(el);
      if (fine) on(el, 'pointerenter', () => act(i));
      // a tap focuses the button before it clicks it: remember what was open when the finger went down
      on(el, 'pointerdown', () => {
        was = current;
        pressed = true;
      });
      on(el, 'focus', () => act(i));
      on(el, 'click', () => {
        const prev = pressed ? was : current;
        pressed = false;
        act(fine || prev !== i ? i : -1);
      });
    });
    rows.forEach((r) => r.setAttribute('aria-expanded', 'false'));
    const list = hb('pan-list')!,
      details = $$('.pan__row-detail', list);
    let rv = 0;
    if (fine) {
      on(hb('pan-disc')!, 'pointerleave', () => act(-1));
      on(list, 'pointerleave', () => act(-1));
    }
    // The list keeps the height it has with its longest line open, so opening a line never moves the page.
    // Each detail also gets its own height (--pan-h) so one closes exactly as fast as the next one opens.
    function reserve() {
      list.style.height = '';
      let base = list.offsetHeight,
        open = 0;
      details.forEach((d) => {
        const h = Math.min(d.scrollHeight, 5 * parseFloat(getComputedStyle(d).fontSize));
        base -= d.offsetHeight;
        open = Math.max(open, h);
        d.style.setProperty('--pan-h', h + 'px');
      });
      list.style.height = Math.ceil(base + open) + 'px';
    }
    reserve();
    on(window, 'resize', () => {
      clearTimeout(rv);
      rv = window.setTimeout(reserve, 200);
      timers.push(rv);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => !dead && reserve());
  })();

  /* ------------------------------------------------------------------ */
  /* Menu: the rail shows the group cards and the featured dishes        */
  /* (in order already: see src/components/home/MenuRail.tsx).          */
  /* ------------------------------------------------------------------ */
  const menuSec = $('.menu'),
    rail = hb('menu-rail'),
    menuBar = hb('menu-bar'),
    menuHint = hb('menu-hint');
  const catBtns = $$<HTMLButtonElement>('[data-go]', hb('menu-cats'));
  const groups = $$('.menu__category', rail);
  groups.forEach((card, i) => {
    if (card.hidden && catBtns[i]) catBtns[i].hidden = true;
  });
  function setCat(i: number) {
    catBtns.forEach((b, n) => {
      b.classList.toggle('is-on', n === i);
      b.setAttribute('aria-pressed', String(n === i));
    });
  }
  function nativeMenu() {
    if (!rail || !menuBar) return;
    const r = rail,
      bar = menuBar;
    const padL = parseFloat(getComputedStyle(r).paddingLeft) || 0;
    function upd() {
      const max = r.scrollWidth - r.clientWidth;
      bar.style.transform = 'scaleX(' + (max > 0 ? r.scrollLeft / max : 0) + ')';
      let a = 0;
      groups.forEach((g, i) => {
        if (!g.hidden && g.offsetLeft - r.scrollLeft < r.clientWidth * 0.5) a = i;
      });
      setCat(a);
    }
    on(r, 'scroll', upd, { passive: true });
    upd();
    catBtns.forEach((b, i) => {
      on(b, 'click', () =>
        r.scrollTo({ left: groups[i].offsetLeft - padL, behavior: reduce ? 'auto' : 'smooth' }),
      );
    });
  }

  /* People without motion: the row scrolls natively, the arrows step it */
  function nativePeople() {
    const view = hb('people-view'),
      track = hb('people-track'),
      bar = hb('people-bar');
    if (!view || !track || !bar) return;
    const cards = $$('.person', track);
    const step = () => cards[0].offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 20);
    function upd() {
      const max = view!.scrollWidth - view!.clientWidth;
      bar!.style.transform =
        'scaleX(' + (max > 0 ? clamp(0.12 + (0.88 * view!.scrollLeft) / max, 0.12, 1) : 1) + ')';
    }
    on(view, 'scroll', upd, { passive: true });
    upd();
    on(hb('people-next')!, 'click', () => view.scrollBy({ left: step(), behavior: 'auto' }));
    on(hb('people-prev')!, 'click', () => view.scrollBy({ left: -step(), behavior: 'auto' }));
  }

  /* Phone landscape: the top bar shows only at the very top of the page (the hero); once scrolling starts it stays hidden. */
  (function landscapeHeader() {
    const mq = matchMedia('(max-width:991px) and (orientation:landscape) and (max-height:540px)');
    const f = () => root.classList.toggle('hb-nav-off', mq.matches && window.scrollY > 40);
    on(window, 'scroll', f, { passive: true });
    mq.addEventListener('change', f, { signal: ac.signal });
    f();
  })();

  const cleanup = () => {
    dead = true;
    ac.abort();
    timers.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    tickers.forEach((t) => gsap.ticker.remove(t));
    ctx.revert();
    root.classList.remove('hb-loaded', 'hb-nav-off');
  };

  /* ------------------------------------------------------------------ */
  /* No motion: static, fully readable page                              */
  /* ------------------------------------------------------------------ */
  if (!motion) {
    nativeMenu();
    nativePeople();
    nav.classList.add('is-dark', 'nav--static');
    finishLoading();
    return cleanup;
  }

  gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ overwrite: 'auto' });

  run(() => {
    /* ------------------------------------------------------------------ */
    /* HERO — the film is an image sequence drawn to canvas, scrubbed by scroll */
    /* ------------------------------------------------------------------ */
    const N = FILM_FRAMES;
    const hero = $('.hero')!,
      stage = hb('hero-stage')!,
      filmBox = hb('hero-film')!,
      heroAp = hb('hero-aperture')!;
    const stepLoad = wide ? 1 : 3; // phones load every third frame
    const Z0 = wide ? 1.55 : 1.3; // how far the film is pushed in while it sits inside the arch
    const FX = 0.777,
      FY = 0.6; // where the fireplace sits in the frame
    const canvas = document.createElement('canvas'),
      c2d = canvas.getContext('2d')!;
    filmBox.appendChild(canvas);
    const frames: HTMLImageElement[] = new Array(N),
      ready: boolean[] = new Array(N),
      film = { frame: 0, e: 0 };

    function nearest(i: number) {
      for (let d = 0; d < N; d++) {
        if (i - d >= 0 && ready[i - d]) return i - d;
        if (i + d < N && ready[i + d]) return i + d;
      }
      return -1;
    }
    function drawFilm() {
      const i = nearest(Math.round(film.frame));
      if (i < 0) return;
      const im = frames[i],
        cw = canvas.width,
        ch = canvas.height,
        iw = im.naturalWidth,
        ih = im.naturalHeight;
      const e = film.e,
        s = Math.max(cw / iw, ch / ih) * (Z0 + (1 - Z0) * e);
      const w = iw * s,
        h = ih * s;
      // closed: the fire sits in the middle of the arch. open: the frame simply covers the screen.
      const x0 = cw * 0.5 - FX * w,
        y0 = ch * (wide ? 0.56 : 0.5) - FY * h;
      const x1 = clamp(cw * (wide ? 0.5 : 0.62) - (wide ? 0.5 : FX) * w, cw - w, 0),
        y1 = (ch - h) / 2;
      c2d.drawImage(im, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, w, h);
    }
    function sizeCanvas() {
      const r = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(stage.clientWidth * r);
      canvas.height = Math.round(stage.clientHeight * r);
      drawFilm();
    }
    (function loadFrames() {
      const order: number[] = [];
      [16, 8, 4, 2, 1].forEach((m) => {
        for (let i = 0; i < N; i += m) if (i % stepLoad === 0 && order.indexOf(i) < 0) order.push(i);
      });
      const total = order.length,
        need = Math.min(8, total);
      let got = 0,
        next = 0;
      function pump() {
        if (next >= total || dead) return;
        const idx = order[next++],
          im = new Image();
        im.decoding = 'async';
        im.onload = im.onerror = function () {
          if (dead) return;
          if (im.naturalWidth) {
            frames[idx] = im;
            ready[idx] = true;
          }
          got++;
          if (loaderBar) loaderBar.style.transform = 'scaleX(' + Math.min(1, got / need) + ')';
          if (idx === 0 || got === need) drawFilm();
          if (got >= need) finishLoading();
          pump();
        };
        im.src = frameUrl(idx);
      }
      for (let i = 0; i < 6; i++) pump();
    })();
    sizeCanvas();

    const heroTl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: wide ? '+=350%' : '+=260%',
        pin: stage,
        scrub: 0.5,
        anticipatePin: 1,
        onUpdate: (self) => hero.setAttribute('data-nav', self.progress > 0.245 ? 'dark' : 'light'),
      },
    });
    hero.setAttribute('data-nav', 'light');
    const heroAct = hb('hero-act')!;
    heroTl
      .to(film, { frame: N - 1, duration: 1 }, 0)
      .to(film, { e: 1, duration: 0.3, ease: 'power2.inOut' }, 0)
      .to(
        heroAp,
        { '--at': '0%', '--as': '0%', '--ab': '0%', '--ar': '0vw', duration: 0.3, ease: 'power2.inOut' },
        0,
      )
      .to('.hero__line--first', { xPercent: -10, duration: 0.36 }, 0)
      .to('.hero__line--second', { xPercent: 10, duration: 0.36 }, 0)
      .to('.hero__type', { opacity: 0, duration: 0.08 }, 0.29)
      .to(hb('hero-scrim'), { opacity: 1, duration: 0.16 }, 0.24)
      .set(heroAct, { visibility: 'visible' }, 0.37)
      .from(
        $$('.line-mask__inner', heroAct),
        { yPercent: 112, duration: 0.13, stagger: 0.045, ease: 'power2.out' },
        0.38,
      )
      .from($('.hero__actions', heroAct), { opacity: 0, y: 26, duration: 0.08, ease: 'power2.out' }, 0.54)
      .to(hb('hero-progress'), { scaleX: 1, duration: 1 }, 0);
    heroTl.eventCallback('onUpdate', drawFilm);

    /* ------------------------------------------------------------------ */
    /* Sheets: arched top edges flatten as each section arrives            */
    /* ------------------------------------------------------------------ */
    $$('[data-sheet]').forEach((el) => {
      gsap.to(el, {
        '--arc': '0vw',
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 12%', scrub: true },
      });
    });

    /* ------------------------------------------------------------------ */
    /* MANIFESTO — words fill in as you read; the photographs drift        */
    /* ------------------------------------------------------------------ */
    (function manifesto() {
      const p = hb('manifesto-text');
      if (!p) return;
      if (!p.querySelector('.manifesto__word'))
        Array.from(p.childNodes).forEach((node) => {
          if (node.nodeType !== 3) return;
          const frag = document.createDocumentFragment();
          // the gaps beside the inline images come from their margins, so the text itself is trimmed
          (node.textContent || '')
            .trim()
            .split(/(\s+)/)
            .forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(' '));
                return;
              }
              const s = document.createElement('span');
              s.className = 'manifesto__word';
              s.style.display = 'inline-block';
              s.textContent = part;
              frag.appendChild(s);
            });
          p.replaceChild(frag, node);
        });
      const words = $$('.manifesto__word', p),
        chips = $$('.manifesto__chip', p),
        items = $$('.manifesto__word, .manifesto__chip', p);
      gsap.set(words, { opacity: 0.15 });
      gsap.set(chips, { scale: 0, transformOrigin: '50% 100%' });
      gsap
        .timeline({ scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: 0.4 } })
        .to(items, { opacity: 1, scale: 1, stagger: 0.1, duration: 0.4, ease: 'none' });
    })();

    $$('[data-par]').forEach((fig) => {
      const k = parseFloat(fig.getAttribute('data-par') || '0'),
        img = $('img', fig);
      const amp = wide ? 7 : 2.5;
      gsap.fromTo(
        fig,
        { y: k * amp },
        {
          y: -k * amp,
          ease: 'none',
          scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: 0.3 },
        },
      );
      if (img)
        gsap.fromTo(
          img,
          { yPercent: 0 },
          {
            yPercent: -14,
            ease: 'none',
            scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: 0.3 },
          },
        );
    });

    /* ------------------------------------------------------------------ */
    /* ONE DAY — pinned; photo, word and copy change, the sky window turns  */
    /* ------------------------------------------------------------------ */
    (function day() {
      const sec = $('.day');
      if (!sec) return;
      const chaps = $$('.day__chapter', sec),
        total = chaps.length;
      let sky = hb('day-sky');
      const sun = $('.day__sun', sec),
        moon = $('.day__moon', sec),
        stars = $('.day__stars', sec),
        haze = $('.day__haze', sec),
        hill = $('.day__hill', sec);
      const count = hb('day-count'),
        steps = $$('.day__step', sec);
      sec.setAttribute('data-nav', 'light');
      if (!(sky && sun && moon && stars && haze && hill)) sky = null;
      /* Sky colour per chapter, and where the sun and moon sit, as fractions of the window */
      const skyAt = gsap.utils.interpolate([
        '#F3CFA6',
        '#F7E6C4',
        '#F9F0DC',
        '#F2D9A2',
        '#BD6B3D',
        '#1F130D',
      ]);
      const hillAt = gsap.utils.interpolate('#2A1A11', '#120A06');
      type Path = { sun: XY[]; moon: XY[] };
      const TALL: Path = {
        sun: [
          [0.295, 0.843],
          [0.375, 0.59],
          [0.5, 0.28],
          [0.648, 0.562],
          [0.739, 0.837],
          [0.773, 1.2],
        ],
        moon: [
          [0.27, 1.2],
          [0.568, 0.267],
        ],
      };
      const WIDE: Path = {
        sun: [
          [0.12, 1.02],
          [0.3, 0.6],
          [0.5, 0.42],
          [0.7, 0.6],
          [0.88, 1.02],
          [0.94, 1.6],
        ],
        moon: [
          [0.3, 1.6],
          [0.5, 0.45],
        ],
      };
      function along(keys: XY[], t: number): XY {
        const i = clamp(Math.floor(t), 0, keys.length - 2);
        let f = clamp(t - i, 0, 1);
        f = f * f * (3 - 2 * f);
        return [
          keys[i][0] + (keys[i + 1][0] - keys[i][0]) * f,
          keys[i][1] + (keys[i + 1][1] - keys[i][1]) * f,
        ];
      }
      function place(el: HTMLElement, xy: XY) {
        el.style.left = (xy[0] * 100).toFixed(2) + '%';
        el.style.top = (xy[1] * 100).toFixed(2) + '%';
      }
      function paint(t: number, path: Path) {
        // t: 0 at dawn to 5 at night
        if (!sky || !sun || !moon || !stars || !haze || !hill) return;
        const night = clamp(t - 4, 0, 1);
        sky.style.backgroundColor = skyAt(clamp(t / 5, 0, 1));
        hill.style.backgroundColor = hillAt(night);
        place(sun, along(path.sun, t));
        place(moon, along(path.moon, night));
        moon.style.opacity = '1';
        stars.style.opacity = clamp((night - 0.35) / 0.65, 0, 1).toFixed(3);
        haze.style.opacity = (t < 3 ? 1 : t < 4 ? 1 - (t - 3) * 0.5 : 0.5 * (1 - night)).toFixed(3);
      }
      if (!wide) {
        // phones: a plain list, each photo wipes open as it arrives; the sky rides along at the top
        chaps.forEach((c) => {
          gsap.fromTo(
            $('.day__photo', c),
            { clipPath: 'inset(100% 0% 0% 0%)' },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              ease: 'none',
              scrollTrigger: { trigger: c, start: 'top 85%', end: 'top 25%', scrub: 0.4 },
            },
          );
        });
        if (sky) {
          sec.classList.add('day--strip');
          paint(0, WIDE);
          ScrollTrigger.create({
            trigger: $('.day__list', sec),
            start: 'top 62%',
            end: 'bottom 70%',
            onUpdate: (self) => paint(self.progress * 5, WIDE),
          });
        }
        return;
      }
      sec.classList.add('day--pin');
      let current = -1;
      function mark(t: number) {
        const n = clamp(Math.floor(t + 0.45), 0, total - 1);
        if (n === current) return;
        current = n;
        if (count) count.textContent = n + 1 + ' of ' + total;
        steps.forEach((b, i) => {
          b.classList.toggle('is-on', i === n);
          b.setAttribute('aria-pressed', i === n ? 'true' : 'false');
        });
      }
      const tl: gsap.core.Timeline = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: '+=480%',
          pin: hb('day-stage'),
          scrub: 0.5,
          anticipatePin: 1,
        },
        onUpdate: () => {
          const t = tl.time();
          paint(t, TALL);
          mark(t);
        },
      });
      chaps.forEach((c, i) => {
        if (!i) return;
        const prev = chaps[i - 1];
        const word = $('.day__word-inner', c),
          copy = $('.day__copy', c),
          fig = $('.day__photo', c),
          img = $('img', fig);
        gsap.set(word, { yPercent: 112 });
        gsap.set(copy, { opacity: 0, y: 28 });
        gsap.set(fig, { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set(img, { scale: 1.3 });
        const t = i - 0.8;
        tl.to($('.day__word-inner', prev), { yPercent: -112, duration: 0.5 }, t)
          .to($('.day__copy', prev), { opacity: 0, y: -28, duration: 0.3 }, t)
          .to($('img', prev), { scale: 1.12, yPercent: -5, duration: 0.8 }, t)
          .to(fig, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7 }, t)
          .to(img, { scale: 1, duration: 0.9, ease: 'power1.out' }, t)
          .to(word, { yPercent: 0, duration: 0.5 }, t + 0.18)
          .to(copy, { opacity: 1, y: 0, duration: 0.4 }, t + 0.34);
      });
      tl.to({}, { duration: 0.45 });
      paint(0, TALL);
      mark(0);
      steps.forEach((b, i) => {
        on(b, 'click', () => {
          const st = tl.scrollTrigger!,
            p = clamp((i + (i ? 0.12 : 0)) / tl.duration(), 0, 1);
          window.scrollTo({ top: st.start + p * (st.end - st.start) + 2, behavior: 'smooth' });
        });
      });
    })();

    /* ------------------------------------------------------------------ */
    /* RUNNING TEXT — opposite directions, speed follows the scroll        */
    /* ------------------------------------------------------------------ */
    (function marquee() {
      const sec = hb('marquee');
      if (!sec) return;
      let active = false,
        boost = 0,
        lastY = window.scrollY;
      ScrollTrigger.create({
        trigger: sec,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (s) => {
          active = s.isActive;
        },
      });
      const rows = $$('.marquee__row', sec).map((row, i) => {
        const unit = row.children[0] as HTMLElement,
          w = unit.offsetWidth || 1,
          n = Math.ceil((innerWidth * 2) / w) + 1;
        for (let k = 0; k < n; k++) {
          const copy = unit.cloneNode(true) as HTMLElement;
          copy.setAttribute('data-hb-clone', '');
          row.appendChild(copy);
        }
        return { el: row, w, x: i ? -w : 0, dir: i ? 1 : -1, base: i ? 44 : 72 };
      });
      const t: gsap.TickerCallback = (_time, dt) => {
        const y = window.scrollY,
          v = (Math.abs(y - lastY) / Math.max(dt, 1)) * 1000;
        lastY = y;
        boost += (Math.min(v * 0.45, 1100) - boost) * 0.08;
        if (!active) return;
        rows.forEach((r) => {
          r.x += (r.dir * (r.base + boost) * dt) / 1000;
          if (r.x <= -r.w) r.x += r.w;
          if (r.x > 0) r.x -= r.w;
          r.el.style.transform = 'translate3d(' + r.x.toFixed(1) + 'px,0,0)';
        });
      };
      gsap.ticker.add(t);
      tickers.push(t);
    })();

    /* ------------------------------------------------------------------ */
    /* MENU — vertical scroll moves the counter sideways                   */
    /* ------------------------------------------------------------------ */
    (function menu() {
      if (!rail || !menuSec || !menuBar) return;
      if (!wide) {
        nativeMenu();
        return;
      }
      menuSec.classList.add('menu--pin');
      if (menuHint) menuHint.textContent = 'Keep scrolling, the counter moves sideways';
      const travel = () => Math.max(0, rail.scrollWidth - window.innerWidth);
      const tween = gsap.to(rail, {
        x: () => -travel(),
        ease: 'none',
        scrollTrigger: {
          trigger: menuSec,
          start: 'top top',
          end: () => '+=' + travel() * 0.8,
          pin: hb('menu-stage'),
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            menuBar.style.transform = 'scaleX(' + self.progress + ')';
            const x = travel() * self.progress;
            let a = 0;
            groups.forEach((g, i) => {
              if (!g.hidden && g.offsetLeft - x < window.innerWidth * 0.45) a = i;
            });
            setCat(a);
          },
        },
      });
      setCat(0);
      $$('.menu__item-image', rail).forEach((img) => {
        gsap.fromTo(
          img,
          { xPercent: -5 },
          {
            xPercent: 5,
            ease: 'none',
            scrollTrigger: {
              trigger: img.parentNode as Element,
              containerAnimation: tween,
              start: 'left right',
              end: 'right left',
              scrub: true,
            },
          },
        );
      });
      catBtns.forEach((b, i) => {
        on(b, 'click', () => {
          const st = tween.scrollTrigger!,
            padL = parseFloat(getComputedStyle(rail).paddingLeft) || 0;
          const p = travel() ? clamp((groups[i].offsetLeft - padL) / travel(), 0, 1) : 0;
          window.scrollTo({ top: st.start + p * (st.end - st.start) + 2, behavior: 'smooth' });
        });
      });
    })();

    /* ------------------------------------------------------------------ */
    /* THE PAN — opens like a lid as it arrives                            */
    /* ------------------------------------------------------------------ */
    gsap.fromTo(
      hb('pan-disc'),
      { clipPath: 'circle(6% at 50% 50%)', rotate: -16 },
      {
        clipPath: 'circle(50% at 50% 50%)',
        rotate: 0,
        ease: 'none',
        scrollTrigger: { trigger: '.pan', start: 'top 80%', end: 'top 12%', scrub: 0.4 },
      },
    );
    gsap.fromTo(
      '.pan__item',
      { opacity: 0, x: 40 },
      {
        opacity: 1,
        x: 0,
        stagger: 0.08,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.pan__list', start: 'top 82%' },
      },
    );

    /* ------------------------------------------------------------------ */
    /* NUMBERS — count once, drift with the scroll                         */
    /* ------------------------------------------------------------------ */
    $$('.numbers__row').forEach((row, i) => {
      const b = $('.numbers__figure', row)!,
        n = +(b.getAttribute('data-n') || 0),
        from = +(b.getAttribute('data-from') || 0),
        o = { v: from };
      if (row.getBoundingClientRect().top > innerHeight) {
        b.textContent = String(from);
        ScrollTrigger.create({
          trigger: row,
          start: 'top 82%',
          once: true,
          onEnter: () => {
            gsap.to(o, {
              v: n,
              duration: 1.9,
              ease: 'power3.out',
              onUpdate: () => {
                b.textContent = String(Math.round(o.v));
              },
            });
          },
        });
      }
      if (wide)
        gsap.fromTo(
          b,
          { xPercent: i % 2 ? -7 : 7 },
          {
            xPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: row, start: 'top bottom', end: 'top 35%', scrub: 0.4 },
          },
        );
    });

    /* ------------------------------------------------------------------ */
    /* PEOPLE — drag with inertia, cards lean into the throw               */
    /* ------------------------------------------------------------------ */
    (function people() {
      const sec = $('.people'),
        view = hb('people-view'),
        track = hb('people-track'),
        bar = hb('people-bar');
      if (!sec || !view || !track || !bar) return;
      sec.classList.add('people--drag');
      const cards = $$('.person', track);
      let lastX = 0,
        settle = 0;
      function minX() {
        const cs = getComputedStyle(view!),
          inner = view!.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return Math.min(0, inner - track!.scrollWidth);
      }
      function upd() {
        const x = gsap.getProperty(track!, 'x') as number,
          m = minX();
        bar!.style.transform = 'scaleX(' + (m ? clamp(0.12 + 0.88 * (x / m), 0.12, 1) : 1) + ')';
        const dx = x - lastX;
        lastX = x;
        gsap.to(cards, { skewX: clamp(-dx * 0.3, -5, 5), duration: 0.35, ease: 'power2.out' });
        clearTimeout(settle);
        settle = window.setTimeout(() => {
          if (!dead) gsap.to(cards, { skewX: 0, duration: 0.7, ease: 'power3.out' });
        }, 90);
        timers.push(settle);
      }
      const drag = Draggable.create(track, {
        type: 'x',
        inertia: true,
        edgeResistance: 0.82,
        bounds: { minX: minX(), maxX: 0 },
        onDrag: upd,
        onThrowUpdate: upd,
      })[0];
      function go(dir: number) {
        const step = cards[0].offsetWidth + (parseFloat(getComputedStyle(track!).columnGap) || 20);
        gsap.to(track, {
          x: clamp((gsap.getProperty(track!, 'x') as number) - dir * step, minX(), 0),
          duration: 0.9,
          ease: 'power3.out',
          onUpdate: upd,
        });
      }
      on(hb('people-next')!, 'click', () => go(1));
      on(hb('people-prev')!, 'click', () => go(-1));
      on(window, 'resize', () => {
        drag.applyBounds({ minX: minX(), maxX: 0 });
        upd();
      });
      upd();
      gsap.fromTo(
        view,
        { x: '16vw' },
        {
          x: 0,
          ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 25%', scrub: 0.4 },
        },
      );
    })();

    /* ------------------------------------------------------------------ */
    /* RESERVE — the sentence sets itself line by line                     */
    /* ------------------------------------------------------------------ */
    gsap.fromTo(
      '.reserve__line',
      { opacity: 0, yPercent: 40 },
      {
        opacity: 1,
        yPercent: 0,
        stagger: 0.12,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: hb('reserve-sentence'), start: 'top 80%' },
      },
    );

    /* ------------------------------------------------------------------ */
    /* FOOTER — uncovered from underneath; the last arch grows             */
    /* ------------------------------------------------------------------ */
    const footer = hb('footer')!;
    gsap.fromTo(
      hb('footer-inner'),
      { yPercent: -30 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: true },
      },
    );
    gsap.fromTo(
      hb('footer-arch'),
      { scale: 0.45 },
      {
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: footer, start: 'top 85%', end: 'bottom bottom', scrub: 0.4 },
      },
    );
    gsap.fromTo(
      hb('footer-image'),
      { scale: 1.6 },
      {
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: footer, start: 'top 85%', end: 'bottom bottom', scrub: 0.4 },
      },
    );
    gsap.fromTo(
      $$('.line-mask__inner', hb('footer-statement')),
      { yPercent: 112 },
      {
        yPercent: 0,
        duration: 1.3,
        ease: 'power4.out',
        scrollTrigger: { trigger: footer, start: 'top 40%' },
      },
    );
    (function magnet() {
      const el = hb('footer-cta');
      if (!el || !fine) return;
      const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }),
        qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      on(footer, 'pointermove', (e: PointerEvent) => {
        const r = el.getBoundingClientRect(),
          dx = e.clientX - (r.left + r.width / 2),
          dy = e.clientY - (r.top + r.height / 2);
        const near = Math.hypot(dx, dy) < 190;
        qx(near ? dx * 0.32 : 0);
        qy(near ? dy * 0.32 : 0);
      });
      on(footer, 'pointerleave', () => {
        qx(0);
        qy(0);
      });
    })();

    /* ------------------------------------------------------------------ */
    /* Cursor label over draggable areas                                   */
    /* ------------------------------------------------------------------ */
    (function cursor() {
      const cur = hb('cursor');
      if (!cur || !fine) return;
      const qx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }),
        qy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
      let moved = false;
      on(
        window,
        'pointermove',
        (e: PointerEvent) => {
          moved = true;
          qx(e.clientX);
          qy(e.clientY);
        },
        { passive: true },
      );
      $$('[data-cursor]').forEach((zone) => {
        on(zone, 'pointerenter', () => {
          if (!moved) return;
          hb('cursor-label')!.textContent = zone.getAttribute('data-cursor');
          gsap.to(cur, { scale: 1, opacity: 1, duration: 0.4, ease: 'power3.out' });
        });
        on(zone, 'pointerleave', () =>
          gsap.to(cur, { scale: 0.2, opacity: 0, duration: 0.3, ease: 'power2.in' }),
        );
        on(zone, 'pointerdown', () => gsap.to(cur, { scale: 0.72, duration: 0.25 }));
        on(zone, 'pointerup', () => gsap.to(cur, { scale: 1, duration: 0.35 }));
      });
    })();

    /* ------------------------------------------------------------------ */
    /* Navigation: colour follows the section underneath; hides on the way down */
    /* ------------------------------------------------------------------ */
    const heroSt = heroTl.scrollTrigger!;
    function navTheme() {
      const els = document.elementsFromPoint(window.innerWidth / 2, 34);
      let sec: Element | null = null;
      for (let i = 0; i < els.length; i++) {
        if (nav.contains(els[i])) continue;
        sec = els[i].closest('[data-nav]');
        if (sec) break;
      }
      if (sec) nav.classList.toggle('is-dark', sec.getAttribute('data-nav') === 'dark');
    }
    let navLast = window.scrollY,
      navFrom = navLast,
      navDir = 0;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        navTheme();
        const y = self.scroll(),
          d = y > navLast ? 1 : y < navLast ? -1 : 0;
        if (d && d !== navDir) {
          navDir = d;
          navFrom = navLast;
        }
        navLast = y;
        if (Math.abs(y - navFrom) < 24) return; // a nudge of a few pixels is not the visitor scrolling
        nav.classList.toggle(
          'is-hidden',
          navDir === 1 && !heroSt.isActive && y > heroSt.end - window.innerHeight * 0.4,
        );
      },
    });
    navTheme();

    /* ------------------------------------------------------------------ */
    /* Housekeeping                                                        */
    /* ------------------------------------------------------------------ */
    let rz = 0;
    on(window, 'resize', () => {
      clearTimeout(rz);
      rz = window.setTimeout(() => {
        if (wideMq.matches !== wide) {
          location.reload();
          return;
        }
        sizeCanvas();
      }, 180);
      timers.push(rz);
    });
  });

  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => {
      if (dead) return;
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });
  if (document.readyState === 'complete')
    timers.push(window.setTimeout(() => !dead && ScrollTrigger.refresh(), 0));
  else on(window, 'load', () => ScrollTrigger.refresh());

  return () => {
    // undo the DOM the script built, so a remount (React development mode) starts clean
    $$('[data-hb-clone]').forEach((n) => n.remove());
    $$('canvas', hb('hero-film')).forEach((n) => n.remove());
    cleanup();
  };
}
