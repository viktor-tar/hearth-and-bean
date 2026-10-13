'use client';

/*
 * Hearth & Bean: staff page.
 * Signs staff in against the booking sheet and shows one day at a time: requests waiting for an answer,
 * the day's bookings, the selected booking and the table plan. Staff can approve, decline, seat, move and edit
 * bookings, and add phone bookings and walk-ins. The password is checked by the sheet, which answers with a
 * signed token that runs out after 12 hours; the token is kept for this browser tab only (sessionStorage).
 * The Menu view (MenuEditor.tsx) uses the same sign-in to edit the dishes and photos and publish the menu.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  BOOKING_API,
  bookingResultSchema,
  callApi,
  daySchema,
  loginSchema,
  type Booking,
  type Day,
  type Table,
} from '@/lib/booking-api';
import { addDays, fromMin, longDate, shortDate, toMin } from '@/lib/dates';
import { z } from 'zod';
import MenuEditor, { ViewSwitch, type View } from './MenuEditor';

const STATUS: Record<string, string> = {
  pending: 'Waiting',
  confirmed: 'Confirmed',
  seated: 'Seated',
  finished: 'Finished',
  noshow: 'No-show',
  declined: 'Declined',
  cancelled: 'Cancelled',
};
const HOLDS: Record<string, boolean> = { pending: true, confirmed: true, seated: true };
/* what staff can do from each status: [new status, button text, style, question to ask first] */
const MOVES: Record<string, [string, string, string, string?][]> = {
  pending: [
    ['confirmed', 'Approve', 'primary'],
    ['declined', 'Decline', 'danger', 'Decline this request? The guest is emailed.'],
  ],
  confirmed: [
    ['seated', 'Seat', 'primary'],
    ['noshow', 'No-show', '', 'Mark as a no-show? The table is released.'],
    ['cancelled', 'Cancel', 'danger', 'Cancel this booking? The guest is emailed.'],
  ],
  seated: [
    ['finished', 'Finish', 'primary'],
    ['confirmed', 'Not seated yet', ''],
  ],
  finished: [['seated', 'Undo finish', '']],
  noshow: [['confirmed', 'They arrived', '']],
  declined: [['pending', 'Reopen', '']],
  cancelled: [['pending', 'Reopen', '']],
};
const FILTERS: [string, string][] = [
  ['all', 'All'],
  ['pending', 'Waiting'],
  ['confirmed', 'Confirmed'],
  ['seated', 'Seated'],
  ['finished', 'Finished'],
  ['other', 'Other'],
];
const OFFLINE = 'Could not reach the booking sheet. Check the connection and try again.';
const party = (n: number) => n + (n === 1 ? ' guest' : ' guests');
function stamp(t: string) {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/.exec(t || '');
  return m ? shortDate(m[1]) + ', ' + m[2] : t || '';
}

/* ---------------- the signed-in session, kept for this tab only ---------------- */
const sessionSchema = z.object({ token: z.string(), name: z.string(), expires: z.number() });
type Session = z.infer<typeof sessionSchema>;
const KEY = 'hb_staff';
const VIEW_KEY = 'hb_staff_view';
function stored(): Session | null {
  try {
    const s = sessionSchema.safeParse(JSON.parse(sessionStorage.getItem(KEY) || 'null'));
    return s.success && s.data.expires > Date.now() ? s.data : null;
  } catch {
    return null;
  }
}
function store(v: Session | null) {
  try {
    if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode: stay signed in for this page only */
  }
}

function Btn(props: {
  text: string;
  cls?: string;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
  data?: Record<string, string>;
}) {
  return (
    <button
      type="button"
      className={'staff__btn' + (props.cls ? ' ' + props.cls : '')}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.label}
      {...props.data}
    >
      {props.text}
    </button>
  );
}

export default function StaffPortal() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loginMessage, setLoginMessage] = useState('');
  const [view, setViewState] = useState<View>('bookings');
  const setView = useCallback((v: View) => {
    setViewState(v);
    try {
      sessionStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the session lives in sessionStorage, read after hydration
    setSession(stored());
    try {
      if (sessionStorage.getItem(VIEW_KEY) === 'menu') setViewState('menu');
    } catch {
      /* no storage: start on the bookings */
    }
    setReady(true);
  }, []);

  const signOut = useCallback((message: string) => {
    store(null);
    setSession(null);
    setLoginMessage(message || '');
  }, []);

  if (!ready) return <p className="staff__fallback">This page needs JavaScript to open the bookings.</p>;
  if (!session)
    return (
      <Login
        message={loginMessage}
        onSignedIn={(s) => {
          store(s);
          setSession(s);
        }}
      />
    );
  if (view === 'menu')
    return (
      <MenuEditor key={session.token} session={session} signOut={signOut} view={view} setView={setView} />
    );
  return <Book key={session.token} session={session} signOut={signOut} view={view} setView={setView} />;
}

