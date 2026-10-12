import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import SubNav from '@/components/site/SubNav';
import SubFooter from '@/components/site/SubFooter';
import MenuContent from '@/components/menu/MenuContent';
import MenuTabs from '@/features/menu/MenuTabs';
import '@/styles/menu-page.css';

const title = 'Menu | Hearth & Bean';
const description =
  'The full Hearth & Bean menu: coffee and espresso, tea and specialty drinks, hearth-baked breads and pastries, mains and sandwiches, snacks and boards.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  ...(SITE_URL ? { alternates: { canonical: '/menu' } } : {}),
  openGraph: { title, description, ...(SITE_URL ? { url: '/menu' } : {}) },
  twitter: { card: 'summary_large_image', title, description },
};

export default function MenuPage() {
  return (
    <div className="page">
      <a href="#menu-list" className="skip-link">
        Skip to the menu
      </a>
      <SubNav current="menu" />
      <MenuContent />
      <SubFooter current="menu" />
      <MenuTabs />
    </div>
  );
}
