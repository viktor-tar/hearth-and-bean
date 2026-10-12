export default function Footer() {
  return (
    <footer data-hb="footer" data-nav="dark" className="footer">
      <div data-hb="footer-inner" className="footer__inner">
        <div className="footer__top">
          <img
            src="/images/hb-logo-cream.webp"
            loading="lazy"
            sizes="(max-width: 900px) 100vw, 900px"
            srcSet="/images/hb-logo-cream-p-500.webp 500w, /images/hb-logo-cream-p-800.webp 800w, /images/hb-logo-cream.webp 900w"
            alt="Hearth & Bean"
            className="footer__logo"
          />
          <div className="footer__now">
            <div data-hb="footer-clock" className="footer__clock">
              --:--
            </div>
            <div data-hb="footer-now" className="footer__now-text" />
          </div>
        </div>
        <div data-hb="footer-arch" className="arch footer__arch">
          <img
            src="/images/hb-night-room.webp"
            loading="lazy"
            sizes="(max-width: 1672px) 100vw, 1672px"
            srcSet="/images/hb-night-room-p-500.webp 500w, /images/hb-night-room-p-800.webp 800w, /images/hb-night-room-p-1080.webp 1080w, /images/hb-night-room-p-1600.webp 1600w, /images/hb-night-room.webp 1672w"
            alt=""
            className="footer__image"
          />
          <div className="footer__arch-shade" />
        </div>
        <p data-hb="footer-statement" className="display footer__statement">
          <span className="line-mask footer__statement-mask">The fire's lit.</span>
        </p>
        <div className="grid footer__cols">
          <nav aria-label="Footer" className="footer__nav">
            <a href="#day" className="footer__link">
              The day
            </a>
            <a href="#menu" className="footer__link">
              The menu
            </a>
            <a href="#pan" className="footer__link">
              The pan
            </a>
            <a href="#people" className="footer__link">
              The people
            </a>
            <a href="/about" className="footer__link">
              About us
            </a>
          </nav>
          <a href="#reserve" data-hb="footer-cta" className="footer__cta hb-inline-block">
            <div className="footer__cta-label">
              <div className="footer__cta-line">Reserve</div>
              <div className="footer__cta-line">a table</div>
            </div>
          </a>
          <div className="footer__visit">
            <address className="footer__contact">
              <span>The Old Ironworks, Walcot Street</span>
              <span>Bath BA1 5BG</span>
              <a href="tel:+441632960418" className="footer__contact-link">
                01632 960 418
              </a>
              <span>hello@hearthandbean.co.uk</span>
              <a href="/about#visit" className="footer__contact-link">
                Opening hours and directions
              </a>
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
        </div>
        <div className="footer__base">
          <div className="footer__copyright">
            {'© 2026 Hearth '}&{' Bean'}
          </div>
          <a href="/staff" className="footer__staff">
            Staff Portal
          </a>
          <a href="#top" className="footer__top-link hb-inline-block">
            <div className="footer__top-label">Back to the top</div>
            <svg
              aria-hidden="true"
              strokeWidth="1.6"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
              className="footer__top-icon"
            >
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
