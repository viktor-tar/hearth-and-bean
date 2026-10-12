import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The pages keep plain links on purpose: every page is a full load, as on the original site,
      // so the scroll animations always start from a clean page.
      '@next/next/no-html-link-for-pages': 'off',
      // Images are pre-sized static files with srcset; next/image would change the markup.
      '@next/next/no-img-element': 'off',
      // copy is written with plain apostrophes, as on the original site
      'react/no-unescaped-entities': 'off',
    },
  },
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'google-apps-script/**', 'next-env.d.ts'] },
];

export default config;
