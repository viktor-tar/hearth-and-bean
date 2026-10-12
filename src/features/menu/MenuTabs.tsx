'use client';

import { useEffect } from 'react';

/**
 * /menu: highlights the tab of the section in view, and handles in-page links itself with a short
 * ease-out (instant with reduced motion). Do not add `scroll-behavior: smooth` to this page.
 * Renders nothing.
 */
export default function MenuTabs() {
  useEffect(() => {
    const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>('.fullmenu__tab'));
    const bar = document.querySelector<HTMLElement>('.fullmenu__tabs-inner');
    if (!tabs.length) return;
    const sections = tabs.map((t) =>
      document.getElementById((t.getAttribute('href') || '').split('#')[1] || ''),
    );
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ac = new AbortController();
    const opts = { signal: ac.signal };
    let current = -2,
      lock = false,
      frame = 0;

    function set(i: number) {
      if (i === current) return;
      current = i;
      tabs.forEach((t, n) => {
        t.classList.toggle('is-on', n === i);
        if (n === i) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
      const t = tabs[i];
      if (t && bar && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = t.offsetLeft - 18;
    }
    function pick() {
      if (lock) return;
      const line = window.innerHeight * 0.35;
      let a = -1;
      sections.forEach((s, i) => {
        if (s && s.getBoundingClientRect().top <= line) a = i;
      });
      set(a);
    }
    function stop() {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      lock = false;
    }
    function go(el: HTMLElement, done: () => void) {
      stop();
      const doc = document.documentElement;
      const from = window.pageYOffset;
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      let to = Math.round(el.getBoundingClientRect().top + from - margin);
      to = Math.max(0, Math.min(to, doc.scrollHeight - window.innerHeight));
      const dist = to - from;
      if (!dist || reduce.matches) {
        window.scrollTo(0, to);
        return done();
      }
      const time = Math.min(480, 240 + Math.abs(dist) * 0.06);
      let start = 0;
      lock = true;
      function step(now: number) {
        if (!start) start = now;
        const p = Math.min(1, (now - start + 16) / time);
        window.scrollTo(0, from + dist * (1 - Math.pow(1 - p, 3)));
        if (p < 1) frame = requestAnimationFrame(step);
        else {
          frame = 0;
          lock = false;
          done();
        }
      }
      frame = requestAnimationFrame(step);
    }

    document.addEventListener(
      'click',
      (e) => {
        if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = (e.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
        if (!a || a.hash.length < 2 || a.host + a.pathname !== location.host + location.pathname) return;
        let el: HTMLElement | null = null;
        try {
          el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
        } catch {
          /* not a valid id */
        }
        if (!el) return;
        const target = el;
        e.preventDefault();
        e.stopPropagation();
        const i = tabs.indexOf(a);
        try {
          history.replaceState(null, '', a.hash);
        } catch {
          /* ignore */
        }
        go(target, () => {
          pick();
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          try {
            target.focus({ preventScroll: true });
          } catch {
            /* ignore */
          }
        });
        if (i > -1) set(i);
      },
      { capture: true, signal: ac.signal },
    );

    (['wheel', 'touchstart', 'keydown'] as const).forEach((type) => {
      window.addEventListener(
        type,
        () => {
          if (frame) {
            stop();
            pick();
          }
        },
        { passive: true, signal: ac.signal },
      );
    });
    window.addEventListener('scroll', pick, { passive: true, signal: ac.signal });
    window.addEventListener('resize', pick, opts);
    pick();
    return () => {
      stop();
      ac.abort();
    };
  }, []);
  return null;
}
