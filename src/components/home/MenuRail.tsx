import { featuredDishes, homeGroups } from '@/data/menu';

/**
 * "On the menu" rail on the home page: the four group cards, each followed by its featured dishes,
 * then the end card. Dishes come from src/data/menu.ts (the ones with `home` set), in home order.
 */
export default function MenuRail() {
  const dishes = featuredDishes();
  return (
    <div data-hb="menu-rail" className="menu__rail">
      <div className="hb-list">
        <div role="list" className="hb-items">
          {homeGroups.map((g) => {
            const inGroup = dishes.filter((d) => d.home?.group === g.group);
            if (!inGroup.length) return null;
            return [
              <div key={g.group} data-group={g.group} className="menu__category" role="listitem">
                <h3 className="display menu__category-title">{g.title}</h3>
                <p className="menu__category-text">{g.text}</p>
              </div>,
              ...inGroup.map((d) => (
                <div key={d.name} data-group={g.group} role="listitem" className="menu__item hb-item">
                  <div className="menu__item-media">
                    <img src={d.image} loading="lazy" alt="" className="menu__item-image" />
                  </div>
                  <div className="menu__item-head">
                    <h4 className="menu__item-name">{d.name}</h4>
                    <div className="menu__item-price">{d.price}</div>
                  </div>
                  <p className="menu__item-text">{d.description}</p>
                </div>
              )),
            ];
          })}
        </div>
      </div>
      <div className="menu__end">
        <p className="menu__end-text">
          That is a taste of the menu. Every dish, with prices, is on its own page.
        </p>
        <a href="/menu" className="button button--ink hb-inline-block">
          <div className="button__label">View full menu</div>
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
        <a href="#reserve" className="text-link">
          Save a seat
        </a>
      </div>
    </div>
  );
}
