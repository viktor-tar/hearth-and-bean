import BookingForm from '@/features/booking/BookingForm';

export default function Reserve() {
  return (
    <section id="reserve" data-sheet="1" data-nav="dark" className="reserve">
      <div className="container">
        <div className="grid reserve__grid">
          <BookingForm />
          <div className="reserve__side">
            <figure data-par="-7" className="arch reserve__door">
              <img
                src="/images/cafe-storefront-at-dusk.avif"
                loading="lazy"
                sizes="(max-width: 1376px) 100vw, 1376px"
                srcSet="/images/cafe-storefront-at-dusk-p-500.avif 500w, /images/cafe-storefront-at-dusk-p-800.avif 800w, /images/cafe-storefront-at-dusk-p-1080.avif 1080w, /images/cafe-storefront-at-dusk.avif 1376w"
                alt="The Hearth & Bean shopfront at dusk, lantern lit and windows glowing"
                className="reserve__door-image"
              />
            </figure>
            <figure data-par="10" className="reserve__glass">
              <img
                src="/images/logo-etched-on-glass-door.avif"
                loading="lazy"
                sizes="(max-width: 1376px) 100vw, 1376px"
                srcSet="/images/logo-etched-on-glass-door-p-500.avif 500w, /images/logo-etched-on-glass-door-p-800.avif 800w, /images/logo-etched-on-glass-door-p-1080.avif 1080w, /images/logo-etched-on-glass-door.avif 1376w"
                alt="The name etched on the glass of the front door"
                className="reserve__glass-image"
              />
            </figure>
          </div>
          <p className="reserve__note">
            <strong className="reserve__note-title">Coffee needs no booking.</strong>Walk in whenever the door
            is open. Look for the copper lantern and our name etched on the glass.
          </p>
        </div>
      </div>
    </section>
  );
}
