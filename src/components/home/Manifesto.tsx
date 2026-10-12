export default function Manifesto() {
  return (
    <section id="house" data-sheet="1" data-nav="light" className="manifesto">
      <div className="container">
        <div data-hb="manifesto-text" className="display manifesto__text">
          We roast our coffee in the room you drink it in.
          <img
            src="/images/pouring-hot-water-for-coffee.avif"
            loading="lazy"
            sizes="(max-width: 1376px) 100vw, 1376px"
            srcSet="/images/pouring-hot-water-for-coffee-p-500.avif 500w, /images/pouring-hot-water-for-coffee-p-800.avif 800w, /images/pouring-hot-water-for-coffee-p-1080.avif 1080w, /images/pouring-hot-water-for-coffee.avif 1376w"
            alt=""
            className="manifesto__chip"
          />
          We bake our bread in a wood fire that is lit before the doors open.
          <img
            src="/images/sourdough-loaves-on-cooling-rack.avif"
            loading="lazy"
            sizes="(max-width: 1376px) 100vw, 1376px"
            srcSet="/images/sourdough-loaves-on-cooling-rack-p-500.avif 500w, /images/sourdough-loaves-on-cooling-rack-p-800.avif 800w, /images/sourdough-loaves-on-cooling-rack-p-1080.avif 1080w, /images/sourdough-loaves-on-cooling-rack.avif 1376w"
            alt=""
            className="manifesto__chip"
          />
          Mornings here run on the bean. Evenings run on the hearth.
          <img
            src="/images/coffee-cup-on-wooden-table.avif"
            loading="lazy"
            sizes="(max-width: 1376px) 100vw, 1376px"
            srcSet="/images/coffee-cup-on-wooden-table-p-500.avif 500w, /images/coffee-cup-on-wooden-table-p-800.avif 800w, /images/coffee-cup-on-wooden-table-p-1080.avif 1080w, /images/coffee-cup-on-wooden-table.avif 1376w"
            alt=""
            className="manifesto__chip manifesto__chip--fire"
          />
        </div>
        <div className="grid manifesto__grid">
          <div className="manifesto__note">
            <p className="manifesto__note-text">
              {'Hearth '}&
              {
                ' Bean is a neighbourhood room with a roaster at one end and an oven at the other. Come for a coffee, stay for lunch, come back when the candles are out.'
              }
            </p>
            <a href="#day" className="text-link manifesto__link">
              Follow one day here
            </a>
            <div data-hb="numbers" className="numbers">
              <div className="numbers__row">
                <div className="numbers__value">
                  <div data-n="2015" data-from="1990" className="numbers__figure">
                    2015
                  </div>
                </div>
                <p className="numbers__text">Established</p>
              </div>
              <div className="numbers__row">
                <div className="numbers__value">
                  <div data-n="50" data-from="0" className="numbers__figure">
                    50
                  </div>
                  <div className="numbers__unit">K</div>
                  <div className="numbers__plus">+</div>
                </div>
                <p className="numbers__text">Happy guests served</p>
              </div>
              <div className="numbers__row">
                <div className="numbers__value">
                  <div className="numbers__unit">4.</div>
                  <div data-n="9" data-from="0" className="numbers__figure">
                    9
                  </div>
                  <div className="numbers__unit">★</div>
                </div>
                <p className="numbers__text">Average guest rating</p>
              </div>
              <div className="numbers__row">
                <div className="numbers__value">
                  <div data-n="20" data-from="0" className="numbers__figure">
                    20
                  </div>
                  <div className="numbers__plus">+</div>
                </div>
                <p className="numbers__text">Signature dishes</p>
              </div>
              <div className="numbers__row">
                <div className="numbers__value">
                  <div data-n="15" data-from="0" className="numbers__figure">
                    15
                  </div>
                  <div className="numbers__plus">+</div>
                </div>
                <p className="numbers__text">Culinary awards</p>
              </div>
              <div className="numbers__row">
                <div className="numbers__value">
                  <div data-n="500" data-from="0" className="numbers__figure">
                    500
                  </div>
                  <div className="numbers__plus">+</div>
                </div>
                <p className="numbers__text">Events hosted</p>
              </div>
            </div>
          </div>
          <figure data-par="-9" className="manifesto__figure manifesto__figure--tall">
            <img
              src="/images/pouring-hot-water-for-coffee.avif"
              loading="lazy"
              sizes="(max-width: 1376px) 100vw, 1376px"
              srcSet="/images/pouring-hot-water-for-coffee-p-500.avif 500w, /images/pouring-hot-water-for-coffee-p-800.avif 800w, /images/pouring-hot-water-for-coffee-p-1080.avif 1080w, /images/pouring-hot-water-for-coffee.avif 1376w"
              alt="Hot water poured from a copper kettle over a pour-over dripper"
              className="manifesto__image manifesto__image--pour"
            />
          </figure>
          <figure data-par="14" className="manifesto__figure manifesto__figure--wide">
            <img
              src="/images/latte-and-croissant-on-table.avif"
              loading="lazy"
              sizes="(max-width: 1376px) 100vw, 1376px"
              srcSet="/images/latte-and-croissant-on-table-p-500.avif 500w, /images/latte-and-croissant-on-table-p-800.avif 800w, /images/latte-and-croissant-on-table-p-1080.avif 1080w, /images/latte-and-croissant-on-table.avif 1376w"
              alt="A latte and a croissant on an oak table"
              className="manifesto__image"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
