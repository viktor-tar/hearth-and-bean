export default function Marquee() {
  return (
    <section data-hb="marquee" data-nav="dark" aria-label="Coffee, eat, gather" className="marquee">
      <div aria-hidden="true" className="marquee__row marquee__row--solid">
        <div className="marquee__unit">
          <div className="marquee__word">Coffee</div>
          <img
            src="/images/flat-white-on-wooden-table.avif"
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 1024px"
            srcSet="/images/flat-white-on-wooden-table-p-500.avif 500w, /images/flat-white-on-wooden-table-p-800.avif 800w, /images/flat-white-on-wooden-table.avif 1024w"
            alt=""
            className="marquee__chip"
          />
          <div className="marquee__word">Eat</div>
          <img
            src="/images/smoked-salmon-toast.avif"
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 1024px"
            srcSet="/images/smoked-salmon-toast-p-500.avif 500w, /images/smoked-salmon-toast-p-800.avif 800w, /images/smoked-salmon-toast.avif 1024w"
            alt=""
            className="marquee__chip"
          />
          <div className="marquee__word">Gather</div>
          <img
            src="/images/friends-talking-over-coffee.avif"
            loading="lazy"
            sizes="(max-width: 1376px) 100vw, 1376px"
            srcSet="/images/friends-talking-over-coffee-p-500.avif 500w, /images/friends-talking-over-coffee-p-800.avif 800w, /images/friends-talking-over-coffee-p-1080.avif 1080w, /images/friends-talking-over-coffee.avif 1376w"
            alt=""
            className="marquee__chip"
          />
        </div>
      </div>
      <div aria-hidden="true" className="marquee__row marquee__row--outline">
        <div className="marquee__unit">
          <div className="marquee__word">Roasted in the room</div>
          <div className="marquee__slash">/</div>
          <div className="marquee__word">Baked in the fire</div>
          <div className="marquee__slash">/</div>
          <div className="marquee__word">Poured since 2015</div>
          <div className="marquee__slash">/</div>
        </div>
      </div>
    </section>
  );
}
