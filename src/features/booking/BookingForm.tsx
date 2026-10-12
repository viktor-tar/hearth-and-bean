'use client';

/*
 * The booking form on the home page.
 * Every choice is an ordinary control: number of guests and seating preference are dropdown menus, the date is a
 * calendar, the part of the day and the time are buttons. The form starts on two guests, tomorrow, no seating
 * preference. The seating menu only offers the areas that have a table for the chosen party.
 * The large sentence above the controls only repeats the choices; it is not a control.
 * The times that are really free for the party come from the booking sheet; a request is only sent for one of them.
 * The guest never picks a table: staff do that on the staff page.
 * While no booking address is set (NEXT_PUBLIC_BOOKING_API_URL), the form stays in preview and sends nothing.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import {
  ApiError,
  availabilitySchema,
  BOOKING_API,
  bookResultSchema,
  callApi,
  type Availability,
  type Seating,
} from '@/lib/booking-api';
import { addDays, dayNo, DAYS, londonToday, longDate, MONTHS, shortDate, toMin, weekday } from '@/lib/dates';
import { checkContact, type ContactField } from './contact';
import { Calendar, Dropdown, PopupProvider, type Option } from './Popups';

const NUMBERS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const PERIODS = [
  { say: 'in the morning', name: 'Morning', from: 0, to: 719 },
  { say: 'at lunch', name: 'Lunch', from: 720, to: 899 },
  { say: 'in the afternoon', name: 'Afternoon', from: 900, to: 1019 },
  { say: 'in the evening', name: 'Evening', from: 1020, to: 1439 },
];
/* Seating areas are the "zone" names of the Tables tab in the booking sheet. An area this page has no wording for is shown by its name. */
const AREAS: Record<string, { name: string; say: string }> = {
  Window: { name: 'At the window', say: 'at the window' },
  Fire: { name: 'By the fire', say: 'by the fire' },
  Room: { name: 'In the main room', say: 'in the main room' },
  Bar: { name: 'At the bar', say: 'at the bar' },
};
const area = (zone: string) => AREAS[zone] || { name: zone, say: 'in the ' + zone.toLowerCase() };
/* Area, smallest party, largest party. The sheet sends this list for its own tables with every answer;
   this one, the standard floor plan, stands in until the first answer. */
const STANDARD: Seating = [
  ['Window', 1, 4],
  ['Fire', 1, 4],
  ['Room', 2, 8],
  ['Bar', 1, 2],
];
const MAX_DAYS = 60,
  MAX_GUESTS = NUMBERS.length;
const OFFLINE = 'We could not reach the bookings. Check your connection and try again.';
const GUEST_ITEMS: Option<number>[] = Array.from({ length: MAX_GUESTS }, (_, i) => ({
  value: i + 1,
  text: i + 1 + (i ? ' guests' : ' guest'),
}));

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

/** The areas with a table for a party, in the order of the list. */
function areasFor(seating: Seating | null, party: number) {
  const out: string[] = [];
  (seating || STANDARD).forEach((t) => {
    if (party >= +t[1] && party <= +t[2] && out.indexOf(t[0]) < 0) out.push(t[0]);
  });
  return out;
}

interface Choice {
  guests: number;
  date: string;
  period: number;
  seat: string; // an area name, or '' for no preference
  slot: string;
}

/* ---------------- the sentence: a summary of the choices, not a control ---------------- */
function Token({ k, text, instant }: { k: string; text: string; instant: boolean }) {
  const [shown, setShown] = useState(text);
  const inner = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (text === shown) return;
    const motion = document.documentElement.classList.contains('hb-motion');
    if (instant || !motion || !inner.current) {
      setShown(text);
      return;
    }
    const tl = gsap
      .timeline()
      .to(inner.current, { yPercent: -105, duration: 0.2, ease: 'power2.in' })
      .add(() => setShown(text))
      .fromTo(inner.current, { yPercent: 105 }, { yPercent: 0, duration: 0.42, ease: 'power3.out' });
    return () => {
      tl.kill();
    };
    // `shown` is deliberately left out: the swap happens inside the timeline
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, instant]);
  return (
    <span data-k={k} className="reserve__token">
      <span ref={inner} className="reserve__token-text">
        {shown}
      </span>
    </span>
  );
}

