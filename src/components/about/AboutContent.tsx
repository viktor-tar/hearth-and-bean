export default function AboutContent() {
  return (
    <main id="top" className="about">
      <section className="about__hero">
        <div className="container">
          <div className="about__hero-grid">
            <div>
              <div className="about__kicker">About Hearth & Bean</div>
              <h1 className="display about__title">A fire, a roaster and a long table on Walcot Street.</h1>
              <p className="about__lead">
                A restaurant, roastery and bakery in Bath since 2015. Coffee in the morning, bread from the
                wood oven at noon, and supper by the fire after dark.
              </p>
            </div>
            <figure className="arch about__hero-figure">
              <img
                src="/images/hb-night-room.webp"
                loading="lazy"
                alt="Guests at candlelit tables beside the open fire at Hearth & Bean in the evening"
                className="about__image about__image--hero"
              />
            </figure>
          </div>
        </div>
      </section>
      <section id="about-content" className="about__story">
        <div className="container">
          <div className="about__story-grid">
            <div>
              <div className="about__kicker">Our story</div>
              <h2 className="display about__heading">It started with a fireplace behind a wall.</h2>
            </div>
            <div className="about__story-body">
              <p className="about__text">
                Hearth & Bean opened in the spring of 2015 in a narrow Georgian building at the top of Walcot
                Street, Bath's artisan quarter. The old cast-iron fireplace was already there, bricked up
                behind a plasterboard wall. We opened it up on the first day, and it has been lit every
                morning since.
              </p>
              <p className="about__text">
                The roaster arrived a year later. Today we roast small batches a few steps from the bar, bake
                our bread in the wood oven from dawn, and cook the evening menu over the same fire. Most of
                what we serve is made within a few metres of where you sit.
              </p>
              <p className="about__text">
                We are small enough to know the regulars by their order, and big enough for a birthday at the
                long table. Come in for a coffee, stay for lunch, or book a table by the fire for the evening.
              </p>
            </div>
          </div>
          <div className="about__gallery">
            <figure className="about__photo about__photo--wide">
              <img
                src="/images/cafe-storefront-at-dusk.avif"
                loading="lazy"
                alt="The Hearth & Bean shopfront on Walcot Street at dusk"
                className="about__image"
              />
            </figure>
            <figure className="arch about__photo about__photo--tall">
              <img
                src="/images/barista-tamping-espresso-grounds.avif"
                loading="lazy"
                alt="A barista tamping espresso at the bar"
                className="about__image"
              />
            </figure>
            <figure className="about__photo about__photo--square">
              <img
                src="/images/sourdough-loaves-on-cooling-rack.avif"
                loading="lazy"
                alt="Sourdough loaves from the wood oven cooling on a rack"
                className="about__image"
              />
            </figure>
          </div>
        </div>
      </section>
      <section id="visit" className="about__visit">
        <div className="container">
          <div className="about__visit-grid">
            <div>
              <div className="about__kicker">Opening hours</div>
              <h2 className="display about__heading">Open every day.</h2>
              <dl className="about__table about__table">
                <div className="about__row">
                  <dt className="about__row-label about__row-label">Monday to Wednesday</dt>
                  <dd className="about__row-value about__row-value">08:00 – 22:00</dd>
                </div>
                <div className="about__row">
                  <dt className="about__row-label about__row-label">Thursday</dt>
                  <dd className="about__row-value about__row-value">08:00 – 22:30</dd>
                </div>
                <div className="about__row">
                  <dt className="about__row-label about__row-label">Friday</dt>
                  <dd className="about__row-value about__row-value">08:00 – 23:00</dd>
                </div>
                <div className="about__row">
                  <dt className="about__row-label about__row-label">Saturday</dt>
                  <dd className="about__row-value about__row-value">08:30 – 23:00</dd>
                </div>
                <div className="about__row">
                  <dt className="about__row-label about__row-label">Sunday and bank holidays</dt>
                  <dd className="about__row-value about__row-value">08:30 – 21:00</dd>
                </div>
              </dl>
              <p className="about__note">
                Coffee, pastries and breakfast from opening, no booking needed. Tables for lunch and dinner
                can be booked from 12:00 on weekdays and from 09:00 at weekends. The last table is at 20:30
                Monday to Wednesday, 21:00 on Thursday, 21:30 on Friday and Saturday, and 19:30 on Sunday.
              </p>
            </div>
            <div>
              <div className="about__kicker">How to find us</div>
              <h2 className="display about__heading">At the top of Walcot Street.</h2>
              <dl className="about__table about__table">
                <div className="about__item">
                  <dt className="about__item-label about__item-label">On foot</dt>
                  <dd className="about__item-text about__item-text">
                    About fifteen minutes from Bath Spa station and the bus station. Walk up through the city
                    centre and follow Northgate Street into Walcot Street.
                  </dd>
                </div>
                <div className="about__item">
                  <dt className="about__item-label about__item-label">By car</dt>
                  <dd className="about__item-text about__item-text">
                    The Podium car park on Walcot Street is two minutes away. On busy days the Park & Ride
                    from Lansdown, Newbridge or Odd Down is the easier choice.
                  </dd>
                </div>
                <div className="about__item">
                  <dt className="about__item-label about__item-label">By bike</dt>
                  <dd className="about__item-text about__item-text">Bike stands right outside the door.</dd>
                </div>
                <div className="about__item">
                  <dt className="about__item-label about__item-label">Access</dt>
                  <dd className="about__item-text about__item-text">
                    Step-free entrance from the street and an accessible toilet on the ground floor. Dogs on a
                    lead are welcome in the front room.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
      <section id="contact" data-sheet="1" className="about__contact">
        <div className="container">
          <div className="about__contact-grid">
            <div>
              <div className="about__kicker about__kicker--light">Visit and contact</div>
              <h2 className="display about__contact-title">Come in from the cold.</h2>
              <address className="about__address">
                Hearth & Bean
                <br />
                The Old Ironworks, Walcot Street
                <br />
                Bath BA1 5BG
              </address>
              <dl className="about__lines about__lines">
                <div className="about__line">
                  <dt className="about__line-label about__line-label">Phone</dt>
                  <dd className="about__line-value about__line-value">
                    <a href="tel:+441632960418" className="about__line-link">
                      01632 960 418
                    </a>
                  </dd>
                </div>
                <div className="about__line">
                  <dt className="about__line-label about__line-label">Mobile</dt>
                  <dd className="about__line-value about__line-value">
                    <a href="tel:+447700900418" className="about__line-link">
                      07700 900 418
                    </a>
                    <span className="about__line-hint">Groups and events</span>
                  </dd>
                </div>
                <div className="about__line">
                  <dt className="about__line-label about__line-label">Email</dt>
                  <dd className="about__line-value about__line-value">hello@hearthandbean.co.uk</dd>
                </div>
                <div className="about__line">
                  <dt className="about__line-label about__line-label">Follow</dt>
                  <dd className="about__line-value about__line-value">
                    <div className="about__socials">
                      <span title="Instagram" aria-label="Instagram" className="about__social">
                        <svg
                          aria-hidden="true"
                          strokeWidth="1.6"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 24 24"
                          className="about__social-icon about__social-icon"
                        >
                          <rect rx="5" height="17" width="17" y="3.5" x="3.5" />
                          <circle r="4" cy="12" cx="12" />
                          <circle stroke="none" fill="currentColor" r="0.9" cy="6.7" cx="17.3" />
                        </svg>
                      </span>
                      <span title="Facebook" aria-label="Facebook" className="about__social">
                        <svg
                          aria-hidden="true"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          className="about__social-icon about__social-icon"
                        >
                          <path d="M13.4 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.7v3h2.6V21h3.1z" />
                        </svg>
                      </span>
                      <span title="TikTok" aria-label="TikTok" className="about__social">
                        <svg
                          aria-hidden="true"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          className="about__social-icon about__social-icon"
                        >
                          <path d="M16.6 3h-3v12.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.5a5.8 5.8 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.2 1.3V7.4a4.3 4.3 0 0 1-4.2-4.4z" />
                        </svg>
                      </span>
                      <span className="about__social-handle">@hearthandbeanbath</span>
                    </div>
                  </dd>
                </div>
              </dl>
              <div className="about__actions">
                <a href="/#reserve" className="button button--cream hb-inline-block">
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
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Walcot+Street,+Bath+BA1+5BG"
                  rel="noopener"
                  className="text-link about__directions"
                >
                  Get directions
                </a>
              </div>
            </div>
            <div id="map" className="about__map">
              <div className="hb-embed">
                <iframe
                  className="about__map-frame"
                  title="Map: Hearth & Bean, Walcot Street, Bath"
                  src="https://maps.google.com/maps?q=Walcot+Street,+Bath+BA1+5BG&z=16&hl=en&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    left: '0',
                    right: '0',
                    top: '-90px',
                    width: '100%',
                    height: 'calc(100% + 90px)',
                    border: '0',
                    filter: 'grayscale(.3) sepia(.22) contrast(.96)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