/* ---------------- sign in ---------------- */
function Login({ message, onSignedIn }: { message: string; onSignedIn: (s: Session) => void }) {
  const user = useRef<HTMLInputElement>(null);
  const pass = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState(message);
  const [busy, setBusy] = useState(false);
  useEffect(() => user.current?.focus(), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!BOOKING_API) {
      setErr('The booking sheet is not connected to this page yet.');
      return;
    }
    const u = user.current!.value.trim(),
      p = pass.current!.value;
    if (!u || !p) {
      setErr('Enter your username and password.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const r = await callApi({ action: 'login', username: u, password: p }, loginSchema, {
        offline: OFFLINE,
        timeoutMs: 30000,
      });
      onSignedIn({ token: r.token, name: r.name, expires: r.expires });
    } catch (e2) {
      setBusy(false);
      setErr((e2 as Error).message);
      pass.current!.value = '';
      pass.current!.focus();
    }
  }

  return (
    <div className="staff__login">
      <div className="staff__login-card">
        <div className="staff__login-brand">Hearth &amp; Bean</div>
        <h1 className="staff__serif staff__login-title">Staff sign in</h1>
        <form className="staff__login-form" noValidate onSubmit={submit}>
          <label className="staff__field" htmlFor="staff-user">
            Username
            <input
              ref={user}
              className="staff__input"
              id="staff-user"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              required
            />
          </label>
          <label className="staff__field" htmlFor="staff-pass">
            Password
            <input
              ref={pass}
              className="staff__input"
              id="staff-pass"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <p className="staff__error" role="alert">
            {err}
          </p>
          <button type="submit" className="staff__btn staff__btn--primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <a className="staff__login-back" href="/">
          Back to the website
        </a>
      </div>
    </div>
  );
}

/* ---------------- the plan: the hours shown and where the slider starts ---------------- */
function range(d: Day) {
  const hrs = d.hours;
  let lo = hrs.closed ? 600 : toMin(hrs.first!),
    hi = (hrs.closed ? 1260 : toMin(hrs.last!)) + 120;
  d.bookings.forEach((b) => {
    const m = toMin(b.time);
    if (m < lo) lo = m;
    if (m + b.duration > hi) hi = m + b.duration;
  });
  return { lo: Math.floor(lo / 15) * 15, hi: Math.min(1425, Math.ceil(hi / 15) * 15) };
}
function defaultPlanMin(d: Day) {
  const r = range(d),
    now = Math.floor(d.nowMin / 15) * 15;
  if (d.date === d.today && now >= r.lo && now <= r.hi) return now;
  const first = d.bookings.filter((b) => HOLDS[b.status])[0];
  return first ? toMin(first.time) : Math.max(r.lo, Math.min(r.hi, 1140));
}

/* ---------------- the book ---------------- */
interface FormOpen {
  booking: Booking | null;
  kind: 'phone' | 'walk-in';
  preset?: { table?: string; time?: string };
}

