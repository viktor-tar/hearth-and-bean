import { z } from 'zod';

/** The guest's details on the booking form, checked in the order the fields appear. Same rules as Code.gs. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Add your name so we know who to expect.'),
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Add an email address so we can confirm your table.'),
  phone: z
    .string()
    .trim()
    .refine(
      (p) => p.replace(/\D/g, '').length >= 7 && !/[^+()\d\s.\-]/.test(p),
      'Add a phone number in case we need to reach you on the day.',
    ),
  notes: z.string().trim(),
});
export type Contact = z.infer<typeof contactSchema>;
export type ContactField = keyof Contact;

/** The first problem with the details, or the cleaned details. */
export function checkContact(
  input: Record<ContactField, string>,
): { ok: true; data: Contact } | { ok: false; field: ContactField; message: string } {
  const r = contactSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const order: ContactField[] = ['name', 'email', 'phone', 'notes'];
  const first = [...r.error.issues].sort(
    (a, b) => order.indexOf(a.path[0] as ContactField) - order.indexOf(b.path[0] as ContactField),
  )[0];
  return { ok: false, field: first.path[0] as ContactField, message: first.message };
}
