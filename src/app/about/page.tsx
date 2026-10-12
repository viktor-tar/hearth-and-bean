import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import SubNav from '@/components/site/SubNav';
import SubFooter from '@/components/site/SubFooter';
import AboutContent from '@/components/about/AboutContent';

export const metadata: Metadata = {
  title: { absolute: 'About | Hearth & Bean, Walcot Street, Bath' },
  description:
    'Our story, opening hours and how to find Hearth & Bean, a restaurant with a wood-fired kitchen on Walcot Street in Bath.',
  ...(SITE_URL ? { alternates: { canonical: '/about' } } : {}),
};

export default function AboutPage() {
  return (
    <div className="page">
      <a href="#about-content" className="skip-link">
        Skip to the content
      </a>
      <SubNav current="about" />
      <AboutContent />
      <SubFooter current="about" />
    </div>
  );
}
