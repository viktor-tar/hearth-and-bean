export default function Nav() {
  return (
    <nav data-hb="nav" aria-label="Main" className="nav">
      <a href="#top" aria-label="Hearth & Bean, back to the top" className="nav__logo w-inline-block">
        <img
          src="/images/hb-logo-colour.webp"
          loading="eager"
          sizes="(max-width: 900px) 100vw, 900px"
          srcSet="/images/hb-logo-colour-p-500.webp 500w, /images/hb-logo-colour-p-800.webp 800w, /images/hb-logo-colour.webp 900w"
          alt=""
          className="nav__logo-image nav__logo-image--light"
        />
        <img
          src="/images/hb-logo-cream.webp"
          loading="eager"
          sizes="(max-width: 900px) 100vw, 900px"
          srcSet="/images/hb-logo-cream-p-500.webp 500w, /images/hb-logo-cream-p-800.webp 800w, /images/hb-logo-cream.webp 900w"
          alt=""
          className="nav__logo-image nav__logo-image--dark"
        />
      </a>
      <div className="nav__links">
        <div className="nav__now">
          <div className="nav__now-dot" />
          <div data-hb="nav-now" className="nav__now-text" />
        </div>
        <a href="#day" className="nav__link">
          The day
        </a>
        <a href="/menu" className="nav__link">
          Menu
        </a>
        <a href="#people" className="nav__link">
          People
        </a>
        <a href="/about" className="nav__link">
          About
        </a>
        <a href="#reserve" className="nav__cta">
          Reserve
        </a>
      </div>
    </nav>
  );
}
