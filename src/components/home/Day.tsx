export default function Day() {
  return (
    <section id="day" data-nav="light" className="day">
      <div data-hb="day-stage" className="day__stage">
        <div className="day__head">
          <h2 className="display day__title">One day at the hearth</h2>
        </div>
        <div className="day__skybox">
          <div data-hb="day-sky" aria-hidden="true" className="day__sky">
            <div className="day__haze" />
            <div className="day__stars">
              <div className="w-embed">
                <svg
                  viewBox="0 0 100 130"
                  preserveAspectRatio="xMidYMid slice"
                  aria-hidden="true"
                  focusable="false"
                >
                  <g fill="#F6EEDC">
                    <circle cx="16" cy="14" r="0.55" />
                    <circle cx="34" cy="8" r="0.4" />
                    <circle cx="80" cy="17" r="0.55" />
                    <circle cx="22" cy="35" r="0.4" />
                    <circle cx="87" cy="40" r="0.7" />
                    <circle cx="12" cy="55" r="0.55" />
                    <circle cx="68" cy="56" r="0.4" />
                    <circle cx="41" cy="66" r="0.4" />
                    <circle cx="89" cy="70" r="0.55" />
                    <circle cx="55" cy="24" r="0.35" />
                    <circle cx="8" cy="82" r="0.4" />
                    <circle cx="73" cy="88" r="0.5" />
                    <circle cx="30" cy="96" r="0.45" />
                    <circle cx="94" cy="104" r="0.4" />
                    <circle cx="50" cy="112" r="0.35" />
                    <circle cx="18" cy="120" r="0.5" />
                  </g>
                </svg>
              </div>
            </div>
            <div className="day__sun">
              <div className="w-embed">
                <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false">
                  <defs>
                    <radialGradient id="hb-sun-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0" stopColor="#F7C663" stopOpacity=".62" />
                      <stop offset=".45" stopColor="#F3B95A" stopOpacity=".26" />
                      <stop offset="1" stopColor="#F3B95A" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="hb-sun-disc" cx="38%" cy="34%" r="75%">
                      <stop offset="0" stopColor="#FCE9B4" />
                      <stop offset=".55" stopColor="#F2BC57" />
                      <stop offset="1" stopColor="#DD9530" />
                    </radialGradient>
                  </defs>
                  <circle cx="120" cy="120" r="120" fill="url(#hb-sun-glow)" />
                  <g stroke="#D9962E" strokeLinecap="round">
                    <line x1="120.0" y1="56.0" x2="120.0" y2="28.0" strokeWidth="3.2" />
                    <line x1="144.5" y1="60.9" x2="150.6" y2="46.1" strokeWidth="2.2" />
                    <line x1="165.3" y1="74.7" x2="185.1" y2="54.9" strokeWidth="3.2" />
                    <line x1="179.1" y1="95.5" x2="193.9" y2="89.4" strokeWidth="2.2" />
                    <line x1="184.0" y1="120.0" x2="212.0" y2="120.0" strokeWidth="3.2" />
                    <line x1="179.1" y1="144.5" x2="193.9" y2="150.6" strokeWidth="2.2" />
                    <line x1="165.3" y1="165.3" x2="185.1" y2="185.1" strokeWidth="3.2" />
                    <line x1="144.5" y1="179.1" x2="150.6" y2="193.9" strokeWidth="2.2" />
                    <line x1="120.0" y1="184.0" x2="120.0" y2="212.0" strokeWidth="3.2" />
                    <line x1="95.5" y1="179.1" x2="89.4" y2="193.9" strokeWidth="2.2" />
                    <line x1="74.7" y1="165.3" x2="54.9" y2="185.1" strokeWidth="3.2" />
                    <line x1="60.9" y1="144.5" x2="46.1" y2="150.6" strokeWidth="2.2" />
                    <line x1="56.0" y1="120.0" x2="28.0" y2="120.0" strokeWidth="3.2" />
                    <line x1="60.9" y1="95.5" x2="46.1" y2="89.4" strokeWidth="2.2" />
                    <line x1="74.7" y1="74.7" x2="54.9" y2="54.9" strokeWidth="3.2" />
                    <line x1="95.5" y1="60.9" x2="89.4" y2="46.1" strokeWidth="2.2" />
                  </g>
                  <circle cx="120" cy="120" r="52" fill="url(#hb-sun-disc)" />
                  <circle
                    cx="120"
                    cy="120"
                    r="51"
                    fill="none"
                    stroke="#C98222"
                    strokeOpacity=".55"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
            <div className="day__moon">
              <div className="w-embed">
                <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false">
                  <defs>
                    <radialGradient id="hb-moon-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0" stopColor="#F6EEDC" stopOpacity=".42" />
                      <stop offset=".5" stopColor="#F6EEDC" stopOpacity=".14" />
                      <stop offset="1" stopColor="#F6EEDC" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="hb-moon-disc" cx="36%" cy="32%" r="80%">
                      <stop offset="0" stopColor="#FFFBF0" />
                      <stop offset=".6" stopColor="#EDE3CC" />
                      <stop offset="1" stopColor="#CDBF9F" />
                    </radialGradient>
                  </defs>
                  <circle cx="120" cy="120" r="120" fill="url(#hb-moon-glow)" />
                  <circle cx="120" cy="120" r="52" fill="url(#hb-moon-disc)" />
                  <path d="M120 68a52 52 0 0 1 0 104a66 66 0 0 0 0-104z" fill="#8C7B5E" fillOpacity=".3" />
                  <g fill="#B9AB8C">
                    <circle cx="100" cy="100" r="9" fillOpacity=".45" />
                    <circle cx="127" cy="131" r="12" fillOpacity=".38" />
                    <circle cx="96" cy="140" r="5.5" fillOpacity=".42" />
                    <circle cx="134" cy="96" r="4.5" fillOpacity=".36" />
                    <circle cx="112" cy="156" r="3.5" fillOpacity=".4" />
                  </g>
                  <circle
                    cx="120"
                    cy="120"
                    r="51"
                    fill="none"
                    stroke="#B7A988"
                    strokeOpacity=".6"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
            <div className="day__hill" />
          </div>
        </div>
        <ol role="list" className="day__list">
          <li className="day__chapter">
            <h3 className="display day__word">
              <span className="day__word-inner">Dawn</span>
            </h3>
            <p className="day__copy">
              The fire goes in first. By the time the street wakes up, the sourdough is already cooling on the
              rack.
            </p>
            <figure className="day__photo">
              <img
                src="/images/sourdough-loaves-on-cooling-rack.avif"
                loading="lazy"
                sizes="(max-width: 479px) 92vw, (max-width: 767px) 95vw, (max-width: 991px) 96vw, 300px"
                srcSet="/images/sourdough-loaves-on-cooling-rack-p-500.avif 500w, /images/sourdough-loaves-on-cooling-rack-p-800.avif 800w, /images/sourdough-loaves-on-cooling-rack-p-1080.avif 1080w, /images/sourdough-loaves-on-cooling-rack.avif 1376w"
                alt="Sourdough loaves cooling in front of the wood-fired oven"
                className="day__image day__image--dawn"
              />
            </figure>
          </li>
          <li className="day__chapter">
            <h3 className="display day__word">
              <span className="day__word-inner">Morning</span>
            </h3>
            <p className="day__copy">
              First pour. Beans roasted a few steps from the bar, ground to order, and a croissant if you are
              quick.
            </p>
            <figure className="day__photo">
              <img
                src="/images/barista-tamping-espresso-grounds.avif"
                loading="lazy"
                sizes="(max-width: 479px) 92vw, (max-width: 767px) 95vw, (max-width: 991px) 96vw, 300px"
                srcSet="/images/barista-tamping-espresso-grounds-p-500.avif 500w, /images/barista-tamping-espresso-grounds-p-800.avif 800w, /images/barista-tamping-espresso-grounds-p-1080.avif 1080w, /images/barista-tamping-espresso-grounds.avif 1376w"
                alt="A barista tamping espresso beside the copper machine"
                className="day__image day__image--morning"
              />
            </figure>
          </li>
          <li className="day__chapter">
            <h3 className="display day__word">
              <span className="day__word-inner">Noon</span>
            </h3>
            <p className="day__copy">
              The kitchen takes over. Sandwiches on our own bread, soup, and a pan that goes straight from the
              fire to your table.
            </p>
            <figure className="day__photo">
              <img
                src="/images/artisanal-sandwiches-and-coffee.avif"
                loading="lazy"
                sizes="(max-width: 479px) 92vw, (max-width: 767px) 95vw, (max-width: 991px) 96vw, 300px"
                srcSet="/images/artisanal-sandwiches-and-coffee-p-500.avif 500w, /images/artisanal-sandwiches-and-coffee-p-800.avif 800w, /images/artisanal-sandwiches-and-coffee-p-1080.avif 1080w, /images/artisanal-sandwiches-and-coffee.avif 1376w"
                alt="Sandwiches, pastries and an iced coffee on the counter"
                className="day__image day__image--noon"
              />
            </figure>
          </li>
          <li className="day__chapter">
            <h3 className="display day__word">
              <span className="day__word-inner">Afternoon</span>
            </h3>
            <p className="day__copy">
              The slow hours. A second coffee, something sweet, a table by the window and nowhere to be.
            </p>
            <figure className="day__photo">
              <img
                src="/images/friends-talking-over-coffee.avif"
                loading="lazy"
                sizes="(max-width: 479px) 92vw, (max-width: 767px) 95vw, (max-width: 991px) 96vw, 300px"
                srcSet="/images/friends-talking-over-coffee-p-500.avif 500w, /images/friends-talking-over-coffee-p-800.avif 800w, /images/friends-talking-over-coffee-p-1080.avif 1080w, /images/friends-talking-over-coffee.avif 1376w"
                alt="Two friends laughing over coffee at a window table"
                className="day__image day__image--afternoon"
              />
            </figure>
          </li>
          <li className="day__chapter">
            <h3 className="display day__word">
              <span className="day__word-inner">Dusk</span>
            </h3>
            <p className="day__copy">
              The lamps come on. The door stays open and the whole room turns the colour of copper.
            </p>
            <figure className="day__photo">
              <img
                src="/images/cafe-storefront-at-dusk.avif"
                loading="lazy"
                sizes="(max-width: 479px) 92vw, (max-width: 767px) 95vw, (max-width: 991px) 96vw, 300px"
                srcSet="/images/cafe-storefront-at-dusk-p-500.avif 500w, /images/cafe-storefront-at-dusk-p-800.avif 800w, /images/cafe-storefront-at-dusk-p-1080.avif 1080w, /images/cafe-storefront-at-dusk.avif 1376w"
                alt="The shopfront glowing at dusk"
                className="day__image day__image--dusk"
              />
            </figure>
          </li>
          <li className="day__chapter">
            <h3 className="display day__word">
              <span className="day__word-inner">Night</span>
            </h3>
            <p className="day__copy">
              Candles, a shared board, the last of the fire. Stay as long as it is burning.
            </p>
            <figure className="day__photo">
              <img
                src="/images/coffee-cup-on-wooden-table.avif"
                loading="lazy"
                sizes="(max-width: 479px) 92vw, (max-width: 767px) 95vw, (max-width: 991px) 96vw, 300px"
                srcSet="/images/coffee-cup-on-wooden-table-p-500.avif 500w, /images/coffee-cup-on-wooden-table-p-800.avif 800w, /images/coffee-cup-on-wooden-table-p-1080.avif 1080w, /images/coffee-cup-on-wooden-table.avif 1376w"
                alt="Reading on the leather sofa beside the fireplace"
                className="day__image day__image--night"
              />
            </figure>
          </li>
        </ol>
        <div className="day__foot">
          <div role="group" aria-label="Jump to a time of day" className="day__steps">
            <button data-go="0" type="button" className="day__step">
              Dawn
            </button>
            <button data-go="1" type="button" className="day__step">
              Morning
            </button>
            <button data-go="2" type="button" className="day__step">
              Noon
            </button>
            <button data-go="3" type="button" className="day__step">
              Afternoon
            </button>
            <button data-go="4" type="button" className="day__step">
              Dusk
            </button>
            <button data-go="5" type="button" className="day__step">
              Night
            </button>
          </div>
          <p data-hb="day-count" className="day__count">
            1 of 6
          </p>
        </div>
      </div>
    </section>
  );
}
