type Page = 'home' | 'menu' | 'about';

const LINKS: { page: Page; href: string; label: string }[] = [
  { page: 'home', href: '/', label: 'Home' },
  { page: 'menu', href: '/menu', label: 'Menu' },
  { page: 'about', href: '/about', label: 'About' },
];

/** Top bar of the Menu and About pages. */
export default function SubNav({ current }: { current: Page }) {
  return (
    <header className="subnav">
      <a href="/" aria-label="Hearth & Bean, back to the front page" className="nav__logo hb-inline-block">
        <img
          src="/images/hb-logo-colour.webp"
          loading="lazy"
          alt=""
          className="nav__logo-image nav__logo-image--light"
        />
      </a>
      <nav aria-label="Main" className="nav__links">
        {LINKS.map((l) =>
          l.page === current ? (
            <a
              key={l.page}
              href={l.href}
              aria-current="page"
              className="nav__link nav__link--current is-current"
            >
              {l.label}
            </a>
          ) : (
            <a key={l.page} href={l.href} className="nav__link">
              {l.label}
            </a>
          ),
        )}
        <a href="/#reserve" className="nav__cta">
          Reserve
        </a>
      </nav>
    </header>
  );
}
