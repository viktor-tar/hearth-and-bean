export default function Pan() {
  return (
    <section id="pan" data-nav="dark" className="pan">
      <div className="container">
        <div className="grid pan__grid">
          <div data-hb="pan-disc" className="pan__disc">
            <div data-hb="pan-inner" className="pan__inner">
              <img
                src="/images/hearth-baked-shakshuka-in-tomato.avif"
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 1024px"
                srcSet="/images/hearth-baked-shakshuka-in-tomato-p-500.avif 500w, /images/hearth-baked-shakshuka-in-tomato-p-800.avif 800w, /images/hearth-baked-shakshuka-in-tomato.avif 1024w"
                alt="Shakshuka in a cast-iron pan: two eggs in tomato and pepper sauce with herbs and feta, toast beside it"
                className="pan__image"
              />
              <button aria-label="Eggs" data-i="0" type="button" className="pan__hotspot pan__hotspot--eggs">
                <span className="pan__hotspot-dot" />
                <span className="pan__hotspot-ring" />
              </button>
              <button
                aria-label="Tomato and peppers"
                data-i="1"
                type="button"
                className="pan__hotspot pan__hotspot--sauce"
              >
                <span className="pan__hotspot-dot" />
                <span className="pan__hotspot-ring" />
              </button>
              <button
                aria-label="Herbs and feta"
                data-i="2"
                type="button"
                className="pan__hotspot pan__hotspot--herbs"
              >
                <span className="pan__hotspot-dot" />
                <span className="pan__hotspot-ring" />
              </button>
              <button
                aria-label="The pan"
                data-i="3"
                type="button"
                className="pan__hotspot pan__hotspot--iron"
              >
                <span className="pan__hotspot-dot" />
                <span className="pan__hotspot-ring" />
              </button>
              <button
                aria-label="Toast"
                data-i="4"
                type="button"
                className="pan__hotspot pan__hotspot--toast"
              >
                <span className="pan__hotspot-dot" />
                <span className="pan__hotspot-ring" />
              </button>
            </div>
          </div>
          <div className="pan__side">
            <h2 className="display pan__title">What's in the pan</h2>
            <p className="pan__lead">
              Our shakshuka goes into the oven in the pan it is served in. Point at any part of it.
            </p>
            <ul data-hb="pan-list" role="list" className="pan__list">
              <li className="pan__item">
                <button data-i="0" type="button" className="pan__row">
                  <span className="pan__row-name">Two eggs</span>
                  <span className="pan__row-where">the middle</span>
                  <span className="pan__row-detail">
                    Cracked in at the end and left just long enough for the whites to set.
                  </span>
                </button>
              </li>
              <li className="pan__item">
                <button data-i="1" type="button" className="pan__row">
                  <span className="pan__row-name">Tomato and peppers</span>
                  <span className="pan__row-where">the base</span>
                  <span className="pan__row-detail">
                    Cooked down slowly until it is closer to jam than sauce.
                  </span>
                </button>
              </li>
              <li className="pan__item">
                <button data-i="2" type="button" className="pan__row">
                  <span className="pan__row-name">Herbs and feta</span>
                  <span className="pan__row-where">the finish</span>
                  <span className="pan__row-detail">
                    Parsley, crumbled feta and a pinch of chilli, added at the pass.
                  </span>
                </button>
              </li>
              <li className="pan__item">
                <button data-i="3" type="button" className="pan__row">
                  <span className="pan__row-name">Cast iron</span>
                  <span className="pan__row-where">the pan</span>
                  <span className="pan__row-detail">
                    It holds the heat of the fire all the way to your table. Mind the handle.
                  </span>
                </button>
              </li>
              <li className="pan__item">
                <button data-i="4" type="button" className="pan__row">
                  <span className="pan__row-name">Sourdough toast</span>
                  <span className="pan__row-where">on the side</span>
                  <span className="pan__row-detail">
                    From this morning's loaf, with olive oil. It is there to clean the pan.
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
