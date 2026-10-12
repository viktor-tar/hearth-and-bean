import type { NextConfig } from 'next';

/**
 * The site is exported as plain static files (the `out/` folder after `npm run build`),
 * so it can be dragged onto Netlify or built there from GitHub. The booking backend is
 * the Google Apps Script web app, called straight from the browser.
 */
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
