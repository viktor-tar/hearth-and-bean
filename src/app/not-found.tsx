import type { Metadata } from 'next';
import NotFoundContent from '@/components/site/NotFoundContent';

const title = 'Page not found | Hearth & Bean';
const description = 'This page could not be found. Head back to the Hearth & Bean front page.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  robots: { index: false },
  openGraph: { title, description },
  twitter: { card: 'summary_large_image', title, description },
};

export default function NotFound() {
  return (
    <div className="page">
      <NotFoundContent />
    </div>
  );
}
