/**
 * Talking to the booking backend: the Google Apps Script web app bound to the bookings Google Sheet
 * (google-apps-script/Code.gs). Every call is one POST with a JSON body sent as plain text, so the browser
 * makes a single simple request (no CORS preflight, which Apps Script does not answer).
 * Answers are checked with Zod before the page uses them.
 */
import { z } from 'zod';

/** Address of the web app. Empty: online booking is off and the form stays in preview. */
export const BOOKING_API = process.env.NEXT_PUBLIC_BOOKING_API_URL || '';

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = '') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/* ---------------- what the sheet answers ---------------- */

const text = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => (v == null ? '' : String(v)));
const int = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v : parseInt(v, 10) || 0));

export const slotSchema = z.object({ time: z.string(), state: z.string() });
export type Slot = z.infer<typeof slotSchema>;

/** Area, smallest party, largest party, for every table in use. */
export const seatingSchema = z.array(z.tuple([z.string(), int, int]));
export type Seating = z.infer<typeof seatingSchema>;

export const availabilitySchema = z.object({
  date: z.string(),
  guests: int,
  closed: z.boolean(),
  slots: z.array(slotSchema),
  seating: seatingSchema.optional(),
});
export type Availability = z.infer<typeof availabilitySchema>;

export const bookResultSchema = z.object({
  ref: text,
  status: text,
  date: text,
  time: text,
  guests: z.union([z.number(), z.string()]).optional(),
  emailed: z.boolean().optional(),
});
export type BookResult = z.infer<typeof bookResultSchema>;

export const loginSchema = z.object({ token: z.string(), name: text, expires: z.number() });
export type Login = z.infer<typeof loginSchema>;

export const STATUSES = [
  'pending',
  'confirmed',
  'seated',
  'finished',
  'noshow',
  'declined',
  'cancelled',
] as const;
export type Status = (typeof STATUSES)[number];

export const bookingSchema = z.object({
  id: text,
  ref: text,
  created: text,
  date: z.string(),
  time: z.string(),
  guests: int,
  duration: int,
  name: text,
  email: text,
  phone: text,
  notes: text,
  seat: text,
  table: text,
  status: text,
  source: text,
  updated: text,
  updatedBy: text,
});
export type Booking = z.infer<typeof bookingSchema>;

export const tableSchema = z.object({
  id: text,
  zone: text,
  min: int,
  max: int,
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  shape: text,
  order: z.number().optional(),
});
export type Table = z.infer<typeof tableSchema>;

const hoursSchema = z.object({
  closed: z.boolean(),
  first: z.string().optional(),
  last: z.string().optional(),
});

export const daySchema = z.object({
  date: z.string(),
  today: z.string(),
  nowMin: z.number(),
  staff: text,
  bookings: z.array(bookingSchema),
  requests: z.array(bookingSchema),
  summary: z.object({
    bookings: z.number(),
    covers: z.number(),
    pending: z.number(),
    confirmed: z.number(),
    seated: z.number(),
    finished: z.number(),
    noshow: z.number(),
    cancelled: z.number(),
    declined: z.number(),
  }),
  tables: z.array(tableSchema),
  zones: z.array(z.string()).optional(),
  hours: hoursSchema,
  settings: z.object({
    slotMinutes: z.number(),
    durationSmall: z.number(),
    durationLarge: z.number(),
    maxGuests: z.number(),
    name: text,
  }),
});
export type Day = z.infer<typeof daySchema>;

export const bookingResultSchema = z.object({ booking: bookingSchema });

/* ---------------- the call ---------------- */

const envelopeSchema = z.object({
  ok: z.boolean(),
  error: z.object({ code: text, message: text }).partial().optional(),
});

interface CallOptions {
  /** Shown when the sheet cannot be reached at all. */
  offline: string;
  timeoutMs: number;
}

/** Sends one request to the web app and returns the checked answer. Throws ApiError. */
export async function callApi<T>(
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
  opts: CallOptions,
): Promise<T> {
  if (!BOOKING_API) throw new ApiError('The booking sheet is not connected to this page yet.', 'off');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs);
  let raw: unknown;
  try {
    const res = await fetch(BOOKING_API, {
      method: 'POST',
      body: JSON.stringify(body),
      signal: ctl.signal,
      redirect: 'follow',
    });
    raw = await res.json();
  } catch {
    throw new ApiError(opts.offline, 'network');
  } finally {
    clearTimeout(timer);
  }
  const env = envelopeSchema.safeParse(raw);
  if (!env.success || !env.data.ok) {
    const err = env.success ? env.data.error : undefined;
    throw new ApiError(err?.message || 'Something went wrong. Please try again.', err?.code || '');
  }
  const data = schema.safeParse(raw);
  if (!data.success)
    throw new ApiError('The booking sheet sent an answer this page does not understand.', 'shape');
  return data.data;
}
