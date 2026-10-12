import type { Metadata } from 'next';
import StaffPortal from '@/features/staff/StaffPortal';
import '@/styles/staff.css';

export const metadata: Metadata = {
  title: { absolute: 'Staff | Hearth & Bean' },
  description: 'Sign-in page for Hearth & Bean staff.',
  // a staff tool has no business in search results
  robots: { index: false, follow: false },
};

export default function StaffPage() {
  return (
    <main data-hb="staff-app" className="staff">
      <StaffPortal />
    </main>
  );
}
