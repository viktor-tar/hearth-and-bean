export default function People() {
  return (
    <section id="people" data-nav="light" data-sheet="1" className="people">
      <div className="container">
        <div className="grid people__head">
          <h2 className="display people__title">Who you'll meet</h2>
          <p className="people__intro">
            The room is small enough that you will see the same faces twice. Drag to meet them.
          </p>
        </div>
      </div>
      <div data-hb="people-view" data-cursor="Drag" className="people__view">
        <div data-hb="people-track" className="people__track">
          <article className="person">
            <div className="person__media">
              <img
                src="/images/cafe-manager-standing-in-cafe.avif"
                loading="lazy"
                sizes="(max-width: 1376px) 100vw, 1376px"
                srcSet="/images/cafe-manager-standing-in-cafe-p-500.avif 500w, /images/cafe-manager-standing-in-cafe-p-800.avif 800w, /images/cafe-manager-standing-in-cafe-p-1080.avif 1080w, /images/cafe-manager-standing-in-cafe.avif 1376w"
                alt="The restaurant manager standing by the window"
                className="person__image person__image--manager"
              />
            </div>
            <h3 className="person__role">Runs the room</h3>
            <p className="person__text">Knows most regulars by their order.</p>
          </article>
          <article className="person">
            <div className="person__media">
              <img
                src="/images/cafe-staff-member-standing-2.avif"
                loading="lazy"
                sizes="(max-width: 1376px) 100vw, 1376px"
                srcSet="/images/cafe-staff-member-standing-2-p-500.avif 500w, /images/cafe-staff-member-standing-2-p-800.avif 800w, /images/cafe-staff-member-standing-2-p-1080.avif 1080w, /images/cafe-staff-member-standing-2.avif 1376w"
                alt="A barista in a Hearth & Bean apron"
                className="person__image"
              />
            </div>
            <h3 className="person__role">Pulls the shots</h3>
            <p className="person__text">Has the grinder dialled in before you ask.</p>
          </article>
          <article className="person">
            <div className="person__media">
              <img
                src="/images/cafe-staff-member-standing.avif"
                loading="lazy"
                sizes="(max-width: 1376px) 100vw, 1376px"
                srcSet="/images/cafe-staff-member-standing-p-500.avif 500w, /images/cafe-staff-member-standing-p-800.avif 800w, /images/cafe-staff-member-standing-p-1080.avif 1080w, /images/cafe-staff-member-standing.avif 1376w"
                alt="A team member in a Hearth & Bean apron"
                className="person__image"
              />
            </div>
            <h3 className="person__role">Minds the roast</h3>
            <p className="person__text">Small batches, a few steps from the bar.</p>
          </article>
          <article className="person">
            <div className="person__media">
              <img
                src="/images/barista-tamping-espresso-grounds.avif"
                loading="lazy"
                sizes="(max-width: 1376px) 100vw, 1376px"
                srcSet="/images/barista-tamping-espresso-grounds-p-500.avif 500w, /images/barista-tamping-espresso-grounds-p-800.avif 800w, /images/barista-tamping-espresso-grounds-p-1080.avif 1080w, /images/barista-tamping-espresso-grounds.avif 1376w"
                alt="A barista tamping espresso at the copper machine"
                className="person__image person__image--machine"
              />
            </div>
            <h3 className="person__role">Works the copper machine</h3>
            <p className="person__text">Where most mornings here begin.</p>
          </article>
          <article className="person">
            <div className="person__media">
              <img
                src="/images/caterer-standing-in-cafe.avif"
                loading="lazy"
                sizes="(max-width: 1376px) 100vw, 1376px"
                srcSet="/images/caterer-standing-in-cafe-p-500.avif 500w, /images/caterer-standing-in-cafe-p-800.avif 800w, /images/caterer-standing-in-cafe-p-1080.avif 1080w, /images/caterer-standing-in-cafe.avif 1376w"
                alt="The catering lead in a Hearth & Bean apron"
                className="person__image"
              />
            </div>
            <h3 className="person__role">Feeds the party</h3>
            <p className="person__text">Takes our kitchen out to yours.</p>
          </article>
          <article className="person">
            <div className="person__media">
              <img
                src="/images/cafe-staff-member-standing-3.avif"
                loading="lazy"
                sizes="(max-width: 1376px) 100vw, 1376px"
                srcSet="/images/cafe-staff-member-standing-3-p-500.avif 500w, /images/cafe-staff-member-standing-3-p-800.avif 800w, /images/cafe-staff-member-standing-3-p-1080.avif 1080w, /images/cafe-staff-member-standing-3.avif 1376w"
                alt="A team member in a Hearth & Bean apron"
                className="person__image"
              />
            </div>
            <h3 className="person__role">Keeps the fire</h3>
            <p className="person__text">Bread at dawn, embers at close.</p>
          </article>
        </div>
      </div>
      <div className="container">
        <div className="people__foot">
          <button aria-label="Previous people" data-hb="people-prev" type="button" className="round-button">
            <svg
              aria-hidden="true"
              strokeWidth="1.6"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
              className="round-button__icon"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
          <button aria-label="More people" data-hb="people-next" type="button" className="round-button">
            <svg
              aria-hidden="true"
              strokeWidth="1.6"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
              className="round-button__icon"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <div aria-hidden="true" className="progress">
            <div data-hb="people-bar" className="progress__bar" />
          </div>
        </div>
      </div>
    </section>
  );
}
