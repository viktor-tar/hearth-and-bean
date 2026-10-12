'use client';

/*
 * The booking form's pop-ups: dropdown menus (guests, seating) and the calendar (date).
 * Drawn in the site's own colours because the browser's own lists cannot be styled.
 * One is open at a time; Escape, a click elsewhere or moving focus away closes it.
 */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addDays, longDate, MONTHS, pad, weekday } from '@/lib/dates';

/* ---------------- one pop-up open at a time ---------------- */

interface PopupApi {
  openId: string | null;
  open: (id: string) => void;
  close: (refocus?: boolean) => void;
  register: (id: string, btn: HTMLButtonElement | null, pop: HTMLElement | null) => void;
}
const PopupContext = createContext<PopupApi | null>(null);
const usePopups = () => useContext(PopupContext)!;

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openRef = useRef<string | null>(null);
  const parts = useRef(new Map<string, { btn: HTMLButtonElement | null; pop: HTMLElement | null }>());

  const close = useCallback((refocus?: boolean) => {
    const id = openRef.current;
    if (!id) return;
    openRef.current = null;
    setOpenId(null);
    if (refocus) parts.current.get(id)?.btn?.focus({ preventScroll: true });
  }, []);
  const open = useCallback((id: string) => {
    openRef.current = id;
    setOpenId(id);
  }, []);
  const register = useCallback((id: string, btn: HTMLButtonElement | null, pop: HTMLElement | null) => {
    parts.current.set(id, { btn, pop });
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    document.addEventListener(
      'pointerdown',
      (e) => {
        const id = openRef.current;
        if (!id) return;
        const p = parts.current.get(id);
        const t = e.target as Node;
        if (p && !p.pop?.contains(t) && !p.btn?.contains(t)) close();
      },
      { signal: ac.signal },
    );
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && openRef.current) {
          e.stopPropagation();
          close(true);
        }
      },
      { signal: ac.signal },
    );
    return () => ac.abort();
  }, [close]);

  return <PopupContext.Provider value={{ openId, open, close, register }}>{children}</PopupContext.Provider>;
}

/** Keeps a pop-up on the screen when its field sits at the right edge (style set here, not by React). */
function placeAtEdge(el: HTMLElement) {
  el.style.left = '';
  el.style.right = '';
  if (el.getBoundingClientRect().right > document.documentElement.clientWidth - 8) {
    el.style.left = 'auto';
    el.style.right = '0';
  }
}

/** Closes the pop-up when focus moves somewhere outside both the pop-up and its button. */
function leaving(e: React.FocusEvent, btn: HTMLElement | null, pop: HTMLElement | null, close: () => void) {
  const to = e.relatedTarget as Node | null;
  if (to && to !== btn && !pop?.contains(to)) close();
}

/** The button that shows the current choice and opens its pop-up. */
function Opener({
  id,
  label,
  kind,
  text,
  set,
  expanded,
  btnRef,
  onClick,
  onKeyDown,
}: {
  id: string;
  label: string;
  kind: 'listbox' | 'dialog';
  text: string;
  set: boolean;
  expanded: boolean;
  btnRef: React.RefObject<HTMLButtonElement | null>;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <button
      ref={btnRef}
      className={'reserve__select' + (set ? ' is-set' : '')}
      type="button"
      id={id}
      aria-haspopup={kind}
      aria-expanded={expanded ? 'true' : 'false'}
      aria-controls={id + '-pop'}
      aria-label={label + ': ' + text}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <span className="reserve__select-text">{text}</span>
    </button>
  );
}

/* ---------------- dropdown menu ---------------- */

export interface Option<V> {
  value: V;
  text: string;
}

