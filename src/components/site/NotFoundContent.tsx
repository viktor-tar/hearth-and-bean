export default function NotFoundContent() {
  return (
    <main className="notfound">
      <div className="container">
        <a
          href="/"
          aria-label="Hearth & Bean, back to the front page"
          className="notfound__logo w-inline-block"
        >
          <img src="/images/hb-logo-colour.webp" loading="lazy" alt="" className="notfound__logo-image" />
        </a>
        <div className="notfound__body">
          <div>
            <div className="notfound__code">Page not found</div>
            <h1 className="display notfound__title">This table is not on the floor plan.</h1>
            <p className="notfound__text">
              The page you were after has moved or never existed. The front door is still open.
            </p>
            <a href="/" className="button button--ink w-inline-block">
              <div className="button__label">Back to the front door</div>
              <div className="button__icon button__icon--cream">
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
          </div>
          <figure className="arch notfound__figure">
            <img
              src="/images/coffee-cup-on-wooden-table.avif"
              loading="lazy"
              alt="A leather armchair by the fire at Hearth & Bean, with a coffee on the table beside it"
              className="notfound__image"
            />
          </figure>
        </div>
      </div>
    </main>
  );
}
