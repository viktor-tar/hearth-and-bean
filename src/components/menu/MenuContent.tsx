import { categories } from '@/data/menu';
import MenuSections from './MenuSections';

export default function MenuContent() {
  return (
    <main id="top" className="fullmenu">
      <section className="fullmenu__hero">
        <div className="container">
          <div className="fullmenu__hero-grid">
            <div>
              <div className="fullmenu__kicker">
                {'Hearth '}&{' Bean'}
              </div>
              <h1 className="display fullmenu__title">The full menu</h1>
              <p className="fullmenu__lead">
                Small plates, mains from the wood fire and puddings, with breakfast, coffee roasted in the
                room and tea all day.
              </p>
            </div>
            <figure className="arch fullmenu__figure">
              <img
                src="/images/artisanal-sandwiches-and-coffee.avif"
                loading="lazy"
                alt="Sandwiches, pastries and an iced coffee on the counter at Hearth & Bean"
                className="fullmenu__figure-image"
              />
            </figure>
          </div>
        </div>
      </section>
      <nav aria-label="Menu sections" data-hb="menu-tabs" className="fullmenu__tabs">
        <div className="fullmenu__tabs-inner">
          {categories.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="fullmenu__tab">
              {c.title}
            </a>
          ))}
        </div>
      </nav>
      <MenuSections />
      <section data-sheet="1" className="fullmenu__close">
        <div className="container">
          <h2 className="display fullmenu__close-title">Found something for the table?</h2>
          <div className="fullmenu__close-actions">
            <a href="/#reserve" className="button button--cream w-inline-block">
              <div className="button__label">Reserve a table</div>
              <div className="button__icon button__icon--roast">
                <svg
                  aria-hidden="true"
                  strokeWidth="1.6"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="button__arrow button__arrow"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </a>
            <a href="/" className="text-link">
              Back to the front page
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