export function Dropdown<V extends string | number>(props: {
  id: string;
  label: string;
  items: Option<V>[];
  value: V;
  /** false: shown in the quieter "nothing chosen" style */
  set?: boolean;
  onPick: (v: V) => void;
  btnRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const { id, label, items, value, onPick } = props;
  const P = usePopups();
  const ownBtn = useRef<HTMLButtonElement>(null);
  const btn = props.btnRef || ownBtn;
  const list = useRef<HTMLDivElement>(null);
  const isOpen = P.openId === id;
  const [at, setAt] = useState(0);
  const index = items.findIndex((it) => it.value === value);

  useEffect(() => P.register(id, btn.current, list.current));
  useLayoutEffect(() => {
    if (!isOpen || !list.current) return;
    placeAtEdge(list.current);
    list.current.focus({ preventScroll: true });
  }, [isOpen]);

  const mark = (i: number) => setAt(Math.max(0, Math.min(items.length - 1, i)));
  const open = () => {
    mark(Math.max(0, index));
    P.open(id);
  };
  const pick = (i: number) => {
    P.close(true);
    if (items[i].value !== value) onPick(items[i].value);
  };

  return (
    <>
      <Opener
        id={id}
        label={label}
        kind="listbox"
        text={index < 0 ? '' : items[index].text}
        set={props.set !== false}
        expanded={isOpen}
        btnRef={btn}
        onClick={() => (isOpen ? P.close() : open())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            open();
          }
        }}
      />
      <div
        ref={list}
        className="reserve__menu"
        id={id + '-pop'}
        hidden={!isOpen}
        tabIndex={-1}
        role="listbox"
        aria-label={label}
        aria-activedescendant={isOpen && items[at] ? `${id}-option-${at}` : undefined}
        onKeyDown={(e) => {
          const k = e.key;
          if (k === 'ArrowDown') mark(at + 1);
          else if (k === 'ArrowUp') mark(at - 1);
          else if (k === 'Home') mark(0);
          else if (k === 'End') mark(items.length - 1);
          else if (k === 'Enter' || k === ' ') pick(at);
          else if (k === 'Tab') {
            P.close(true); // focus goes back to the button, then Tab carries on from there
            return;
          } else {
            // a letter or digit jumps to the first option that starts with it
            if (k.length === 1) {
              const i = items.findIndex((it) => it.text.charAt(0).toLowerCase() === k.toLowerCase());
              if (i >= 0) mark(i);
            }
            return;
          }
          e.preventDefault();
        }}
        onBlur={(e) => leaving(e, btn.current, list.current, () => P.close())}
      >
        {items.map((it, i) => (
          <div
            key={String(it.value)}
            className={'reserve__option' + (isOpen && i === at ? ' is-at' : '')}
            id={`${id}-option-${i}`}
            role="option"
            aria-selected={i === index ? 'true' : 'false'}
            onClick={() => pick(i)}
            onPointerEnter={() => mark(i)}
          >
            {it.text}
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- calendar ---------------- */

const Arrow = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

/** One month at a time, Monday first; only today to the last bookable day can be chosen. */
export function Calendar(props: {
  id: string;
  label: string;
  value: string;
  text: string;
  today: string;
  lastDay: string;
  onPick: (date: string) => void;
}) {
  const { id, label, value, today, lastDay, onPick } = props;
  const P = usePopups();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const isOpen = P.openId === id;
  const [view, setView] = useState(value.slice(0, 7)); // the month on show, YYYY-MM
  const [tabDate, setTabDate] = useState(value); // the day the keyboard lands on
  const [focusNext, setFocusNext] = useState(0);

  useEffect(() => P.register(id, btn.current, pop.current));
  useLayoutEffect(() => {
    if (isOpen && pop.current) placeAtEdge(pop.current);
  }, [isOpen]);
  useLayoutEffect(() => {
    if (!focusNext || !isOpen) return;
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${tabDate}"]`)
      ?.focus({ preventScroll: true });
  }, [focusNext, isOpen, tabDate]);

  const clamp = (date: string) => (date < today ? today : date > lastDay ? lastDay : date);
  const month = (n: number) => {
    const d = new Date(Date.UTC(+view.slice(0, 4), +view.slice(5, 7) - 1 + n, 1));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1);
  };
  /** Show the month this date is in; the date becomes the one the keyboard lands on. */
  const go = (date: string, focus: boolean) => {
    const d = clamp(date);
    setView(d.slice(0, 7));
    setTabDate(d);
    if (focus) setFocusNext((n) => n + 1);
  };
  const turn = (n: number) => {
    const to = month(n);
    if (to < today.slice(0, 7) || to > lastDay.slice(0, 7)) return;
    go(to === value.slice(0, 7) ? value : to + '-01', false);
  };
  const show = () => {
    P.open(id);
    go(value, true);
  };

  const y = +view.slice(0, 4),
    m = +view.slice(5, 7);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate(),
    gap = (weekday(view + '-01') + 6) % 7;
  const days: string[] = [];
  for (let d = 1; d <= count; d++) days.push(view + '-' + pad(d));

  return (
    <>
      <Opener
        id={id}
        label={label}
        kind="dialog"
        text={props.text}
        set
        expanded={isOpen}
        btnRef={btn}
        onClick={() => (isOpen ? P.close() : show())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            show();
          }
        }}
      />
      <div
        ref={pop}
        className="reserve__cal"
        id={id + '-pop'}
        hidden={!isOpen}
        role="dialog"
        aria-label="Choose a date"
        onBlur={(e) => leaving(e, btn.current, pop.current, () => P.close())}
      >
        <div className="reserve__cal-head">
          <button
            className="reserve__cal-nav"
            type="button"
            aria-label="Previous month"
            aria-disabled={view <= today.slice(0, 7) ? 'true' : 'false'}
            onClick={() => turn(-1)}
          >
            <Arrow />
          </button>
          <div className="reserve__cal-month" aria-live="polite">
            {MONTHS[m - 1] + ' ' + y}
          </div>
          <button
            className="reserve__cal-nav reserve__cal-nav--next"
            type="button"
            aria-label="Next month"
            aria-disabled={view >= lastDay.slice(0, 7) ? 'true' : 'false'}
            onClick={() => turn(1)}
          >
            <Arrow />
          </button>
        </div>
        <div className="reserve__cal-week" aria-hidden="true">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div
          ref={grid}
          className="reserve__cal-grid"
          onKeyDown={(e) => {
            const date = (e.target as HTMLElement).getAttribute?.('data-date');
            if (!date) return;
            const steps: Record<string, number> = {
              ArrowLeft: -1,
              ArrowRight: 1,
              ArrowUp: -7,
              ArrowDown: 7,
              PageUp: -28,
              PageDown: 28,
            };
            let step: number | undefined = steps[e.key];
            const col = (weekday(date) + 6) % 7;
            if (e.key === 'Home') step = -col;
            else if (e.key === 'End') step = 6 - col;
            if (step == null) return;
            e.preventDefault();
            go(addDays(date, step), true);
          }}
        >
          {Array.from({ length: gap }, (_, i) => (
            <span key={'gap' + i} />
          ))}
          {days.map((date) => (
            <button
              key={date}
              className={'reserve__cal-day' + (date === today ? ' is-today' : '')}
              type="button"
              data-date={date}
              aria-label={longDate(date) + (date === today ? ', today' : '')}
              aria-pressed={date === value ? 'true' : 'false'}
              disabled={date < today || date > lastDay}
              tabIndex={date === tabDate ? 0 : -1}
              onClick={() => {
                P.close(true);
                if (date !== value) onPick(date);
              }}
            >
              {String(+date.slice(8))}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
