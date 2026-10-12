/** Site-wide settings. Values that differ per deploy come from environment variables (see .env.example). */

/**
 * Public address of the site (for social previews, the canonical link and the sitemap).
 * Netlify sets URL on its own builds; for a build on your computer set NEXT_PUBLIC_SITE_URL.
 * Empty when unknown: the pages then simply leave those absolute links out.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || '').replace(/\/$/, '');

export const SITE_NAME = 'Hearth & Bean';
