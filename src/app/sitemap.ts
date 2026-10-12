import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  // without a known address the sitemap lists paths only (search engines need the full address: set NEXT_PUBLIC_SITE_URL)
  return ['/', '/menu', '/about'].map((p) => ({
    url: SITE_URL + (p === '/' && SITE_URL ? '' : p),
    changeFrequency: 'monthly',
  }));
}
