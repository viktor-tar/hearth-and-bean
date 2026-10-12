import type { Metadata, Viewport } from 'next';
import { SITE_URL } from '@/lib/site';
import Providers from './providers';
import '@/styles/fonts.css';
import '@/styles/webflow.css';
import '@/styles/global.css';

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: 'Hearth & Bean',
  openGraph: { type: 'website', ...(SITE_URL ? { images: ['/images/hb-social-share.jpg'] } : {}) },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The home page adds state classes to <html> before the first paint (see HomeMotionMode).
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/gloock-latin-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/instrument-sans-latin-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