function Book({
  session,
  signOut,
  view,
  setView,
}: {
  session: Session;
  signOut: (m: string) => void;
  view: View;
  setView: (v: View) => void;
}) {
  const qc = useQueryClient();
  const root = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState('');
  const [sel, setSel] = useState('');
  const [filter, setFilter] = useState('all');
  const [planMin, setPlanMin] = useState(1140);
  const [planAuto, setPlanAuto] = useState(true);
  const [busy, setBusy] = useState(false); // an action is on its way to the sheet
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ask, setAsk] = useState<{ id: string; to: string; label: string; text: string } | null>(null);
  const [form, setForm] = useState<FormOpen | null>(null);
  const [cardWanted, setCardWanted] = useState(0);
  const [planTo, setPlanTo] = useState<number | null>(null); // plan time to show once the next answer is in

  const call = useCallback(
    <T,>(action: string, body: Record<string, unknown>, schema: z.ZodType<T>) =>
      callApi({ ...body, action, token: session.token }, schema, { offline: OFFLINE, timeoutMs: 30000 }),
    [session.token],
  );

  const loud = useRef(true); // the next answer was asked for by the person, not by the 30-second refresh
  const q = useQuery({
    queryKey: ['staff-day', session.token, date],
    queryFn: () => call('day', { date }, daySchema),
    placeholderData: keepPreviousData,
    // keep the page current while it is open in front of someone, without redrawing under an open window
    refetchInterval: form || ask || busy ? false : 30000,
    refetchIntervalInBackground: false,
  });
  const D: Day | undefined = q.data;
  const loading = busy || (q.isFetching && (q.isPlaceholderData || !D));

  /* each answer: the day it is for, the time it was fetched, and a sensible plan time */
  useEffect(() => {
    if (!D || q.isPlaceholderData) return;
    /* eslint-disable react-hooks/set-state-in-effect -- these follow the sheet's answer */
    if (D.date !== date) {
      // the first answer says which day "today" is: keep it under that day's key so it is not asked for twice
      qc.setQueryData(['staff-day', session.token, D.date], D);
      setDate(D.date);
    }
    loud.current = false;
    setError('');
    if (sel && !D.bookings.concat(D.requests).some((b) => b.id === sel)) setSel('');
    if (planTo != null) {
      setPlanMin(planTo);
      setPlanTo(null);
      setPlanAuto(false);
    } else if (planAuto) {
      setPlanMin(defaultPlanMin(D));
      setPlanAuto(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [q.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!q.isError) return;
    const e = q.error as ApiError;
    if (e.code === 'auth') signOut(e.message);
    // a failed background refresh stays quiet; one the person asked for shows its reason
    else if (loud.current) setError(e.message);
  }, [q.errorUpdatedAt, q.isError, q.error, signOut]);

  /* on a narrow screen the details sit below the lists: bring them into view */
  useEffect(() => {
    if (!cardWanted) return;
    const c = root.current?.querySelector('[data-card]');
    if (c && window.innerWidth <= 1000) c.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [cardWanted]);

  /* when an action removes the focused button, put the keyboard on the selected booking's first action */
  /* The page keeps the keyboard where it was across updates, as the original did: on the same booking row or
     action if it is still there, otherwise on the selected booking's first action, otherwise on its row. */
  const lastFocus = useRef('');
  useLayoutEffect(() => {
    const r = root.current;
    if (!r || form) return;
    const a = document.activeElement as HTMLElement | null;
    const inside = !!a && r.contains(a);
    const stranded = inside && (a as HTMLButtonElement).disabled; // switched off while the sheet works
    if (inside && !stranded) {
      const k = ['data-id', 'data-move', 'data-table', 'data-yes'].find((x) => a!.hasAttribute(x));
      lastFocus.current = k ? `[${k}="${a!.getAttribute(k)}"]` : '';
      return;
    }
    if (!lastFocus.current || (!stranded && a && a !== document.body)) return;
    const t =
      (stranded ? null : r.querySelector<HTMLElement>(lastFocus.current + ':not([disabled])')) ||
      r.querySelector<HTMLElement>('.staff__actions .staff__btn:not([disabled])') ||
      r.querySelector<HTMLElement>('.staff__row.is-on');
    if (t) {
      t.focus({ preventScroll: true });
      const k = ['data-id', 'data-move', 'data-table', 'data-yes'].find((x) => t.hasAttribute(x));
      lastFocus.current = k ? `[${k}="${t.getAttribute(k)}"]` : '';
    }
  });

  const all = D ? D.bookings.concat(D.requests) : [];
  const booking = (id: string) => all.find((b) => b.id === id) || null;

  function goto(d: string) {
    loud.current = true;
    setDate(d);
    setSel('');
    setAsk(null);
    setPlanAuto(true);
    setFilter('all');
  }
  function select(id: string) {
    const b = booking(id);
    setAsk(null);
    setNotice('');
    if (!b) {
      setSel('');
      return;
    }
    setSel(id);
    if (D && b.date !== D.date) {
      loud.current = true;
      setDate(b.date);
      setFilter('all');
      setPlanTo(toMin(b.time));
    } else setPlanMin(toMin(b.time));
    setCardWanted((n) => n + 1);
  }
  async function act(fn: () => Promise<unknown>, done?: () => void) {
    setBusy(true);
    setError('');
    try {
      await fn();
      setAsk(null);
      done?.();
      await qc.refetchQueries({ queryKey: ['staff-day', session.token], type: 'active' });
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'auth') signOut(err.message);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const move = (b: Booking, to: string) =>
    act(
      () => call('setStatus', { id: b.id, status: to }, bookingResultSchema),
      () => setNotice(b.name + ': ' + STATUS[to].toLowerCase() + '.'),
    );
  const assign = (b: Booking, table: string) =>
    act(
      () => call('assign', { id: b.id, table }, bookingResultSchema),
      () => setNotice(b.name + ' is on table ' + table + '.'),
    );

  /* ---------------- drawing ---------------- */
  const b = sel ? booking(sel) : null;
  const fresh = D ? fromMin(D.nowMin) : '';

  return (
    <div ref={root} style={{ display: 'contents' }}>
      <header className="staff__top">
        <div className="staff__serif staff__brand">
          Hearth &amp; Bean<small>Bookings</small>
        </div>
        <ViewSwitch view={view} setView={setView} />
        <div className="staff__dates">
          <Btn
            text="‹"
            cls="staff__btn--icon"
            label="Previous day"
            onClick={() => goto(addDays(date || D!.date, -1))}
          />
          <DateInput value={date || D?.date || ''} onPick={goto} />
          <Btn
            text="›"
            cls="staff__btn--icon"
            label="Next day"
            onClick={() => goto(addDays(date || D!.date, 1))}
          />
          <Btn text="Today" onClick={() => goto(D ? D.today : date)} />
        </div>
        <Btn
          text="New booking"
          cls="staff__btn--primary"
          onClick={() => D && setForm({ booking: null, kind: 'phone' })}
        />
        <Btn text="Walk-in" onClick={() => D && setForm({ booking: null, kind: 'walk-in' })} />
        <div className="staff__who">
          <span>{D?.staff || session.name}</span>
          <Btn text="Sign out" cls="staff__btn--small" onClick={() => signOut('')} />
        </div>
      </header>
      <div className="staff__body">
        {error && (
          <div className="staff__alert" role="alert">
            {error}
          </div>
        )}
        {!D ? (
          <p className="staff__empty">
            {loading || q.isFetching ? 'Opening the book…' : 'Nothing loaded yet.'}
          </p>
        ) : (
          <>
            <div className="staff__dayline">
              <h1 className="staff__serif staff__dayname">
                {longDate(D.date) + (D.date === D.today ? ' (today)' : '')}
              </h1>
              <span className="staff__fresh" role="status">
                {loading
                  ? 'Updating…'
                  : (notice ? notice + ' ' : '') +
                    'Updated ' +
                    fresh +
                    (D.hours.closed ? '. Closed for online booking today.' : '')}
              </span>
            </div>
            <Summary D={D} />
            <div className="staff__cols">
              <div style={{ display: 'grid', gap: '20px' }}>
                <section className="staff__panel" aria-label="Requests waiting for an answer">
                  <div className="staff__panel-head">
                    <h2 className="staff__serif staff__panel-title">
                      {'Waiting for an answer' + (D.requests.length ? ' (' + D.requests.length + ')' : '')}
                    </h2>
                  </div>
                  {D.requests.length ? (
                    <div>
                      {D.requests.map((x) => (
                        <Row
                          key={x.id}
                          b={x}
                          withDay
                          on={sel === x.id}
                          onClick={() => select(sel === x.id ? '' : x.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="staff__empty">No requests are waiting.</p>
                  )}
                </section>
                <BookingList D={D} filter={filter} setFilter={setFilter} sel={sel} select={select} />
              </div>
              <div style={{ display: 'grid', gap: '20px' }}>
                <Card
                  b={b}
                  ask={ask}
                  loading={loading}
                  setAsk={setAsk}
                  move={move}
                  edit={(x) => setForm({ booking: x, kind: 'phone' })}
                />
                <Plan
                  D={D}
                  b={b}
                  planMin={planMin}
                  setPlanMin={setPlanMin}
                  range={range(D)}
                  select={select}
                  assign={assign}
                  newAt={(table, time) => setForm({ booking: null, kind: 'phone', preset: { table, time } })}
                />
              </div>
            </div>
          </>
        )}
      </div>
      {form && D && (
        <BookingDialog
          D={D}
          open={form}
          call={call}
          close={() => setForm(null)}
          signOut={signOut}
          saved={(saved, isNew) => {
            setForm(null);
            setSel(saved.id);
            setNotice(saved.name + (isNew ? ' added' : ' saved') + ', table ' + saved.table + '.');
            if (saved.date !== D.date) {
              loud.current = true;
              setPlanTo(toMin(saved.time));
              setDate(saved.date);
            } else {
              setPlanMin(toMin(saved.time));
              qc.refetchQueries({ queryKey: ['staff-day', session.token], type: 'active' });
            }
          }}
        />
      )}
    </div>
  );
}

/** The day shown: reacts to the browser's own change event, like the original page. */
function DateInput({ value, onPick }: { value: string; onPick: (d: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });
  useEffect(() => {
    if (ref.current && ref.current.value !== value) ref.current.value = value;
  }, [value]);
  useEffect(() => {
    const el = ref.current!;
    const f = () => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(el.value)) pick.current(el.value);
    };
    el.addEventListener('change', f);
    return () => el.removeEventListener('change', f);
  }, []);
  return <input ref={ref} className="staff__date" type="date" defaultValue={value} aria-label="Day shown" />;
}

function Summary({ D }: { D: Day }) {
  const s = D.summary,
    waiting = D.requests.length;
  const tile = (n: number, label: string, alert?: boolean) => (
    <div className={'staff__tile' + (alert ? ' staff__tile--alert' : '')}>
      <div className="staff__serif staff__tile-n">{String(n)}</div>
      <div className="staff__tile-l">{label}</div>
    </div>
  );
  return (
    <section className="staff__sum" aria-label="The day in numbers">
      {tile(s.bookings, s.bookings === 1 ? 'Booking' : 'Bookings')}
      {tile(s.covers, s.covers === 1 ? 'Cover' : 'Covers')}
      {tile(waiting, 'Waiting for an answer', waiting > 0)}
      {tile(s.seated, 'Seated now')}
      {tile(s.noshow, s.noshow === 1 ? 'No-show' : 'No-shows')}
    </section>
  );
}

function Row({
  b,
  withDay,
  on,
  onClick,
}: {
  b: Booking;
  withDay: boolean;
  on: boolean;
  onClick: () => void;
}) {
  const meta =
    party(b.guests) +
    (b.table && HOLDS[b.status] ? ' · table ' + b.table : '') +
    (b.source !== 'web' ? ' · ' + b.source : '') +
    (b.notes ? ' · ' + b.notes : '');
  return (
    <button
      type="button"
      className={'staff__row' + (withDay ? ' staff__row--day' : '') + (on ? ' is-on' : '')}
      aria-pressed={on ? 'true' : 'false'}
      data-id={b.id}
      onClick={onClick}
    >
      <span className="staff__row-time">
        {b.time}
        {withDay && <span className="staff__row-day">{shortDate(b.date)}</span>}
      </span>
      <span>
        <span className="staff__row-name" style={{ display: 'block' }}>
          {b.name}
        </span>
        <span className="staff__row-meta" style={{ display: 'block' }}>
          {meta}
        </span>
      </span>
      <span className={'staff__pill staff__pill--' + b.status}>{STATUS[b.status] || b.status}</span>
    </button>
  );
}

function BookingList(props: {
  D: Day;
  filter: string;
  setFilter: (f: string) => void;
  sel: string;
  select: (id: string) => void;
}) {
  const { D, filter, sel, select } = props;
  const all = D.bookings,
    shown = all.filter(
      (b) =>
        filter === 'all' ||
        b.status === filter ||
        (filter === 'other' &&
          (b.status === 'noshow' || b.status === 'declined' || b.status === 'cancelled')),
    );
  return (
    <section className="staff__panel" aria-label="Bookings on this day">
      <div className="staff__panel-head">
        <h2 className="staff__serif staff__panel-title">Bookings</h2>
        <div className="staff__filters" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f[0]}
              type="button"
              className="staff__chip"
              aria-pressed={filter === f[0] ? 'true' : 'false'}
              onClick={() => props.setFilter(f[0])}
            >
              {f[1]}
            </button>
          ))}
        </div>
      </div>
      {shown.length ? (
        <div>
          {shown.map((b) => (
            <Row
              key={b.id}
              b={b}
              withDay={false}
              on={sel === b.id}
              onClick={() => select(sel === b.id ? '' : b.id)}
            />
          ))}
        </div>
      ) : (
        <p className="staff__empty">
          {all.length ? 'Nothing with that status.' : 'No bookings on this day yet.'}
        </p>
      )}
    </section>
  );
}

function Card(props: {
  b: Booking | null;
  ask: { id: string; to: string; label: string; text: string } | null;
  loading: boolean;
  setAsk: (a: { id: string; to: string; label: string; text: string } | null) => void;
  move: (b: Booking, to: string) => void;
  edit: (b: Booking) => void;
}) {
  const { b, ask, loading } = props;
  if (!b)
    return (
      <section className="staff__panel">
        <p className="staff__empty">
          Choose a booking to see its details, answer it or move it to another table.
        </p>
      </section>
    );
  const facts: [string, string][] = [
    ['When', longDate(b.date) + ' at ' + b.time + ', ' + b.duration + ' min'],
    ['Party', party(b.guests)],
    ['Table', HOLDS[b.status] ? b.table : ''],
    ['Asked for', b.seat],
    ['Phone', b.phone],
    ['Email', b.email],
    ['Notes', b.notes],
    ['Came in', b.source === 'web' ? 'Website' : b.source === 'phone' ? 'Phone' : 'Walk-in'],
    ['Reference', b.ref],
    ['Last change', stamp(b.updated) + (b.updatedBy ? ' by ' + b.updatedBy : '')],
  ];
  return (
    <section className="staff__panel" aria-label="Selected booking" data-card="1">
      <div className="staff__card">
        <div className="staff__card-top">
          <h2 className="staff__serif staff__card-name">{b.name}</h2>
          <span className={'staff__pill staff__pill--' + b.status}>{STATUS[b.status]}</span>
        </div>
        <dl className="staff__facts">
          {facts
            .filter((f) => f[1])
            .map((f) => [<dt key={f[0] + 't'}>{f[0]}</dt>, <dd key={f[0] + 'd'}>{f[1]}</dd>])}
        </dl>
        {ask && ask.id === b.id ? (
          <div className="staff__confirm" role="alertdialog" aria-label={ask.text}>
            <span>{ask.text}</span>
            <Btn
              text={'Yes, ' + ask.label.toLowerCase()}
              cls="staff__btn--small staff__btn--primary"
              onClick={() => props.move(b, ask.to)}
              disabled={loading}
              data={{ 'data-yes': '1' }}
            />
            <Btn text="Keep it" cls="staff__btn--small" onClick={() => props.setAsk(null)} />
          </div>
        ) : (
          <div className="staff__actions">
            {(MOVES[b.status] || []).map((m) => (
              <Btn
                key={m[0]}
                text={m[1]}
                cls={m[2] ? 'staff__btn--' + m[2] : ''}
                onClick={() => {
                  if (m[3]) props.setAsk({ id: b.id, to: m[0], label: m[1], text: m[3] });
                  else props.move(b, m[0]);
                }}
                disabled={loading}
                data={{ 'data-move': m[0] }}
              />
            ))}
            <Btn text="Edit" onClick={() => props.edit(b)} disabled={loading} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- tables ---------------- */
function holderAt(D: Day, tableId: string, min: number) {
  for (const b of D.bookings) {
    const s = toMin(b.time);
    if (b.table === tableId && HOLDS[b.status] && s <= min && min < s + b.duration) return b;
  }
  return null;
}
function nextOn(D: Day, tableId: string, min: number) {
  let best: Booking | null = null;
  D.bookings.forEach((b) => {
    const s = toMin(b.time);
    if (b.table === tableId && HOLDS[b.status] && s > min && (!best || s < toMin(best.time))) best = b;
  });
  return best as Booking | null;
}
const biggest = (D: Day) => D.tables.reduce((m, t) => (t.max > m ? t.max : m), 0);
/** Whether a booking could take a table for its whole stay. */
function canTake(D: Day, t: Table, b: { id: string; guests: number; time: string; duration: number }) {
  // a party larger than every table sits wherever staff decide; otherwise the table must be big enough
  if (b.guests > t.max && b.guests <= biggest(D)) return false;
  const s = toMin(b.time),
    e = s + b.duration;
  return !D.bookings.some((x) => {
    const xs = toMin(x.time);
    return x.id !== b.id && x.table === t.id && HOLDS[x.status] && s < xs + x.duration && xs < e;
  });
}

function Plan(props: {
  D: Day;
  b: Booking | null;
  planMin: number;
  setPlanMin: (m: number) => void;
  range: { lo: number; hi: number };
  select: (id: string) => void;
  assign: (b: Booking, table: string) => void;
  newAt: (table: string, time: string) => void;
}) {
  const { D, b, range: r } = props;
  const picking = b && HOLDS[b.status] && b.date === D.date ? b : null;
  const at = Math.min(r.hi, Math.max(r.lo, props.planMin));
  const key = (cls: string, text: string) => (
    <span className={'staff__key' + (cls ? ' staff__key--' + cls : '')}>
      <i />
      {text}
    </span>
  );
  return (
    <section className="staff__panel" aria-label="Table plan">
      <div className="staff__panel-head">
        <h2 className="staff__serif staff__panel-title">Table plan</h2>
        <div className="staff__plan-tools">
          Showing<span className="staff__plan-time">{fromMin(at)}</span>
          <input
            className="staff__range"
            type="range"
            min={r.lo}
            max={r.hi}
            step={15}
            value={at}
            aria-label="Time shown on the plan"
            onChange={(e) => props.setPlanMin(+e.target.value)}
          />
          {D.date === D.today && (
            <Btn
              text="Now"
              cls="staff__btn--small"
              onClick={() => props.setPlanMin(Math.floor(D.nowMin / 15) * 15)}
            />
          )}
        </div>
      </div>
      {picking && (
        <div className="staff__hint">
          {picking.name +
            ', ' +
            party(picking.guests) +
            ' at ' +
            picking.time +
            ': on table ' +
            picking.table +
            '. Tap an outlined table to move them.'}
        </div>
      )}
      <div className="staff__floor">
        {[
          ['window', 'Window'],
          ['fire', 'Fire'],
          ['bar', 'Bar'],
          ['door', 'Door'],
        ].map((d) => (
          <div key={d[0]} className={'staff__decor staff__decor--' + d[0]} aria-hidden="true">
            {d[1]}
          </div>
        ))}
        {D.tables.map((t) => {
          const who = holderAt(D, t.id, at),
            next = who ? null : nextOn(D, t.id, at);
          let cls =
            'staff__table' +
            (t.shape === 'round' ? ' staff__table--round' : '') +
            (who ? ' staff__table--' + who.status : '');
          const sub = who
            ? who.name.split(' ')[0] + ' · ' + who.guests
            : next
              ? 'to ' + next.time
              : 'seats ' + t.max;
          let say =
            'Table ' +
            t.id +
            ', seats ' +
            t.max +
            ', ' +
            (who
              ? STATUS[who.status].toLowerCase() +
                ': ' +
                who.name +
                ', ' +
                party(who.guests) +
                ' at ' +
                who.time
              : 'free' + (next ? ' until ' + next.time : ''));
          let disabled = false;
          let onClick: (() => void) | undefined;
          if (picking) {
            if (picking.table === t.id) {
              cls += ' is-mine';
              say += '. Their table now';
              disabled = true;
            } else if (canTake(D, t, picking)) {
              cls += ' is-open';
              say += '. Move ' + picking.name + ' here';
              onClick = () => props.assign(picking, t.id);
            } else {
              cls += ' is-shut';
              disabled = true;
              say += picking.guests > t.max ? '. Too small' : '. Taken at that time';
            }
          } else if (who) onClick = () => props.select(who.id);
          else onClick = () => props.newAt(t.id, fromMin(at));
          return (
            <button
              key={t.id}
              type="button"
              style={{ left: t.x + '%', top: t.y + '%', width: t.w + '%', height: t.h + '%' }}
              data-table={t.id}
              disabled={disabled}
              onClick={onClick}
              className={cls}
              aria-label={say}
              title={say}
            >
              <span className="staff__table-id">{t.id}</span>
              <span className="staff__table-sub">{sub}</span>
            </button>
          );
        })}
      </div>
      <div className="staff__legend">
        {key('', 'Free')}
        {key('pending', 'Held for a request')}
        {key('confirmed', 'Confirmed')}
        {key('seated', 'Seated')}
      </div>
    </section>
  );
}

/* ---------------- new booking / edit ---------------- */
const staffFormSchema = z.object({
  date: z.string().min(1, 'Choose a date and a time.'),
  time: z.string().min(1, 'Choose a date and a time.'),
  guests: z.coerce.number().refine((n) => n >= 1, 'Say how many guests.'),
  name: z.string().trim().min(2, 'Add a name.'),
  phone: z.string().trim(),
  email: z.string().trim(),
  notes: z.string().trim(),
  table: z.string(),
  notify: z.boolean(),
});

function BookingDialog(props: {
  D: Day;
  open: FormOpen;
  call: <T>(action: string, body: Record<string, unknown>, schema: z.ZodType<T>) => Promise<T>;
  close: () => void;
  signOut: (m: string) => void;
  saved: (b: Booking, isNew: boolean) => void;
}) {
  const { D, open } = props;
  const b = open.booking;
  const isNew = !b,
    walk = open.kind === 'walk-in';
  const nowT = fromMin(Math.min(1435, Math.floor(D.nowMin / 5) * 5));
  const preset = open.preset || {};
  const [f, setF] = useState(() =>
    b
      ? {
          date: b.date,
          time: b.time,
          guests: String(b.guests),
          name: b.name,
          phone: b.phone,
          email: b.email,
          notes: b.notes,
          table: HOLDS[b.status] ? b.table : '',
          notify: false,
        }
      : {
          date: walk ? D.today : D.date,
          time: preset.time || (walk ? nowT : '19:00'),
          guests: '2',
          name: walk ? 'Walk-in' : '',
          phone: '',
          email: '',
          notes: '',
          table: preset.table || '',
          notify: isNew && !walk,
        },
  );
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const guestsRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = dlg.current!;
    if (d.showModal) d.showModal();
    else d.setAttribute('open', '');
    (walk ? guestsRef : isNew ? nameRef : timeRef).current?.focus();
    return () => {
      try {
        d.close();
      } catch {
        /* already closed */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* the tables free for this party at this time (only this day's bookings are loaded: other days, the sheet chooses) */
  const g = +f.guests || 1,
    s = toMin(f.time || '00:00');
  const dur = b && b.guests === g ? b.duration : g >= 5 ? D.settings.durationLarge : D.settings.durationSmall;
  const options =
    f.date !== D.date
      ? []
      : D.tables.filter(
          (t) =>
            !(g > t.max && g <= biggest(D)) &&
            canTake(D, t, { id: b ? b.id : '', guests: g, time: fromMin(s), duration: dur }),
        );
  const table = options.some((t) => t.id === f.table) ? f.table : '';
  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const r = staffFormSchema.safeParse({ ...f, table });
    if (!r.success) {
      const issue = r.error.issues[0];
      setErr(issue.message);
      const k = issue.path[0];
      if (k === 'guests') guestsRef.current?.focus();
      if (k === 'name') nameRef.current?.focus();
      return;
    }
    const v = r.data;
    const body: Record<string, unknown> = {
      date: v.date,
      time: v.time,
      guests: v.guests,
      name: v.name,
      phone: v.phone,
      email: v.email,
      notes: v.notes,
    };
    if (isNew || HOLDS[b!.status]) body.table = v.table; // empty means: let the sheet choose
    if (isNew) {
      body.source = walk ? 'walk-in' : 'phone';
      body.notify = v.notify;
    } else body.id = b!.id;
    setSaving(true);
    setErr('');
    try {
      const res = await props.call(isNew ? 'create' : 'update', body, bookingResultSchema);
      props.saved(res.booking, isNew);
    } catch (e2) {
      setSaving(false);
      const er = e2 as ApiError;
      if (er.code === 'auth') {
        props.close();
        props.signOut(er.message);
      } else setErr(er.message);
    }
  }

  const field = (label: string, input: React.ReactNode) => (
    <label className="staff__field">
      {label}
      {input}
    </label>
  );
  return (
    <dialog
      ref={dlg}
      className="staff__dialog"
      aria-label={isNew ? 'New booking' : 'Edit booking'}
      onCancel={() => props.close()}
    >
      <form className="staff__dialog-form" noValidate onSubmit={submit}>
        <h2 className="staff__serif staff__dialog-title">
          {isNew ? (walk ? 'Walk-in' : 'New booking') : 'Edit booking'}
        </h2>
        <div className="staff__grid3">
          {field(
            'Date',
            <input className="staff__input" type="date" value={f.date} onChange={set('date')} required />,
          )}
          {field(
            'Time',
            <input
              ref={timeRef}
              className="staff__input"
              type="time"
              step={300}
              value={f.time}
              onChange={set('time')}
              required
            />,
          )}
          {field(
            'Guests',
            <input
              ref={guestsRef}
              className="staff__input"
              type="number"
              min={1}
              max={40}
              inputMode="numeric"
              value={f.guests}
              onChange={set('guests')}
              required
            />,
          )}
        </div>
        <div className="staff__grid2">
          {field(
            'Name',
            <input
              ref={nameRef}
              className="staff__input"
              type="text"
              value={f.name}
              onChange={set('name')}
              autoComplete="off"
              required
            />,
          )}
          {field(
            'Table',
            <select className="staff__input" value={table} onChange={set('table')}>
              <option value="">Choose for me</option>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id + ' · ' + t.zone + ' · seats ' + t.max}
                </option>
              ))}
            </select>,
          )}
        </div>
        <div className="staff__grid2">
          {field(
            'Phone',
            <input
              className="staff__input"
              type="tel"
              value={f.phone}
              onChange={set('phone')}
              autoComplete="off"
            />,
          )}
          {field(
            'Email',
            <input
              className="staff__input"
              type="email"
              value={f.email}
              onChange={set('email')}
              autoComplete="off"
            />,
          )}
        </div>
        {field(
          'Notes',
          <textarea className="staff__input" rows={2} value={f.notes} onChange={set('notes')} />,
        )}
        {isNew && !walk && (
          <label className="staff__check">
            <input
              type="checkbox"
              checked={f.notify}
              onChange={(e) => setF((x) => ({ ...x, notify: e.target.checked }))}
            />
            Email the guest a confirmation (needs their email)
          </label>
        )}
        <p className="staff__error" role="alert">
          {err}
        </p>
        <div className="staff__dialog-foot">
          <Btn text="Close" onClick={props.close} />
          <button type="submit" className="staff__btn staff__btn--primary" disabled={saving}>
            {isNew ? (walk ? 'Seat them' : 'Add booking') : 'Save changes'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
