export default function Hero() {
  return (
    <section id="top" data-nav="light" className="hero">
      <div data-hb="hero-stage" className="hero__stage">
        <h1 className="hero__type hero__type--ink">
          <span className="hero__line hero__line--first">Slow mornings,</span>{' '}
          <span className="hero__line hero__line--second">long evenings.</span>
        </h1>
        <div className="hero__meta">
          <p className="hero__meta-text">
            A restaurant, a roastery and a bakery under one roof. Cooking by the fire since 2015.
          </p>
          <div className="hero__cue">
            <div className="hero__cue-line">
              <div className="hero__cue-dot" />
            </div>
            <div className="hero__cue-label">Scroll to open the room</div>
          </div>
        </div>
        <div data-hb="hero-aperture" className="hero__aperture">
          <img
            className="hero__poster"
            src="/images/hb-film-001.webp"
            alt="The Hearth & Bean dining room at night, candles on the tables and the fire burning"
            sizes="(max-width: 1650px) 100vw, 1650px"
            loading="eager"
            fetchPriority="high"
            srcSet="/images/hb-film-001-p-500.webp 500w, /images/hb-film-001-p-800.webp 800w, /images/hb-film-001-p-1080.webp 1080w, /images/hb-film-001-p-1600.webp 1600w, /images/hb-film-001.webp 1650w"
          />
          <div
            data-hb="hero-film"
            aria-label="Film of the dining room at night: candlelit tables, lights in the windows, the fire burning"
            role="img"
            className="hero__film"
          />
          <div data-hb="hero-scrim" className="hero__scrim" />
          <div aria-hidden="true" className="hero__type hero__type--cream">
            <div className="hero__line hero__line--first">Slow mornings,</div>
            <div className="hero__line hero__line--second">long evenings.</div>
          </div>
          <div data-hb="hero-act" className="hero__act">
            <p className="display hero__statement">
              <span className="line-mask">The fire is lit before</span>{' '}
              <span className="line-mask">the doors open, and it stays lit</span>{' '}
              <span className="line-mask">until the last table leaves.</span>
            </p>
            <div className="hero__actions">
              <a href="#reserve" className="button button--cream w-inline-block">
                <div className="button__label">Reserve a table</div>
                <div className="button__icon button__icon--roast">
                  <svg
                    aria-hidden="true"
                    strokeWidth="1.6"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="button__arrow"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </a>
              <a href="#menu" className="text-link">
                See what's on the menu
              </a>
            </div>
          </div>
          <div data-hb="hero-progress" className="hero__progress" />
        </div>
      </div>
    </section>
  );
}
