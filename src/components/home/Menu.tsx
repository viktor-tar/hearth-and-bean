import MenuRail from './MenuRail';

export default function Menu() {
  return (
    <section id="menu" data-sheet="1" data-nav="light" className="menu">
      <div data-hb="menu-stage" className="menu__stage">
        <div className="menu__head">
          <h2 className="display menu__title">On the menu</h2>
          <div
            data-hb="menu-cats"
            aria-label="Jump to a part of the menu"
            role="group"
            className="menu__cats"
          >
            <button data-go="0" type="button" className="menu__filter">
              Morning
            </button>
            <button data-go="1" type="button" className="menu__filter">
              To start
            </button>
            <button data-go="2" type="button" className="menu__filter">
              Mains
            </button>
            <button data-go="3" type="button" className="menu__filter">
              Puddings
            </button>
          </div>
        </div>
        <MenuRail />
        <div className="menu__foot">
          <div className="menu__hint">Swipe or scroll to see the whole menu</div>
          <div aria-hidden="true" className="progress">
            <div data-hb="menu-bar" className="progress__bar" />
          </div>
          <a href="/menu" className="menu__all hb-inline-block">
            <div className="menu__all-label">View full menu</div>
            <svg
              aria-hidden="true"
              strokeWidth="1.6"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
              className="menu__all-icon menu__all-icon"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
