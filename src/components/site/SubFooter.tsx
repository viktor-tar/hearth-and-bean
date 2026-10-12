type Page = 'home' | 'menu' | 'about';

const LINKS: { page: Page; href: string; label: string }[] = [
  { page: 'home', href: '/', label: 'Home' },
  { page: 'menu', href: '/menu', label: 'Menu' },
  { page: 'about', href: '/about', label: 'About' },
];

/** Footer of the Menu and About pages. */
export default function SubFooter({ current }: { current: Page }) {
  return (
    <footer className="subfooter">
      <div className="subfooter__top">
        <a
          href="/"
          aria-label="Hearth & Bean, back to the front page"
          className="subfooter__logo w-inline-block"
        >
          <img src="/images/hb-logo-cream.webp" loading="lazy" alt="" className="footer__logo" />
        </a>
        <nav aria-label="Footer" className="subfooter__links">
          {LINKS.map((l) =>
            l.page === current ? (
              <a key={l.page} href={l.href} aria-current="page" className="subfooter__link w--current">
                {l.label}
              </a>
            ) : (
              <a key={l.page} href={l.href} className="subfooter__link">
                {l.label}
              </a>
            ),
          )}
          <a href="/#reserve" className="subfooter__link">
            Reserve
          </a>
        </nav>
      </div>
      <div className="subfooter__contact">
        <address className="subfooter__contact-items">
          <span>The Old Ironworks, Walcot Street, Bath BA1 5BG</span>
          <a href="tel:+441632960418" className="footer__contact-link">
            01632 960 418
          </a>
          <span>hello@hearthandbean.co.uk</span>
        </address>
        <div className="footer__socials">
          <span title="Instagram" aria-label="Instagram" className="footer__social">
            <svg
              aria-hidden="true"
              strokeWidth="1.6"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
              className="footer__social-icon footer__social-icon"
            >
              <rect rx="5" height="17" width="17" y="3.5" x="3.5" />
              <circle r="4" cy="12" cx="12" />
              <circle stroke="none" fill="currentColor" r="0.9" cy="6.7" cx="17.3" />
            </svg>
          </span>
          <span title="Facebook" aria-label="Facebook" className="footer__social">
            <svg
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="footer__social-icon footer__social-icon"
            >
              <path d="M13.4 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.7v3h2.6V21h3.1z" />
            </svg>
          </span>
          <span title="TikTok" aria-label="TikTok" className="footer__social">
            <svg
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="footer__social-icon footer__social-icon"
            >
              <path d="M16.6 3h-3v12.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.5a5.8 5.8 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.2 1.3V7.4a4.3 4.3 0 0 1-4.2-4.4z" />
            </svg>
          </span>
        </div>
      </div>
      <div className="footer__base">
        <div className="footer__copyright">© 2026 Hearth &amp; Bean</div>
        <a href="#top" className="footer__top-link w-inline-block">
          <div className="footer__top-label">Back to the top</div>
          <svg
            aria-hidden="true"
            strokeWidth="1.6"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 24 24"
            className="footer__top-icon footer__top-icon"
          >
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
