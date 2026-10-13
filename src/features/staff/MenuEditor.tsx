'use client';

/*
 * Hearth & Bean: the menu on the staff page.
 * Shows every dish with its photo, grouped by menu section. Staff can edit a dish, hide it, add a new one, give it a
 * new photo and publish the menu. The text lives in the "Menu" tab of the booking sheet and the photos in its Drive
 * folder; publishing asks Netlify to rebuild the website, which reads both (scripts/sync-menu.mjs).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  ApiError,
  callApi,
  menuAdminSchema,
  menuItemResultSchema,
  menuPhotoDataSchema,
  menuPublishSchema,
  type MenuAdmin,
  type MenuItem,
  type MenuPhoto,
} from '@/lib/booking-api';

export type View = 'bookings' | 'menu';
type Call = <T>(action: string, body: Record<string, unknown>, schema: z.ZodType<T>) => Promise<T>;
type Session = { token: string; name: string };

const OFFLINE = 'Could not reach the booking sheet. Check the connection and try again.';
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_UPLOAD = 4 * 1024 * 1024;

/** Bookings / Menu, in the dark bar at the top of the staff page. */
export function ViewSwitch({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <nav className="staff__views" aria-label="Staff page">
      {(
        [
          ['bookings', 'Bookings'],
          ['menu', 'Menu'],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          className={'staff__view' + (view === v ? ' is-on' : '')}
          aria-current={view === v ? 'page' : undefined}
          onClick={() => setView(v)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function when(t: number) {
  if (!t) return '';
  const d = new Date(t);
  const same = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return same
    ? 'today at ' + time
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + time;
}

export default function MenuEditor(props: {
  session: Session;
  signOut: (m: string) => void;
  view: View;
  setView: (v: View) => void;
}) {
  const { session, signOut } = props;
  const qc = useQueryClient();
  const [section, setSection] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ item: MenuItem | null } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [publishing, setPublishing] = useState(false);

  const call: Call = useCallback(
    (action, body, schema) =>
      callApi({ ...body, action, token: session.token }, schema, { offline: OFFLINE, timeoutMs: 60000 }),
    [session.token],
  );

  const q = useQuery({
    queryKey: ['staff-menu', session.token],
    queryFn: () => call('menuAdmin', {}, menuAdminSchema),
    refetchOnWindowFocus: true,
  });
  const M: MenuAdmin | undefined = q.data;
  useEffect(() => {
    if (!q.isError) return;
    const e = q.error as ApiError;
    if (e.code === 'auth') signOut(e.message);
    else setError(e.message); // eslint-disable-line react-hooks/set-state-in-effect -- follows the sheet's answer
  }, [q.errorUpdatedAt, q.isError, q.error, signOut]);

  const items = useMemo(() => M?.items ?? [], [M]);
  const missing = items.filter((i) => i.active && !i.photo);
  const unpublished = !!M && M.edited > M.published;
  const term = search.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (section === 'all' || (section === 'hidden' ? !i.active : i.category === section)) &&
      (!term || (i.name + ' ' + i.description).toLowerCase().includes(term)),
  );
  const sections = (M?.categories ?? [])
    .map((c) => ({
      title: c,
      dishes: shown.filter((i) => i.category === c).sort((a, b) => a.menuOrder - b.menuOrder),
    }))
    .filter((s) => s.dishes.length);
  const stray = shown.filter((i) => !M?.categories.includes(i.category));
  if (stray.length) sections.push({ title: 'Not in a menu section', dishes: stray });

  async function publish() {
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      await call('menuPublish', {}, menuPublishSchema);
      await qc.refetchQueries({ queryKey: ['staff-menu', session.token] });
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'auth') signOut(err.message);
      else setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  const status = !M
    ? ''
    : unpublished
      ? 'You have changes that are not on the website yet. Publish to update it.'
      : M.published && q.dataUpdatedAt - M.published < 3 * 60000
        ? 'Published ' + when(M.published) + '. The website shows it within about two minutes.'
        : M.published
          ? 'The website shows this menu. Last published ' + when(M.published) + '.'
          : 'The website shows this menu.';

  return (
    <>
      <header className="staff__top">
        <div className="staff__serif staff__brand">
          Hearth &amp; Bean<small>Menu</small>
        </div>
        <ViewSwitch view={props.view} setView={props.setView} />
        <button
          type="button"
          className="staff__btn"
          onClick={() => M && setEditing({ item: null })}
          disabled={!M}
        >
          Add dish
        </button>
        <button
          type="button"
          className="staff__btn staff__btn--primary"
          onClick={publish}
          disabled={!M || publishing || !M.canPublish || missing.length > 0}
          title={
            !M?.canPublish
              ? 'Publishing is not set up: the Settings tab needs "menuBuildHook".'
              : missing.length
                ? 'Every shown dish needs a photo first.'
                : undefined
          }
        >
          {publishing ? 'Publishing…' : 'Publish menu'}
        </button>
        <div className="staff__who">
          <span>{session.name}</span>
          <button type="button" className="staff__btn staff__btn--small" onClick={() => signOut('')}>
            Sign out
          </button>
        </div>
      </header>
      <div className="staff__body">
        {error && (
          <div className="staff__alert" role="alert">
            {error}
          </div>
        )}
        {!M ? (
          <p className="staff__empty">{q.isFetching ? 'Opening the menu…' : 'Nothing loaded yet.'}</p>
        ) : (
          <>
            <div className="staff__dayline">
              <h1 className="staff__serif staff__dayname">Menu</h1>
              <span className={'staff__fresh' + (unpublished ? ' staff__fresh--due' : '')} role="status">
                {q.isFetching ? 'Updating…' : (notice ? notice + ' ' : '') + status}
              </span>
            </div>
            {missing.length > 0 && (
              <div className="staff__alert" role="alert">
                {missing.length === 1 ? '1 dish has' : missing.length + ' dishes have'} no photo:{' '}
                {missing.map((i) => i.name).join(', ')}. Add a photo or hide the dish before publishing.
              </div>
            )}
            <div className="staff__menu-tools">
              <div className="staff__filters" role="group" aria-label="Show">
                {(
                  [
                    ['all', 'All (' + items.length + ')'],
                    ...M.categories.map((c): [string, string] => [c, c]),
                    ['hidden', 'Hidden (' + items.filter((i) => !i.active).length + ')'],
                  ] as [string, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={'staff__chip' + (section === k ? ' is-on' : '')}
                    aria-pressed={section === k}
                    onClick={() => setSection(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                className="staff__input staff__search"
                type="search"
                placeholder="Find a dish"
                aria-label="Find a dish"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {!sections.length && <p className="staff__empty">No dishes match.</p>}
            {sections.map((s) => (
              <section key={s.title} className="staff__menu-section" aria-label={s.title}>
                <h2 className="staff__serif staff__panel-title">
                  {s.title} <span className="staff__count">{s.dishes.length}</span>
                </h2>
                <div className="staff__dishes">
                  {s.dishes.map((i) => (
                    <DishCard key={i.row} item={i} call={call} onOpen={() => setEditing({ item: i })} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
      {editing && M && (
        <DishDialog
          M={M}
          item={editing.item}
          call={call}
          close={() => setEditing(null)}
          signOut={signOut}
          changed={(message) => {
            // the sheet was edited by hand meanwhile: show the menu as it is now
            setEditing(null);
            setNotice('');
            setError(message);
            qc.refetchQueries({ queryKey: ['staff-menu', session.token] });
          }}
          saved={(it, isNew) => {
            setEditing(null);
            setError('');
            setNotice(it.name + (isNew ? ' added.' : ' saved.'));
            qc.refetchQueries({ queryKey: ['staff-menu', session.token] });
          }}
        />
      )}
    </>
  );
}

/* ---------------- one dish ---------------- */

function DishCard({ item, call, onOpen }: { item: MenuItem; call: Call; onOpen: () => void }) {
  return (
    <button
      type="button"
      className={'staff__dish' + (item.active ? '' : ' is-hidden')}
      onClick={onOpen}
      aria-label={'Edit ' + item.name}
    >
      <DishPhoto photo={item.photo} call={call} />
      <span className="staff__dish-head">
        <span className="staff__dish-name">{item.name}</span>
        <span className="staff__dish-price">{item.price}</span>
      </span>
      {item.description && <span className="staff__dish-text">{item.description}</span>}
      <span className="staff__tags">
        {!item.active && <span className="staff__tag staff__tag--off">Hidden</span>}
        {item.homeGroup && <span className="staff__tag">Home page: {item.homeGroup}</span>}
        {!item.photo && <span className="staff__tag staff__tag--off">No photo</span>}
      </span>
    </button>
  );
}

/**
 * A dish photo. Photos already on the website are shown from there (the build writes an index of them); a photo
 * uploaded since the last publish is fetched from the sheet's Drive folder once it scrolls into view.
 */
function DishPhoto({ photo, call, src }: { photo: MenuPhoto | null; call: Call; src?: string }) {
  const index = useQuery({
    queryKey: ['menu-photo-index'],
    queryFn: async (): Promise<Record<string, string>> => {
      try {
        const r = await fetch('/images/menu/index.json', { cache: 'no-store' });
        return r.ok ? z.record(z.string(), z.string()).parse(await r.json()) : {};
      } catch {
        return {};
      }
    },
    staleTime: Infinity,
  });
  const box = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setSeen(true), {
      rootMargin: '300px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  const built = photo && index.data ? index.data[photo.id + ':' + photo.updated] : undefined;
  const fetched = useQuery({
    queryKey: ['menu-photo', photo?.id, photo?.updated],
    queryFn: async () => {
      const p = await call('menuPhoto', { id: photo!.id }, menuPhotoDataSchema);
      return `data:${p.type};base64,${p.data}`;
    },
    enabled: !src && !!photo && index.isSuccess && !built && seen,
    staleTime: Infinity,
    retry: 1,
  });
  const url = src || built || fetched.data;
  return (
    <span ref={box} className="staff__dish-media">
      {url ? (
        <img src={url} alt="" loading="lazy" className="staff__dish-img" />
      ) : (
        <span className="staff__dish-ph">
          {!photo ? 'No photo' : fetched.isError ? 'Photo could not load' : 'Loading photo…'}
        </span>
      )}
    </span>
  );
}

/* ---------------- add / edit window ---------------- */

const dishFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Please give the dish a name.').max(80, 'Please keep the name shorter.'),
    price: z
      .string()
      .trim()
      .regex(/^£?\d{1,4}(\.\d{1,2})?$/, 'Please write the price like £4.50.'),
    category: z.string().min(1, 'Please choose a menu section.'),
    menuOrder: z.coerce
      .number()
      .int('Please give the position as a whole number.')
      .min(1, 'Please give the position in its section (1 or more).')
      .max(999),
    description: z.string().trim().max(300, 'Please keep the description under 300 characters.'),
    homeGroup: z.string(),
    homeOrder: z.coerce.number().int().min(0).max(99),
    active: z.boolean(),
  })
  .refine((f) => !f.homeGroup || f.homeOrder >= 1, {
    message: 'Please give the home page position (1 or more).',
    path: ['homeOrder'],
  });

/** Big photos are scaled down in the browser before upload: 1600 pixels on the long side, as JPEG. */
async function preparePhoto(file: File): Promise<{ type: string; data: string; size: number }> {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error('Please use a JPG, PNG, WebP or AVIF photo.');
  let blob: Blob = file;
  let type = file.type;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('This photo could not be opened. Please try a JPG or PNG.');
  const long = Math.max(bmp.width, bmp.height);
  if (long < 400) throw new Error('This photo is too small. Please use one at least 800 pixels wide.');
  if (file.size > 1.5 * 1024 * 1024 || long > 2000) {
    const k = Math.min(1, 1600 / long);
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    blob = await new Promise<Blob>((ok, no) =>
      c.toBlob((b) => (b ? ok(b) : no(new Error('This photo could not be resized.'))), 'image/jpeg', 0.86),
    );
    type = 'image/jpeg';
  }
  bmp.close();
  if (blob.size > MAX_UPLOAD) throw new Error('This photo is larger than 4 MB. Please use a smaller one.');
  const data = await new Promise<string>((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => no(new Error('This photo could not be read.'));
    r.readAsDataURL(blob);
  });
  return { type, data, size: blob.size };
}

function DishDialog(props: {
  M: MenuAdmin;
  item: MenuItem | null;
  call: Call;
  close: () => void;
  signOut: (m: string) => void;
  changed: (message: string) => void;
  saved: (it: MenuItem, isNew: boolean) => void;
}) {
  const { M, item } = props;
  const isNew = !item;
  const nextOrder = (cat: string) =>
    M.items.filter((i) => i.category === cat).reduce((m, i) => Math.max(m, i.menuOrder), 0) + 1;
  const [f, setF] = useState(() =>
    item
      ? {
          name: item.name,
          price: item.price,
          category: item.category,
          menuOrder: String(item.menuOrder || 1),
          description: item.description,
          homeGroup: item.homeGroup,
          homeOrder: item.homeOrder ? String(item.homeOrder) : '',
          active: item.active,
        }
      : {
          name: '',
          price: '',
          category: M.categories[0] || '',
          menuOrder: String(nextOrder(M.categories[0] || '')),
          description: '',
          homeGroup: '',
          homeOrder: '',
          active: true,
        },
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState('');
  const dlg = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = dlg.current!;
    if (d.showModal) d.showModal();
    else d.setAttribute('open', '');
    nameRef.current?.focus();
    return () => {
      try {
        d.close();
      } catch {
        /* already closed */
      }
    };
  }, []);
  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setPreview(u); // eslint-disable-line react-hooks/set-state-in-effect -- the preview follows the chosen file
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF((x) => ({ ...x, [k]: e.target.value }));

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] || null;
    e.target.value = '';
    if (!chosen) return;
    if (!PHOTO_TYPES.includes(chosen.type)) {
      setErr('Please use a JPG, PNG, WebP or AVIF photo.');
      return;
    }
    setErr('');
    setFile(chosen);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const r = dishFormSchema.safeParse({ ...f, homeOrder: f.homeOrder || '0' });
    if (!r.success) {
      setErr(r.error.issues[0].message);
      return;
    }
    if (isNew && !file) {
      setErr('Please choose a photo for the new dish.');
      return;
    }
    setErr('');
    try {
      const photo = file ? await prepareOrSay(file) : null;
      if (file && !photo) return;
      setSaving('Saving…');
      const v = r.data;
      const res = await props.call(
        'menuSave',
        {
          ...(item ? { row: item.row, was: item.name } : {}),
          name: v.name,
          price: v.price,
          category: v.category,
          menuOrder: v.menuOrder,
          description: v.description,
          homeGroup: v.homeGroup,
          homeOrder: v.homeGroup ? v.homeOrder : '',
          active: v.active,
        },
        menuItemResultSchema,
      );
      let saved = res.item;
      if (photo) {
        setSaving('Uploading the photo…');
        saved = (
          await props.call(
            'menuUpload',
            { row: saved.row, was: saved.name, type: photo.type, data: photo.data },
            menuItemResultSchema,
          )
        ).item;
      }
      props.saved(saved, isNew);
    } catch (e2) {
      setSaving('');
      const er = e2 as ApiError;
      if (er.code === 'auth') {
        props.close();
        props.signOut(er.message);
      } else if (er.code === 'changed') props.changed(er.message);
      else setErr(er.message);
    }
  }
  async function prepareOrSay(chosen: File) {
    try {
      setSaving('Preparing the photo…');
      return await preparePhoto(chosen);
    } catch (e) {
      setSaving('');
      setErr((e as Error).message);
      return null;
    }
  }

  const field = (label: string, input: React.ReactNode, cls = '') => (
    <label className={'staff__field' + (cls ? ' ' + cls : '')}>
      {label}
      {input}
    </label>
  );
  return (
    <dialog
      ref={dlg}
      className="staff__dialog staff__dialog--wide"
      aria-label={isNew ? 'Add a dish' : 'Edit ' + item!.name}
      onCancel={(e) => {
        if (saving) e.preventDefault();
        else props.close();
      }}
    >
      <form className="staff__dialog-form" noValidate onSubmit={submit}>
        <h2 className="staff__serif staff__dialog-title">{isNew ? 'Add a dish' : 'Edit dish'}</h2>
        <div className="staff__dish-form">
          <div className="staff__photo-pick">
            <DishPhoto photo={item?.photo ?? null} call={props.call} src={preview || undefined} />
            <input
              ref={fileRef}
              type="file"
              accept={PHOTO_TYPES.join(',')}
              hidden
              onChange={pick}
              aria-label="Choose a photo"
            />
            <button
              type="button"
              className="staff__btn staff__btn--small"
              onClick={() => fileRef.current?.click()}
              disabled={!!saving}
            >
              {file || item?.photo ? 'Change photo' : 'Choose photo'}
            </button>
            <p className="staff__hint-s">
              {file
                ? 'New photo: ' + file.name + '. It is saved when you press Save.'
                : 'JPG, PNG, WebP or AVIF. Large photos are made smaller for the website.'}
            </p>
          </div>
          <div className="staff__dish-fields">
            {field(
              'Name',
              <input
                ref={nameRef}
                className="staff__input"
                value={f.name}
                onChange={set('name')}
                maxLength={80}
              />,
            )}
            <div className="staff__grid2">
              {field(
                'Price',
                <input
                  className="staff__input"
                  value={f.price}
                  onChange={set('price')}
                  inputMode="decimal"
                  placeholder="£4.50"
                />,
              )}
              {field(
                'Position in section',
                <input
                  className="staff__input"
                  type="number"
                  min={1}
                  max={999}
                  value={f.menuOrder}
                  onChange={set('menuOrder')}
                />,
              )}
            </div>
            {field(
              'Menu section',
              <select
                className="staff__input"
                value={f.category}
                onChange={(e) => {
                  const c = e.target.value;
                  setF((x) => ({ ...x, category: c, ...(isNew ? { menuOrder: String(nextOrder(c)) } : {}) }));
                }}
              >
                {M.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'Description',
              <textarea
                className="staff__input staff__input--plain"
                rows={3}
                maxLength={300}
                value={f.description}
                onChange={set('description')}
              />,
            )}
            <div className="staff__grid2">
              {field(
                'On the home page',
                <select className="staff__input" value={f.homeGroup} onChange={set('homeGroup')}>
                  <option value="">Not shown there</option>
                  {M.homeGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>,
              )}
              {f.homeGroup &&
                field(
                  'Home page position',
                  <input
                    className="staff__input"
                    type="number"
                    min={1}
                    max={99}
                    value={f.homeOrder}
                    onChange={set('homeOrder')}
                  />,
                )}
            </div>
            <label className="staff__check">
              <input
                type="checkbox"
                checked={f.active}
                onChange={(e) => setF((x) => ({ ...x, active: e.target.checked }))}
              />
              Show this dish on the website
            </label>
          </div>
        </div>
        <p className="staff__error" role="alert">
          {err}
        </p>
        <div className="staff__dialog-foot">
          <span className="staff__saving" role="status">
            {saving}
          </span>
          <button type="button" className="staff__btn" onClick={props.close} disabled={!!saving}>
            Cancel
          </button>
          <button type="submit" className="staff__btn staff__btn--primary" disabled={!!saving}>
            {isNew ? 'Add dish' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