export default function BookingForm() {
  return (
    <PopupProvider>
      <Booking />
    </PopupProvider>
  );
}

function Booking() {
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [today] = useState(londonToday);
  const lastDay = addDays(today, MAX_DAYS);
  const [c, setC] = useState<Choice>(() => ({
    guests: 2,
    date: addDays(today, 1),
    period: 3,
    seat: '',
    slot: '',
  }));
  const [seating, setSeating] = useState<Seating | null>(BOOKING_API ? null : STANDARD); // null until the sheet has answered once
  const [lost, setLost] = useState(''); // a preference that had to be dropped for the party in hand
  const [message, setMessage] = useState('');
  const [asked, setAsked] = useState(false); // times are only asked for once the visitor gets near the form
  const [instant, setInstant] = useState(false);
  const [done, setDone] = useState<{ title: string; note: string; again: string } | null>(null);
  const [values, setValues] = useState<Record<ContactField, string>>({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const sentence = useRef<HTMLHeadingElement>(null);
  const slotsBox = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const guestsBtn = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const focusField = (f: ContactField) =>
    ({ name: nameRef, email: emailRef, phone: phoneRef, notes: notesRef })[f].current?.focus();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the controls depend on the visitor's date: draw them after hydration
  useEffect(() => setMounted(true), []);

  /* ask the sheet for times only when the visitor gets near the form */
  useEffect(() => {
    if (!BOOKING_API || asked || !sentence.current) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((x) => x.isIntersecting)) {
          io.disconnect();
          setAsked(true);
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(sentence.current);
    return () => io.disconnect();
  }, [asked]);

  /* ---------------- talking to the booking sheet ---------------- */
  const times = useQuery({
    queryKey: ['availability', c.date, c.guests],
    queryFn: async ({ signal }) => {
      await sleep(220, signal); // a quick run of choices sends one request, not several
      return callApi({ action: 'availability', date: c.date, guests: c.guests }, availabilitySchema, {
        offline: OFFLINE,
        timeoutMs: 25000,
      });
    },
    enabled: !!BOOKING_API && asked,
    staleTime: 30000,
    gcTime: 5 * 60000,
    placeholderData: keepPreviousData,
  });
  const loadState: 'off' | 'loading' | 'error' | 'ready' = !BOOKING_API
    ? 'off'
    : times.isFetching || times.isPlaceholderData || (!times.data && !times.isError)
      ? 'loading'
      : times.isError
        ? 'error'
        : 'ready';
  const day: Availability | null = loadState === 'ready' ? times.data! : null;
  const reload = () => {
    setAsked(true);
    qc.invalidateQueries({ queryKey: ['availability'] });
  };

  const periodHasSlots = (i: number, d: Availability | null = day) =>
    !d ||
    d.closed ||
    d.slots.some((s) => {
      const m = toMin(s.time);
      return m >= PERIODS[i].from && m <= PERIODS[i].to;
    });

  /* After an answer: keep the chosen time only if it is still free, and never sit on a part of the day with no times. */
  useEffect(() => {
    if (!day) return;
    // the sheet's own tables; an older script (before 1.1.0) does not send them, so the standard floor plan applies
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the sheet's answer
    setSeating(day.seating ?? STANDARD);
    setC((s) => {
      const n = { ...s };
      if (!day.closed) {
        if (n.slot && !day.slots.some((x) => x.time === n.slot && x.state === 'free')) n.slot = '';
        if (!periodHasSlots(n.period, day)) {
          let best = -1;
          for (let i = PERIODS.length - 1; i >= 0; i--)
            if (periodHasSlots(i, day)) {
              best = i;
              if (i <= n.period) break;
            }
          if (best >= 0) n.period = best;
        }
      } else n.slot = '';
      return n.slot === s.slot && n.period === s.period ? s : n;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  /* Offer only the areas with a table for the party in hand. A preference the party does not fit is dropped and the
     guest is told why; in the moments before the sheet's first answer the preference is kept, not judged. */
  const known = !!seating;
  const can = areasFor(seating, c.guests);
  useEffect(() => {
    if (known && c.seat && can.indexOf(c.seat) < 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the sheet's tables
      setLost(c.seat);
      setC((s) => ({ ...s, seat: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [known, c.seat, c.guests, seating]);
  const offered = c.seat && can.indexOf(c.seat) < 0 ? [...can, c.seat] : can;
  const party = NUMBERS[c.guests - 1];
  const seatHint = (
    (lost ? area(lost).name + ' has no table for ' + party + '. ' : '') +
    (!known
      ? ''
      : can.length === 1
        ? 'Tables for ' + party + ' are ' + area(can[0]).say + '.'
        : can.length
          ? ''
          : 'We will choose the table for ' + party + '.')
  ).trim();

  /* ---------------- the words ---------------- */
  const dayWords = () => {
    const n = dayNo(c.date) - dayNo(today);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n > 1 && n < 7) return 'on ' + DAYS[weekday(c.date)];
    const p = c.date.split('-');
    return 'on ' + +p[2] + ' ' + MONTHS[+p[1] - 1];
  };
  const words = {
    guests: NUMBERS[c.guests - 1],
    day: dayWords(),
    time: c.slot ? 'at ' + c.slot : PERIODS[c.period].say,
    seat: c.seat ? area(c.seat).say : 'wherever is free',
  };
  const request = () =>
    'A table for ' +
    words.guests +
    ' ' +
    (c.slot ? 'on ' + longDate(c.date) : words.day) +
    ' ' +
    words.time +
    ', ' +
    words.seat +
    '.';

  const change = (patch: Partial<Choice>) => {
    setInstant(false);
    setMessage('');
    setC((s) => ({ ...s, ...patch }));
  };

  /* ---------------- sending ---------------- */
  const book = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      callApi({ action: 'book', ...body }, bookResultSchema, { offline: OFFLINE, timeoutMs: 25000 }),
  });

  function finish(title: string, note: string, again: string) {
    setDone({ title, note, again });
    setMessage('');
  }
  useLayoutEffect(() => {
    if (!done || !doneRef.current) return;
    doneRef.current.focus({ preventScroll: true });
    if (document.documentElement.classList.contains('hb-motion'))
      gsap.fromTo(
        doneRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
      );
  }, [done]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (book.isPending) return;
    if (BOOKING_API && !c.slot) {
      setMessage(
        loadState === 'ready'
          ? 'Choose one of the available times first.'
          : 'The times are still loading. One moment.',
      );
      slotsBox.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const check = checkContact(values);
    if (!check.ok) {
      setMessage(check.message);
      focusField(check.field);
      return;
    }
    const { name, email, phone, notes } = check.data;
    if (!BOOKING_API) {
      finish(
        request() + ' Thank you, ' + name.split(' ')[0] + '.',
        'That is how your request reads. This form is not connected to a booking system yet, so nothing has been sent and no table is held.',
        'Change the request',
      );
      return;
    }
    setMessage('');
    const seat = c.seat;
    book.mutate(
      { date: c.date, time: c.slot, guests: c.guests, seat, name, email, phone, notes, website: '' },
      {
        onSuccess: (r) => {
          qc.removeQueries({ queryKey: ['availability'] });
          // the answer says what the sheet stored: the confirmation repeats that, not what the page assumed
          const g = Number(r.guests) || c.guests,
            many = g + (g === 1 ? ' guest' : ' guests');
          finish(
            'Your table for ' +
              (NUMBERS[g - 1] || g) +
              ' on ' +
              longDate(r.date || c.date) +
              ' at ' +
              (r.time || c.slot) +
              '.',
            'Thank you, ' +
              name.split(' ')[0] +
              '. Your request for ' +
              many +
              ' is with us and a table is held while we check the book. ' +
              (seat ? 'We have noted that you would like to sit ' + area(seat).say + '. ' : '') +
              (r.emailed
                ? 'We will confirm by email to ' + email + '.'
                : 'We will confirm by email or phone.') +
              ' Your reference is ' +
              r.ref +
              '.',
            'Make another request',
          );
          setValues((v) => ({ ...v, notes: '' }));
          // the sentence keeps showing the booked time until the guest starts a new request
        },
        onError: (err) => {
          const code = err instanceof ApiError ? err.code : '';
          setMessage(err.message);
          if (code === 'slot_taken' || code === 'too_late' || code === 'bad_time' || code === 'closed') {
            setInstant(false);
            setC((s) => ({ ...s, slot: '' }));
            qc.removeQueries({ queryKey: ['availability'] });
            setAsked(true);
          }
          if (code === 'bad_email') focusField('email');
          if (code === 'bad_phone') focusField('phone');
          if (code === 'bad_name') focusField('name');
        },
      },
    );
  }

  function again() {
    setDone(null);
    setInstant(true);
    setC((s) => ({ ...s, slot: '' }));
    reload();
    requestAnimationFrame(() => (guestsBtn.current || nameRef.current)?.focus({ preventScroll: true }));
  }

  /* ---------------- part of the day and the list of times ---------------- */
  const P = PERIODS[c.period];
  const inPeriod =
    day && !day.closed ? day.slots.filter((s) => toMin(s.time) >= P.from && toMin(s.time) <= P.to) : [];
  const free = inPeriod.filter((s) => s.state === 'free'),
    off = inPeriod.filter((s) => s.state !== 'free');
  const freeIn = (i: number) =>
    day
      ? day.slots.filter(
          (s) => s.state === 'free' && toMin(s.time) >= PERIODS[i].from && toMin(s.time) <= PERIODS[i].to,
        ).length
      : 0;
  let note = '';
  if (mounted) {
    if (loadState === 'off') note = 'Times will appear here once online booking is switched on.';
    else if (loadState === 'loading') note = 'Checking the book…';
    else if (loadState === 'error') note = times.error?.message || 'We could not load the times.';
    else if (day?.closed)
      note = 'We are closed on ' + DAYS[weekday(c.date)] + 's. Please choose another date.';
    else if (free.length)
      note = c.slot
        ? 'We will hold ' + c.slot + ' for you while we check the book.'
        : 'Choose a time for ' + party + '.';
    else {
      const others: string[] = [];
      PERIODS.forEach((p, i) => {
        if (i !== c.period && freeIn(i)) others.push(p.name.toLowerCase());
      });
      note =
        'Nothing left ' +
        P.say +
        ' for ' +
        party +
        '. ' +
        (others.length
          ? 'Try ' +
            (others.length > 1 ? others.slice(0, -1).join(', ') + ' or ' : '') +
            others[others.length - 1] +
            '.'
          : 'Please choose another date.');
    }
  }
  const showPeriods = mounted && !(day && day.closed);
  const dateText = (() => {
    const n = dayNo(c.date) - dayNo(today);
    return (n === 0 ? 'Today, ' : n === 1 ? 'Tomorrow, ' : '') + shortDate(c.date);
  })();
  const sending = book.isPending;

  return (
    <div className="reserve__main">
      <p className="reserve__lead">
        Choose the number of guests, a date and a time. We will confirm by email.
      </p>
      <h2 ref={sentence} aria-live="polite" data-hb="reserve-sentence" className="display reserve__sentence">
        <span className="reserve__line">
          {'A table for '}
          <Token k="guests" text={words.guests} instant={instant} />
        </span>
        <span className="reserve__line">
          <Token k="day" text={words.day} instant={instant} />
        </span>
        <span className="reserve__line">
          <Token k="time" text={words.time} instant={instant} />,
        </span>
        <span className="reserve__line">
          <Token k="seat" text={words.seat} instant={instant} />.
        </span>
      </h2>
      <div data-hb="reserve-choices" className="reserve__choices" hidden={!!done}>
        <div className="reserve__choice">
          <div className="reserve__label">Number of guests</div>
          <div data-hb="reserve-guests" className="reserve__control">
            {mounted && (
              <Dropdown
                id="reserve-guests"
                label="Number of guests"
                items={GUEST_ITEMS}
                value={c.guests}
                btnRef={guestsBtn}
                onPick={(v) => {
                  setLost('');
                  change({ guests: v, slot: '' });
                  setAsked(true);
                }}
              />
            )}
          </div>
        </div>
        <div className="reserve__choice">
          <div className="reserve__label">Date</div>
          <div data-hb="reserve-date" className="reserve__control">
            {mounted && (
              <Calendar
                id="reserve-date"
                label="Date"
                value={c.date}
                text={dateText}
                today={today}
                lastDay={lastDay}
                onPick={(v) => {
                  change({ date: v, slot: '' });
                  setAsked(true);
                }}
              />
            )}
          </div>
        </div>
        <div className="reserve__choice">
          <div className="reserve__label">Seating preference</div>
          <div data-hb="reserve-seat" className="reserve__control">
            {mounted && (
              <Dropdown
                id="reserve-seat"
                label="Seating preference"
                items={[
                  { value: '', text: 'No preference' },
                  ...offered.map((z) => ({ value: z, text: area(z).name })),
                ]}
                value={c.seat}
                set={!!c.seat}
                onPick={(v) => {
                  setLost('');
                  change({ seat: v });
                }}
              />
            )}
          </div>
          {mounted && (
            <p className="reserve__hint" role="status">
              {seatHint}
            </p>
          )}
        </div>
      </div>
      <div data-hb="reserve-times" className="reserve__times" hidden={!!done}>
        <div className="reserve__times-head">
          <h3 data-hb="reserve-times-title" className="reserve__times-title">
            {mounted ? longDate(c.date) : 'Times'}
          </h3>
          <div
            data-hb="reserve-periods"
            className="reserve__periods"
            role={mounted ? 'group' : undefined}
            aria-label={mounted ? 'Part of the day' : undefined}
          >
            {showPeriods &&
              PERIODS.map((p, i) =>
                day && !periodHasSlots(i) ? null : (
                  <button
                    key={p.name}
                    className="reserve__tab"
                    type="button"
                    aria-pressed={i === c.period ? 'true' : 'false'}
                    onClick={() => {
                      if (c.period === i) return;
                      change({ period: i, slot: '' });
                    }}
                  >
                    {p.name}
                  </button>
                ),
              )}
          </div>
        </div>
        <div
          ref={slotsBox}
          data-hb="reserve-slots"
          className={'reserve__slots' + (mounted && loadState === 'loading' ? ' is-loading' : '')}
        >
          {mounted && loadState === 'error' && (
            <button className="text-link" type="button" onClick={reload}>
              Try again
            </button>
          )}
          {free.length > 0 && (
            <div className="reserve__group" role="group" aria-label="Available times">
              <div className="reserve__group-label">Available</div>
              {free.map((s) => (
                <button
                  key={s.time}
                  className="reserve__slot"
                  type="button"
                  aria-pressed={c.slot === s.time ? 'true' : 'false'}
                  onClick={() => change({ slot: c.slot === s.time ? '' : s.time })}
                >
                  {s.time}
                </button>
              ))}
            </div>
          )}
          {off.length > 0 && (
            <div className="reserve__group">
              <div className="reserve__group-label">Unavailable</div>
              {off.map((s) => (
                <span key={s.time} className="reserve__off">
                  <span className="reserve__off-time">{s.time}</span>
                  {s.state === 'full' ? 'Fully booked' : 'Too late to book online'}
                </span>
              ))}
            </div>
          )}
        </div>
        <p data-hb="reserve-times-note" role="status" className="reserve__times-note">
          {note}
        </p>
      </div>
      <div className="reserve__form-block hb-form" hidden={!!done}>
        <form
          name="reservation"
          noValidate
          data-hb="reserve-form"
          className="reserve__form"
          onSubmit={onSubmit}
        >
          <Field
            id="reserve-name"
            label="Your name"
            name="field"
            type="text"
            autoComplete="name"
            placeholder="As we should greet you"
            value={values.name}
            inputRef={nameRef}
            onChange={(v) => {
              setValues((s) => ({ ...s, name: v }));
              setMessage('');
            }}
          />
          <Field
            id="reserve-email"
            label="Email"
            name="contact"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="For your confirmation"
            value={values.email}
            inputRef={emailRef}
            onChange={(v) => {
              setValues((s) => ({ ...s, email: v }));
              setMessage('');
            }}
          />
          <Field
            id="reserve-phone"
            label="Phone"
            name="Phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="A mobile is best"
            value={values.phone}
            inputRef={phoneRef}
            onChange={(v) => {
              setValues((s) => ({ ...s, phone: v }));
              setMessage('');
            }}
          />
          <Field
            id="reserve-notes"
            label="Anything we should know (optional)"
            name="Notes"
            type="text"
            autoComplete="off"
            placeholder="Allergies, a birthday, a highchair"
            wide
            value={values.notes}
            inputRef={notesRef}
            onChange={(v) => setValues((s) => ({ ...s, notes: v }))}
          />
          <button type="submit" className="button button--cream" disabled={sending}>
            <span data-hb="reserve-submit-label" className="button__label">
              {sending ? 'Sending…' : 'Request this table'}
            </span>
            <span className="button__icon button__icon--roast">
              <svg
                aria-hidden="true"
                strokeWidth="1.6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
                className="button__arrow"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>
        </form>
        <div className="hb-form-done">
          <div className="reserve__form-message">
            Thank you. Your request is with us and we will confirm with you directly.
          </div>
        </div>
        <div className="hb-form-fail">
          <div className="reserve__form-message">
            Something went wrong and your request was not sent. Please try again.
          </div>
        </div>
      </div>
      <p data-hb="reserve-message" role="status" className="reserve__message">
        {message}
      </p>
      <p data-hb="reserve-disclaimer" className="reserve__disclaimer" hidden={!!BOOKING_API || !!done}>
        Online booking is not switched on yet. This form shows how your request will read. It does not send
        anything.
      </p>
      <p data-hb="reserve-privacy" className="reserve__privacy" hidden={!BOOKING_API || !!done}>
        We use these details only to look after your booking.
      </p>
      <div
        ref={doneRef}
        data-hb="reserve-done"
        className="reserve__done"
        hidden={!done}
        tabIndex={done ? -1 : undefined}
      >
        <div data-hb="reserve-done-text" className="reserve__done-title">
          {done?.title}
        </div>
        <p data-hb="reserve-done-note" className="reserve__done-text">
          {done
            ? done.note
            : 'That is how your request reads. This form is not connected to a booking system yet, so nothing has been sent and no table is held.'}
        </p>
        <button data-hb="reserve-again" type="button" className="text-link reserve__again" onClick={again}>
          {done?.again || 'Change the request'}
        </button>
      </div>
    </div>
  );
}

function Field({
  inputRef,
  ...props
}: {
  id: string;
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  wide?: boolean;
  value: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (v: string) => void;
}) {
  return (
    <div className={'reserve__field' + (props.wide ? ' reserve__field--wide' : '')}>
      <label htmlFor={props.id} className="reserve__label">
        {props.label}
      </label>
      <input
        ref={inputRef}
        className="reserve__input hb-input"
        autoComplete={props.autoComplete}
        maxLength={256}
        name={props.name}
        placeholder={props.placeholder}
        type={props.type}
        id={props.id}
        inputMode={props.inputMode}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}
