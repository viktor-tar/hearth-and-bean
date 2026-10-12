import type { Metadata } from 'next';
import Skip from '@/components/home/Skip';
import Loader from '@/components/home/Loader';
import Cursor from '@/components/home/Cursor';
import Nav from '@/components/home/Nav';
import Hero from '@/components/home/Hero';
import Manifesto from '@/components/home/Manifesto';
import Day from '@/components/home/Day';
import Marquee from '@/components/home/Marquee';
import Menu from '@/components/home/Menu';
import Pan from '@/components/home/Pan';
import People from '@/components/home/People';
import Reserve from '@/components/home/Reserve';
import Footer from '@/components/home/Footer';
import HomeMotionMode from '@/features/home/HomeMotionMode';
import HomeMotion from '@/features/home/HomeMotion';
import LocalBusiness from '@/components/LocalBusiness';
import { SITE_URL } from '@/lib/site';
import '@/styles/home-landscape.css';

const title = 'Hearth & Bean | Restaurant, roastery and bakery in Bath';
const description =
  'Hearth & Bean is a neighbourhood restaurant, roastery and bakery on Walcot Street, Bath. Coffee roasted in the room, bread from the wood oven and supper by the fire, since 2015.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  ...(SITE_URL ? { alternates: { canonical: '/' } } : {}),
  openGraph: {
    title,
    description,
    type: 'website',
    ...(SITE_URL ? { url: '/', images: ['/images/hb-social-share.jpg'] } : {}),
  },
  twitter: { card: 'summary_large_image', title, description },
};

export default function HomePage() {
  return (
    // "body" carries the home page's base type and colour
    <div className="body">
      <HomeMotionMode />
      <div className="page">
        <Skip />
        <Loader />
        <Cursor />
        <Nav />
        <main className="main">
          <Hero />
          <Manifesto />
          <Day />
          <Marquee />
          <Menu />
          <Pan />
          <People />
          <Reserve />
        </main>
        <Footer />
      </div>
      <LocalBusiness />
      <HomeMotion />
    </div>
  );
}
